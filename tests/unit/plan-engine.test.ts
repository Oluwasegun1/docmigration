import { describe, expect, it } from "vitest";
import {
  DependencyCycleError,
  validateAndSortTaskTemplates,
} from "@/modules/engine/plan/dag";
import { calculatePlanProgress } from "@/modules/engine/plan/progress";
import {
  computePlanReadiness,
  initializePlanTasksFromTemplates,
  mapIntakeChoiceToTaskStatus,
} from "@/modules/engine/plan/readiness";
import { buildPlanSummary } from "@/modules/engine/plan/summary-builder";
import type {
  IntakeAnswerChoice,
  PlanTaskModel,
  TaskDependencyDef,
  TaskTemplateDef,
} from "@/modules/engine/plan/types";
import {
  applyVersionUpdate,
  computeVersionDiff,
} from "@/modules/engine/plan/versioning";
import type { AssessmentEvaluation } from "@/modules/engine/rules/types";

describe("Plan Engine - DAG Cycle Rejection & Topological Sorting", () => {
  const templates: TaskTemplateDef[] = [
    {
      id: "tmpl-origin-docs",
      key: "origin_credentials",
      category: "origin_country",
      titleKey: "tasks.origin_credentials.title",
      bodyKey: "tasks.origin_credentials.body",
      intakeOrder: 1,
      askAtIntake: true,
      isIrreversiblePayment: false,
      sourceId: "src-1",
    },
    {
      id: "tmpl-primary-verification",
      key: "primary_source_verification",
      category: "origin_country",
      titleKey: "tasks.psv.title",
      bodyKey: "tasks.psv.body",
      intakeOrder: 2,
      askAtIntake: true,
      isIrreversiblePayment: true,
      sourceId: "src-1",
    },
    {
      id: "tmpl-reg-exam",
      key: "licensing_exam",
      category: "exams",
      titleKey: "tasks.exam.title",
      bodyKey: "tasks.exam.body",
      intakeOrder: 3,
      askAtIntake: true,
      isIrreversiblePayment: true,
      sourceId: "src-1",
    },
  ];

  it("sorts linear dependencies in topological order", () => {
    const dependencies: TaskDependencyDef[] = [
      // primary_verification depends on origin_docs
      { taskTemplateId: "tmpl-primary-verification", dependsOnId: "tmpl-origin-docs" },
      // reg_exam depends on primary_verification
      { taskTemplateId: "tmpl-reg-exam", dependsOnId: "tmpl-primary-verification" },
    ];

    const sorted = validateAndSortTaskTemplates(templates, dependencies);
    expect(sorted.map((t) => t.id)).toEqual([
      "tmpl-origin-docs",
      "tmpl-primary-verification",
      "tmpl-reg-exam",
    ]);
  });

  it("rejects publishing a template with a dependency cycle", () => {
    const cyclicDependencies: TaskDependencyDef[] = [
      { taskTemplateId: "tmpl-primary-verification", dependsOnId: "tmpl-origin-docs" },
      { taskTemplateId: "tmpl-reg-exam", dependsOnId: "tmpl-primary-verification" },
      // Cycle: origin_docs depends back on reg_exam
      { taskTemplateId: "tmpl-origin-docs", dependsOnId: "tmpl-reg-exam" },
    ];

    expect(() =>
      validateAndSortTaskTemplates(templates, cyclicDependencies),
    ).toThrow(DependencyCycleError);
  });
});

describe("Plan Engine - Intake Mapping & Hard Rules", () => {
  const choices: IntakeAnswerChoice[] = [
    "done",
    "in_progress",
    "waiting_on_external_party",
    "not_started",
    "not_applicable",
    "not_sure",
  ];

  it("maps every intake answer choice strictly according to section 3.2", () => {
    for (const choice of choices) {
      const mapped = mapIntakeChoiceToTaskStatus(choice);

      if (choice === "done") {
        expect(mapped.status).toBe("done");
        expect(mapped.verificationType).toBe("user_reported");
        expect(mapped.needsConfirmation).toBe(false);
      } else if (choice === "in_progress") {
        expect(mapped.status).toBe("in_progress");
        expect(mapped.needsConfirmation).toBe(false);
      } else if (choice === "waiting_on_external_party") {
        expect(mapped.status).toBe("waiting_on_external_party");
        expect(mapped.needsConfirmation).toBe(false);
      } else if (choice === "not_applicable") {
        expect(mapped.status).toBe("not_applicable");
        expect(mapped.needsConfirmation).toBe(false);
      } else if (choice === "not_sure") {
        // "Not sure" stays not_started with needsConfirmation = true. NEVER treated as done.
        expect(mapped.status).toBe("not_started");
        expect(mapped.needsConfirmation).toBe(true);
      } else if (choice === "not_started") {
        expect(mapped.status).toBe("not_started");
        expect(mapped.needsConfirmation).toBe(false);
      }
    }
  });

  it("ensures user-reported done NEVER becomes an externally confirmed milestone", () => {
    const mapped = mapIntakeChoiceToTaskStatus("done");
    expect(mapped.verificationType).not.toBe("regulator_confirmed");
    expect(mapped.verificationType).toBe("user_reported");
  });

  it("initializes plan tasks from templates applying intake answers correctly", () => {
    const tmpls: TaskTemplateDef[] = [
      {
        id: "tmpl-a",
        key: "task_a",
        category: "origin_country",
        titleKey: "tasks.a",
        bodyKey: "body.a",
        intakeOrder: 1,
        askAtIntake: true,
        isIrreversiblePayment: false,
        sourceId: "src-1",
      },
    ];

    const tasks = initializePlanTasksFromTemplates(
      "plan-123",
      tmpls,
      [{ taskTemplateId: "tmpl-a", answer: "done", completedMonth: "2026-05" }],
      (key) => `Resolved ${key}`,
    );

    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe("Resolved tasks.a");
    expect(tasks[0].status).toBe("done");
    expect(tasks[0].completedMonth).toBe("2026-05");
    expect(tasks[0].verificationType).toBe("user_reported");
  });
});

describe("Plan Engine - Readiness, Blockers & Out-of-Order Answers", () => {
  const baseTasks: PlanTaskModel[] = [
    {
      id: "t1",
      planId: "p1",
      originTemplateTaskId: "tmpl-1",
      templateKey: "step_1",
      title: "Step 1: Origin records",
      category: "origin_country",
      status: "not_started",
      verificationType: "user_reported",
      userEdited: false,
      reviewNeeded: false,
      needsConfirmation: false,
      sortOrder: 0,
      isIrreversiblePayment: false,
    },
    {
      id: "t2",
      planId: "p1",
      originTemplateTaskId: "tmpl-2",
      templateKey: "step_2",
      title: "Step 2: Verification",
      category: "origin_country",
      status: "not_started",
      verificationType: "user_reported",
      userEdited: false,
      reviewNeeded: false,
      needsConfirmation: false,
      sortOrder: 1,
      isIrreversiblePayment: true,
    },
    {
      id: "t3",
      planId: "p1",
      originTemplateTaskId: "tmpl-3",
      templateKey: "step_3",
      title: "Step 3: Registration application",
      category: "registration",
      status: "not_started",
      verificationType: "user_reported",
      userEdited: false,
      reviewNeeded: false,
      needsConfirmation: false,
      sortOrder: 2,
      isIrreversiblePayment: true,
    },
  ];

  const dependencies: TaskDependencyDef[] = [
    { taskTemplateId: "tmpl-2", dependsOnId: "tmpl-1" },
    { taskTemplateId: "tmpl-3", dependsOnId: "tmpl-2" },
  ];

  it("marks initial step as ready and downstream steps as blocked naming their blockers", () => {
    const computed = computePlanReadiness(baseTasks, dependencies);

    expect(computed[0].status).toBe("not_started");
    expect(computed[0].blockedBy).toBeNull(); // ready

    expect(computed[1].status).toBe("not_started");
    expect(computed[1].blockedBy).toContain("Step 1: Origin records"); // blocked

    expect(computed[2].status).toBe("not_started");
    expect(computed[2].blockedBy).toContain("Step 2: Verification"); // blocked
  });

  it("allows out-of-order completion and attaches a hint without resetting work", () => {
    // User marks Step 2 as done while Step 1 is not_started
    const tasksWithOutOfOrder: PlanTaskModel[] = [
      { ...baseTasks[0], status: "not_started" },
      { ...baseTasks[1], status: "done" },
      { ...baseTasks[2], status: "not_started" },
    ];

    const computed = computePlanReadiness(tasksWithOutOfOrder, dependencies);

    // Step 2 stays done and gains hint
    expect(computed[1].status).toBe("done");
    expect(computed[1].outOfOrderHint).toContain("Usually comes after Step 1: Origin records");

    // Step 3 is now unblocked because Step 2 is done!
    expect(computed[2].blockedBy).toBeNull();
  });
});

describe("Plan Engine - Progress Calculation", () => {
  it("displays completed applicable tasks next to externally confirmed milestones", () => {
    const tasks: PlanTaskModel[] = [
      {
        id: "t1",
        planId: "p1",
        templateKey: "step_1",
        title: "Step 1",
        category: "origin_country",
        status: "done",
        verificationType: "user_reported",
        userEdited: false,
        reviewNeeded: false,
        needsConfirmation: false,
        sortOrder: 0,
        isIrreversiblePayment: false,
      },
      {
        id: "t2",
        planId: "p1",
        templateKey: "step_2",
        title: "Step 2",
        category: "exams",
        status: "not_applicable", // omitted from applicable total
        verificationType: "user_reported",
        userEdited: false,
        reviewNeeded: false,
        needsConfirmation: false,
        sortOrder: 1,
        isIrreversiblePayment: false,
      },
      {
        id: "t3",
        planId: "p1",
        templateKey: "step_3",
        title: "Step 3",
        category: "registration",
        status: "in_progress",
        verificationType: "user_reported",
        userEdited: false,
        reviewNeeded: false,
        needsConfirmation: false,
        sortOrder: 2,
        isIrreversiblePayment: false,
      },
      {
        id: "t4",
        planId: "p1",
        templateKey: "step_4",
        title: "Step 4",
        category: "registration",
        status: "not_started",
        verificationType: "user_reported",
        userEdited: false,
        reviewNeeded: false,
        needsConfirmation: false,
        sortOrder: 3,
        isIrreversiblePayment: false,
      },
    ];

    const progress = calculatePlanProgress(tasks);

    // Total applicable: 3 (t1, t3, t4)
    expect(progress.applicableTotal).toBe(3);
    // User reported done: 1 (t1)
    expect(progress.userReportedDone).toBe(1);
    // Externally confirmed: 0
    expect(progress.externallyConfirmedMilestones).toBe(0);
    // 1 / 3 = 33%
    expect(progress.percentComplete).toBe(33);

    expect(progress.reportLabel).toBe(
      "1 of 3 applicable tasks marked done (your report)",
    );
    expect(progress.confirmedLabel).toBe("0 externally confirmed milestones");
  });
});

describe("Plan Engine - Version Pinning & Updates", () => {
  const currentTasks: PlanTaskModel[] = [
    {
      id: "t1",
      planId: "p1",
      originTemplateTaskId: "tmpl-1",
      templateKey: "step_1",
      title: "Origin Records",
      category: "origin_country",
      status: "done",
      verificationType: "user_reported",
      userEdited: false,
      reviewNeeded: false,
      needsConfirmation: false,
      sortOrder: 0,
      isIrreversiblePayment: false,
      note: "Sent application to school registrar",
    },
    {
      id: "t2",
      planId: "p1",
      originTemplateTaskId: "tmpl-2",
      templateKey: "step_2",
      title: "Old Obsolete Exam",
      category: "exams",
      status: "done",
      verificationType: "user_reported",
      userEdited: false,
      reviewNeeded: false,
      needsConfirmation: false,
      sortOrder: 1,
      isIrreversiblePayment: true,
    },
  ];

  const targetTemplatesV2: TaskTemplateDef[] = [
    {
      id: "tmpl-1-v2",
      key: "step_1",
      category: "origin_country",
      titleKey: "tasks.origin_records.v2",
      bodyKey: "tasks.origin_records.body",
      intakeOrder: 1,
      askAtIntake: true,
      isIrreversiblePayment: true, // changed: now marked irreversible
      sourceId: "src-2",
    },
    {
      id: "tmpl-3-v2",
      key: "step_3_new",
      category: "exams",
      titleKey: "tasks.new_exam.title",
      bodyKey: "tasks.new_exam.body",
      intakeOrder: 2,
      askAtIntake: true,
      isIrreversiblePayment: true,
      sourceId: "src-2",
    },
  ];

  it("detects diffs and flags modified tasks with reviewNeeded", () => {
    const diff = computeVersionDiff(currentTasks, targetTemplatesV2);
    expect(diff.hasChanges).toBe(true);
    expect(diff.addedTemplates.map((t) => t.key)).toContain("step_3_new");
    expect(diff.removedTasks.map((t) => t.templateKey)).toContain("step_2");
    expect(diff.modifiedTasks.map((m) => m.task.templateKey)).toContain("step_1");

    const updated = applyVersionUpdate(currentTasks, targetTemplatesV2);

    // Step 1 was modified: reviewNeeded set to true, user note preserved!
    const step1 = updated.find((t) => t.templateKey === "step_1");
    expect(step1?.reviewNeeded).toBe(true);
    expect(step1?.note).toBe("Sent application to school registrar");
    expect(step1?.status).toBe("done");

    // Step 2 was removed in v2: because user completed it, it is kept as "No longer required by regulator"
    const step2 = updated.find((t) => t.templateKey === "step_2");
    expect(step2?.note).toContain("No longer required by regulator");

    // Step 3 was added: appended as not_started
    const step3 = updated.find((t) => t.templateKey === "step_3_new");
    expect(step3?.status).toBe("not_started");
  });
});

describe("Plan Engine - Summary Builder", () => {
  it("assembles complete 7-part Where You Are summary", () => {
    const assessment: AssessmentEvaluation = {
      outcome: "potential_match",
      outcomeLabel: "Potential match",
      criteriaResults: [],
      missingFields: ["specialtyField"],
      sourceIds: ["src-1"],
      assessedAt: "2026-10-17T00:00:00Z",
    };

    const tasks: PlanTaskModel[] = [
      {
        id: "t1",
        planId: "p1",
        templateKey: "step_1",
        title: "Step 1",
        category: "origin_country",
        status: "not_started",
        verificationType: "user_reported",
        userEdited: false,
        reviewNeeded: false,
        needsConfirmation: false,
        sortOrder: 0,
        isIrreversiblePayment: true, // money warning!
        sourceId: "src-1",
      },
      {
        id: "t2",
        planId: "p1",
        templateKey: "step_2",
        title: "Step 2",
        category: "exams",
        status: "not_started",
        verificationType: "user_reported",
        userEdited: false,
        reviewNeeded: false,
        needsConfirmation: true, // "Not sure" -> needs checking!
        sortOrder: 1,
        isIrreversiblePayment: false,
      },
    ];

    const summary = buildPlanSummary(
      {
        id: "pathway-1",
        slug: "uk-gmc-plab",
        name: "GMC PLAB Route",
        pinnedVersion: 1,
        lastVerifiedDate: "2026-10-01",
      },
      assessment,
      tasks,
      { "src-1": { url: "https://gmc-uk.org/registration", title: "GMC Registration" } },
      2, // 2 intake tasks skipped
    );

    // 1. Pathway meta & disclaimer
    expect(summary.pathway.name).toBe("GMC PLAB Route");
    expect(summary.pathway.disclaimer).toBe("Product guidance, not an official determination.");
    expect(summary.pathway.assessmentStatusLabel).toBe("Potential match");

    // 2. Progress
    expect(summary.progress.applicableTotal).toBe(2);

    // 3. Next up: ready tasks
    expect(summary.nextUp.length).toBe(2);
    expect(summary.nextUp[0].sourceUrl).toBe("https://gmc-uk.org/registration");

    // 5. Needs checking: includes not sure tasks + missing profile fields
    expect(summary.needsChecking.notSureTasks.map((t) => t.title)).toContain("Step 2");
    expect(summary.needsChecking.missingProfileFields).toContain("specialtyField");

    // 6. Money warning
    expect(summary.moneyWarning?.title).toBe("Step 1");
    expect(summary.moneyWarning?.warningMessage).toBe(
      "Confirm you meet the requirements before paying",
    );

    // 7. Not asked yet
    expect(summary.notAskedYet.count).toBe(2);
    expect(summary.notAskedYet.canContinue).toBe(true);
  });
});
