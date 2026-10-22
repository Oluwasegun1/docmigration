import { describe, expect, it } from "vitest";
import { evaluateCriteria } from "@/modules/engine/rules/evaluate";
import type { CriterionRule } from "@/modules/engine/rules/types";
import {
  initializePlanTasksFromTemplates,
  computePlanReadiness,
  mapIntakeChoiceToTaskStatus,
} from "@/modules/engine/plan/readiness";
import { buildPlanSummary } from "@/modules/engine/plan/summary-builder";
import type {
  TaskTemplateDef,
  TaskDependencyDef,
  PlanTaskModel,
} from "@/modules/engine/plan/types";
import {
  computeVersionDiff,
  applyVersionUpdate,
} from "@/modules/engine/plan/versioning";

describe("End-to-End Onboarding, Screening, Intake & Baseline Plan Flow", () => {
  // Step 1: Profile Facts Entry
  const userProfileFacts = {
    profession: "doctor",
    originCountry: "NG",
    trainedInCountry: "NG",
    pmq_country: "NG",
    internship_completed: true,
    internship_months: 6, // Mandatory requirement is 12 -> Potential blocker
    english_test_passed: true,
  };

  // Step 2: Deterministic Screening Evaluation
  const pathwayCriteria: CriterionRule[] = [
    {
      id: "crit-pmq",
      key: "pmq_recognition",
      profileField: "pmq_country",
      operator: "equals",
      expected: "NG",
      mandatory: true,
      sourceId: "src-gmc",
      explanationKey: "criteria.pmq.explanation",
      verifiedAt: "2026-10-17T00:00:00.000Z",
      isPlaceholder: false,
    },
    {
      id: "crit-internship",
      key: "internship_duration",
      profileField: "internship_months",
      operator: "gte",
      expected: 12,
      mandatory: true,
      sourceId: "src-gmc",
      explanationKey: "criteria.internship.explanation",
      verifiedAt: "2026-10-17T00:00:00.000Z",
      isPlaceholder: false,
    },
    {
      id: "crit-english",
      key: "english_language_competence",
      profileField: "english_test_passed",
      operator: "equals",
      expected: true,
      mandatory: false,
      sourceId: "src-gmc",
      explanationKey: "criteria.english.explanation",
      verifiedAt: "2026-10-17T00:00:00.000Z",
      isPlaceholder: false,
    },
  ];

  it("Step 1 & 2: Screens user profile facts deterministically against official criteria", () => {
    const evaluation = evaluateCriteria(pathwayCriteria, userProfileFacts);

    // Mandatory criterion not met -> Potential blocker
    expect(evaluation.outcome).toBe("potential_blocker");
    expect(evaluation.outcomeLabel).toBe("Potential blocker");
    expect(evaluation.criteriaResults.find((c) => c.key === "pmq_recognition")?.status).toBe("met");
    expect(evaluation.criteriaResults.find((c) => c.key === "internship_duration")?.status).toBe("not_met");
    expect(
      evaluation.criteriaResults.find((c) => c.key === "english_language_competence")?.status,
    ).toBe("met");
  });

  // Step 3: Pathway Selection & Plan Generation
  const templates: TaskTemplateDef[] = [
    {
      id: "t-epic",
      key: "epic_account_setup",
      category: "verification",
      titleKey: "tasks.epic.title",
      bodyKey: "tasks.epic.body",
      intakeOrder: 1,
      askAtIntake: true,
      isIrreversiblePayment: true,
      sourceId: "src-gmc",
    },
    {
      id: "t-pmq-verify",
      key: "pmq_verification",
      category: "verification",
      titleKey: "tasks.pmq_verify.title",
      bodyKey: "tasks.pmq_verify.body",
      intakeOrder: 2,
      askAtIntake: true,
      isIrreversiblePayment: false,
      sourceId: "src-gmc",
    },
    {
      id: "t-plab1",
      key: "plab1_exam",
      category: "examination",
      titleKey: "tasks.plab1.title",
      bodyKey: "tasks.plab1.body",
      intakeOrder: 3,
      askAtIntake: true,
      isIrreversiblePayment: true,
      sourceId: "src-gmc",
    },
  ];

  const dependencies: TaskDependencyDef[] = [
    { taskTemplateId: "t-pmq-verify", dependsOnId: "t-epic" },
    { taskTemplateId: "t-plab1", dependsOnId: "t-pmq-verify" },
  ];

  it("Step 3 & 4: Generates baseline plan tasks and resolves DAG readiness", () => {
    const planId = "plan-user-1";
    const initialTasks = initializePlanTasksFromTemplates(planId, templates);
    const readyTasks = computePlanReadiness(initialTasks, dependencies);

    // t-epic has no dependencies -> not blocked
    const epicTask = readyTasks.find((t) => t.originTemplateTaskId === "t-epic");
    expect(epicTask?.status).toBe("not_started");
    expect(epicTask?.blockedBy).toBeNull();

    // t-pmq-verify depends on t-epic -> blocked
    const pmqTask = readyTasks.find((t) => t.originTemplateTaskId === "t-pmq-verify");
    expect(pmqTask?.blockedBy).toContain("tasks.epic.title");

    // t-plab1 depends on t-pmq-verify -> blocked
    const plab1Task = readyTasks.find((t) => t.originTemplateTaskId === "t-plab1");
    expect(plab1Task?.blockedBy).toContain("tasks.pmq_verify.title");
  });

  it("Step 4 & 5: Progress Intake answers update tasks and unblock downstream dependencies", () => {
    const planId = "plan-user-1";
    let tasks = initializePlanTasksFromTemplates(planId, templates);

    // User reports completing epic_account_setup
    const epicChoice = mapIntakeChoiceToTaskStatus("done");
    tasks = tasks.map((t) =>
      t.originTemplateTaskId === "t-epic"
        ? {
            ...t,
            status: epicChoice.status,
            verificationType: epicChoice.verificationType,
            needsConfirmation: epicChoice.needsConfirmation,
          }
        : t,
    );

    // User reports being 'not_sure' on pmq_verification
    const pmqChoice = mapIntakeChoiceToTaskStatus("not_sure");
    tasks = tasks.map((t) =>
      t.originTemplateTaskId === "t-pmq-verify"
        ? {
            ...t,
            status: pmqChoice.status,
            verificationType: pmqChoice.verificationType,
            needsConfirmation: pmqChoice.needsConfirmation,
          }
        : t,
    );

    const recomputed = computePlanReadiness(tasks, dependencies);

    // t-pmq-verify is no longer blocked because t-epic is done
    const pmq = recomputed.find((t) => t.originTemplateTaskId === "t-pmq-verify");
    expect(pmq?.blockedBy).toBeNull();
    expect(pmq?.needsConfirmation).toBe(true);

    // Build "Where you are" 7-part summary
    const evaluation = evaluateCriteria(pathwayCriteria, userProfileFacts);
    const summary = buildPlanSummary(
      {
        id: "pw-1",
        slug: "gmc-plab",
        name: "GMC PLAB Route",
        pinnedVersion: 1,
        lastVerifiedDate: "2026-10-17",
      },
      evaluation,
      recomputed,
      { "src-gmc": { url: "https://gmc-uk.org", title: "GMC Guidance" } },
      0,
    );

    // Section 1: Meta & disclaimer
    expect(summary.pathway.name).toBe("GMC PLAB Route");
    expect(summary.pathway.disclaimer).toContain("Product guidance, not an official determination.");

    // Section 2: Progress (side-by-side, user reported vs confirmed)
    expect(summary.progress.userReportedDone).toBe(1);
    expect(summary.progress.externallyConfirmedMilestones).toBe(0); // Not verified by third party
    expect(summary.progress.reportLabel).toContain("1 of 3 applicable tasks marked done");

    // Section 3: Next up (unblocked ready tasks)
    expect(summary.nextUp.length).toBeGreaterThanOrEqual(1);

    // Section 5: Needs checking (has the not_sure task)
    expect(summary.needsChecking.notSureTasks.length).toBe(1);
    expect(summary.needsChecking.notSureTasks[0].title).toBe("tasks.pmq_verify.title");

    // Section 6: Money warning
    expect(summary.moneyWarning?.title).toBe("tasks.plab1.title");
  });

  it("Step 6: Version updates calculate diff and update tasks cleanly", () => {
    const existingTasks: PlanTaskModel[] = [
      {
        id: "pt-1",
        planId: "plan-1",
        originTemplateTaskId: "t-epic",
        templateKey: "epic_account_setup",
        title: "tasks.epic.title",
        category: "verification",
        status: "done",
        verificationType: "user_reported",
        userEdited: false,
        reviewNeeded: false,
        needsConfirmation: false,
        sortOrder: 0,
        isIrreversiblePayment: true,
      },
      {
        id: "pt-2",
        planId: "plan-1",
        originTemplateTaskId: "t-old-deprecated",
        templateKey: "old_rule_task",
        title: "tasks.old.title",
        category: "examination",
        status: "done",
        verificationType: "user_reported",
        userEdited: false,
        reviewNeeded: false,
        needsConfirmation: false,
        sortOrder: 1,
        isIrreversiblePayment: false,
      },
    ];

    const v2Templates: TaskTemplateDef[] = [
      {
        id: "t-epic-v2",
        key: "epic_account_setup",
        category: "licensing", // category changed -> modified
        titleKey: "tasks.epic.v2.title",
        bodyKey: "tasks.epic.v2.body",
        intakeOrder: 1,
        askAtIntake: true,
        isIrreversiblePayment: true,
        sourceId: "src-1",
      },
      {
        id: "t-mla-new",
        key: "mla_exam",
        category: "examination",
        titleKey: "tasks.mla.title",
        bodyKey: "tasks.mla.body",
        intakeOrder: 2,
        askAtIntake: true,
        isIrreversiblePayment: true,
        sourceId: "src-1",
      },
    ];

    const diff = computeVersionDiff(existingTasks, v2Templates);
    expect(diff.modifiedTasks.length).toBe(1);
    expect(diff.addedTemplates.length).toBe(1);
    expect(diff.removedTasks.length).toBe(1);

    const updatedTasks = applyVersionUpdate(existingTasks, v2Templates);
    const epicUpdated = updatedTasks.find((t) => t.templateKey === "epic_account_setup");
    expect(epicUpdated?.reviewNeeded).toBe(true);

    const oldRetained = updatedTasks.find((t) => t.templateKey === "old_rule_task");
    expect(oldRetained?.note).toContain("No longer required by regulator");
  });
});
