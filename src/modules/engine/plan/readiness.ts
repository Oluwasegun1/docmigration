import type {
  IntakeAnswerChoice,
  IntakeAnswerInput,
  PlanTaskModel,
  PlanTaskStatus,
  TaskDependencyDef,
  TaskTemplateDef,
} from "./types";

/**
 * Pure mapping from user intake answer choice to PlanTask fields.
 */
export function mapIntakeChoiceToTaskStatus(
  choice: IntakeAnswerChoice,
  existingTask?: Partial<PlanTaskModel>,
): {
  status: PlanTaskStatus;
  needsConfirmation: boolean;
  verificationType: "user_reported";
} {
  switch (choice) {
    case "done":
      return {
        status: "done",
        needsConfirmation: false,
        verificationType: "user_reported",
      };
    case "in_progress":
      return {
        status: "in_progress",
        needsConfirmation: false,
        verificationType: "user_reported",
      };
    case "waiting_on_external_party":
      return {
        status: "waiting_on_external_party",
        needsConfirmation: false,
        verificationType: "user_reported",
      };
    case "not_applicable":
      return {
        status: "not_applicable",
        needsConfirmation: false,
        verificationType: "user_reported",
      };
    case "not_sure":
      // "Not sure" stays not_started with needsConfirmation = true. Never treated as done.
      return {
        status: "not_started",
        needsConfirmation: true,
        verificationType: "user_reported",
      };
    case "not_started":
    default:
      return {
        status: "not_started",
        needsConfirmation: existingTask?.needsConfirmation ?? false,
        verificationType: "user_reported",
      };
  }
}

/**
 * Derives task readiness and blockers across the dependency graph.
 *
 * Rules:
 * 1. A task is ready only when status is "not_started" and all predecessors are "done" or "not_applicable".
 * 2. A blocked task has status "not_started" and at least one predecessor not "done" / "not_applicable".
 * 3. Out-of-order completed tasks are accepted, with a quiet hint: "Usually comes after [Blocker]. Check that this is right."
 */
export function computePlanReadiness(
  tasks: PlanTaskModel[],
  dependencies: TaskDependencyDef[],
): PlanTaskModel[] {
  // Map templateId or id to task
  const taskByTemplateId = new Map<string, PlanTaskModel>();
  for (const t of tasks) {
    if (t.originTemplateTaskId) {
      taskByTemplateId.set(t.originTemplateTaskId, t);
    }
    taskByTemplateId.set(t.id, t);
  }

  // Pre-calculate direct prerequisites for each task: taskTemplateId -> [prereqTemplateIds]
  const prereqsByTask = new Map<string, string[]>();
  for (const t of tasks) {
    const key = t.originTemplateTaskId ?? t.id;
    prereqsByTask.set(key, []);
  }

  for (const dep of dependencies) {
    if (prereqsByTask.has(dep.taskTemplateId)) {
      prereqsByTask.get(dep.taskTemplateId)!.push(dep.dependsOnId);
    }
  }

  return tasks.map((task) => {
    const key = task.originTemplateTaskId ?? task.id;
    const prereqIds = prereqsByTask.get(key) ?? [];

    const blockers: string[] = [];
    let outOfOrderHint: string | null = null;

    for (const prereqId of prereqIds) {
      const prereq = taskByTemplateId.get(prereqId);
      if (!prereq) continue;

      const isPrereqSatisfied =
        prereq.status === "done" || prereq.status === "not_applicable";

      if (!isPrereqSatisfied) {
        blockers.push(prereq.title);
      }
    }

    if (task.status === "done" && blockers.length > 0) {
      outOfOrderHint = `Usually comes after ${blockers.join(", ")}. Check that this is right.`;
    }

    return {
      ...task,
      blockedBy: blockers.length > 0 ? blockers : null,
      outOfOrderHint,
    };
  });
}

/**
 * Initializes a PlanTask list from task templates and applies intake answers.
 */
export function initializePlanTasksFromTemplates(
  planId: string,
  templates: TaskTemplateDef[],
  answers: IntakeAnswerInput[] = [],
  titleResolver: (key: string) => string = (key) => key,
): PlanTaskModel[] {
  const answerMap = new Map<string, IntakeAnswerInput>();
  for (const a of answers) {
    answerMap.set(a.taskTemplateId, a);
  }

  return templates.map((tmpl, index) => {
    const answer = answerMap.get(tmpl.id);
    const mapped = answer
      ? mapIntakeChoiceToTaskStatus(answer.answer)
      : {
          status: "not_started" as PlanTaskStatus,
          needsConfirmation: false,
          verificationType: "user_reported" as const,
        };

    return {
      id: `task-${tmpl.id}`,
      planId,
      originTemplateTaskId: tmpl.id,
      templateKey: tmpl.key,
      title: titleResolver(tmpl.titleKey),
      category: tmpl.category,
      status: mapped.status,
      verificationType: mapped.verificationType,
      userEdited: false,
      reviewNeeded: false,
      needsConfirmation: mapped.needsConfirmation,
      completedMonth: answer?.completedMonth ?? null,
      note: answer?.note ?? null,
      notApplicableReason: answer?.notApplicableReason ?? null,
      waitingOnText: answer?.waitingOnText ?? null,
      blockedBy: null,
      sortOrder: index,
      isIrreversiblePayment: tmpl.isIrreversiblePayment,
      sourceId: tmpl.sourceId,
    };
  });
}
