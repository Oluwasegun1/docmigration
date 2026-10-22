import type { PlanTaskModel, TaskTemplateDef } from "./types";

export interface VersionDiff {
  hasChanges: boolean;
  addedTemplates: TaskTemplateDef[];
  removedTasks: PlanTaskModel[];
  modifiedTasks: Array<{ task: PlanTaskModel; template: TaskTemplateDef }>;
}

/**
 * Pure diff calculator comparing existing plan tasks against a target version's templates.
 */
export function computeVersionDiff(
  currentTasks: PlanTaskModel[],
  targetTemplates: TaskTemplateDef[],
): VersionDiff {
  const targetTemplateByKey = new Map<string, TaskTemplateDef>();
  for (const tmpl of targetTemplates) {
    targetTemplateByKey.set(tmpl.key, tmpl);
  }

  const currentTaskByKey = new Map<string, PlanTaskModel>();
  for (const task of currentTasks) {
    currentTaskByKey.set(task.templateKey, task);
  }

  const addedTemplates: TaskTemplateDef[] = [];
  for (const tmpl of targetTemplates) {
    if (!currentTaskByKey.has(tmpl.key)) {
      addedTemplates.push(tmpl);
    }
  }

  const removedTasks: PlanTaskModel[] = [];
  const modifiedTasks: Array<{ task: PlanTaskModel; template: TaskTemplateDef }> = [];

  for (const task of currentTasks) {
    const target = targetTemplateByKey.get(task.templateKey);
    if (!target) {
      removedTasks.push(task);
    } else {
      // Check if template definition changed
      const categoryChanged = task.category !== target.category;
      const irreversibleChanged = task.isIrreversiblePayment !== target.isIrreversiblePayment;

      if (categoryChanged || irreversibleChanged) {
        modifiedTasks.push({ task, template: target });
      }
    }
  }

  const hasChanges =
    addedTemplates.length > 0 ||
    removedTasks.length > 0 ||
    modifiedTasks.length > 0;

  return {
    hasChanges,
    addedTemplates,
    removedTasks,
    modifiedTasks,
  };
}

/**
 * Applies an accepted version update to plan tasks.
 *
 * Guarantees:
 * - User work is never lost, rewritten, or silently completed.
 * - Completed tasks that are removed in new version are kept as "No longer required by regulator".
 * - Modified tasks gain reviewNeeded = true.
 * - New tasks are appended as not_started.
 */
export function applyVersionUpdate(
  currentTasks: PlanTaskModel[],
  targetTemplates: TaskTemplateDef[],
  titleResolver: (key: string) => string = (key) => key,
): PlanTaskModel[] {
  const diff = computeVersionDiff(currentTasks, targetTemplates);
  const targetMap = new Map(targetTemplates.map((t) => [t.key, t]));

  const updatedTasks: PlanTaskModel[] = [];

  for (const task of currentTasks) {
    const target = targetMap.get(task.templateKey);
    if (!target) {
      // Removed task: if user completed it, preserve it with "No longer required by regulator"
      if (task.status === "done") {
        updatedTasks.push({
          ...task,
          note: task.note
            ? `${task.note} (No longer required by regulator)`
            : "No longer required by regulator",
        });
      }
      // If not completed and removed, it is omitted from active plan
    } else {
      const isModified = diff.modifiedTasks.some((m) => m.task.id === task.id);
      updatedTasks.push({
        ...task,
        originTemplateTaskId: target.id,
        category: target.category,
        isIrreversiblePayment: target.isIrreversiblePayment,
        sourceId: target.sourceId,
        reviewNeeded: isModified ? true : task.reviewNeeded,
      });
    }
  }

  // Add new tasks
  for (const tmpl of diff.addedTemplates) {
    updatedTasks.push({
      id: `task-${tmpl.id}`,
      planId: currentTasks[0]?.planId ?? "",
      originTemplateTaskId: tmpl.id,
      templateKey: tmpl.key,
      title: titleResolver(tmpl.titleKey),
      category: tmpl.category,
      status: "not_started",
      verificationType: "user_reported",
      userEdited: false,
      reviewNeeded: false,
      needsConfirmation: false,
      completedMonth: null,
      dueDate: null,
      note: null,
      notApplicableReason: null,
      waitingOnText: null,
      blockedBy: null,
      sortOrder: updatedTasks.length,
      isIrreversiblePayment: tmpl.isIrreversiblePayment,
      sourceId: tmpl.sourceId,
    });
  }

  return updatedTasks;
}
