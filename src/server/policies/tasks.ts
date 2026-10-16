import type { TaskRow } from "@/types/db";

export interface CompletionDecision {
  allowed: boolean;
  reason?: "already_completed" | "dependencies_incomplete";
  waitingFor?: string[];
}

/**
 * Completion rules (deterministic). A task can be marked done only if it is
 * not already done and every task it depends on is completed. Opening or
 * viewing a task never completes it; completion is an explicit user action.
 * The database trigger enforces the same dependency rule.
 */
export function canCompleteTask(
  task: Pick<TaskRow, "status">,
  dependencies: { title: string; status: string }[],
): CompletionDecision {
  if (task.status === "completed") {
    return { allowed: false, reason: "already_completed" };
  }
  const waitingFor = dependencies
    .filter((d) => d.status !== "completed")
    .map((d) => d.title);
  if (waitingFor.length > 0) {
    return { allowed: false, reason: "dependencies_incomplete", waitingFor };
  }
  return { allowed: true };
}
