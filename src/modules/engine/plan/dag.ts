import type { TaskDependencyDef, TaskTemplateDef } from "./types";

export class DependencyCycleError extends Error {
  constructor(message: string, public readonly cycleNodeIds: string[]) {
    super(message);
    this.name = "DependencyCycleError";
  }
}

/**
 * Validates that template tasks and dependencies form a Directed Acyclic Graph (DAG).
 * Returns the topologically sorted task list.
 * Throws DependencyCycleError if any cycle is detected.
 */
export function validateAndSortTaskTemplates(
  templates: TaskTemplateDef[],
  dependencies: TaskDependencyDef[],
): TaskTemplateDef[] {
  const templateMap = new Map<string, TaskTemplateDef>();
  for (const t of templates) {
    templateMap.set(t.id, t);
  }

  // inDegree: count of prerequisite dependencies a task has
  // adj: prereq -> list of tasks that depend on it
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const t of templates) {
    inDegree.set(t.id, 0);
    adj.set(t.id, []);
  }

  for (const dep of dependencies) {
    // Only consider dependencies where both tasks exist in the template list
    if (templateMap.has(dep.taskTemplateId) && templateMap.has(dep.dependsOnId)) {
      // dep.taskTemplateId depends on dep.dependsOnId
      inDegree.set(
        dep.taskTemplateId,
        (inDegree.get(dep.taskTemplateId) ?? 0) + 1,
      );
      adj.get(dep.dependsOnId)?.push(dep.taskTemplateId);
    }
  }

  // Kahn's algorithm: queue of tasks with inDegree === 0
  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(id);
    }
  }

  // Stable sort queue initially by intakeOrder then key
  queue.sort((a, b) => {
    const tA = templateMap.get(a)!;
    const tB = templateMap.get(b)!;
    return (tA.intakeOrder ?? 0) - (tB.intakeOrder ?? 0) || tA.key.localeCompare(tB.key);
  });

  const sorted: TaskTemplateDef[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    sorted.push(templateMap.get(currentId)!);

    const dependents = adj.get(currentId) ?? [];
    for (const dependentId of dependents) {
      const newDeg = (inDegree.get(dependentId) ?? 0) - 1;
      inDegree.set(dependentId, newDeg);
      if (newDeg === 0) {
        queue.push(dependentId);
        // Keep order predictable
        queue.sort((a, b) => {
          const tA = templateMap.get(a)!;
          const tB = templateMap.get(b)!;
          return (tA.intakeOrder ?? 0) - (tB.intakeOrder ?? 0) || tA.key.localeCompare(tB.key);
        });
      }
    }
  }

  if (sorted.length !== templates.length) {
    const cycleIds = Array.from(inDegree.entries())
      .filter(([, deg]) => deg > 0)
      .map(([id]) => id);

    throw new DependencyCycleError(
      `Dependency cycle detected among task templates: ${cycleIds
        .map((id) => templateMap.get(id)?.key ?? id)
        .join(" -> ")}`,
      cycleIds,
    );
  }

  return sorted;
}
