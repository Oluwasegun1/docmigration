import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";
import { canCompleteTask } from "@/server/policies/tasks";
import {
  fetchDependencyStatuses,
  fetchTaskForUser,
  markTaskCompleted,
} from "@/server/repositories/dashboard";

/** Marks a task completed for the signed-in user, after policy checks. */
export async function completeTask(
  db: SupabaseClient,
  userId: string,
  taskId: string,
) {
  const task = await fetchTaskForUser(db, userId, taskId);
  // Same error for "missing" and "not yours": do not reveal other users' tasks.
  if (!task) throw new AppError("not_found", "Task not found.");

  const decision = canCompleteTask(
    task,
    await fetchDependencyStatuses(db, taskId),
  );
  if (!decision.allowed) {
    if (decision.reason === "already_completed") return;
    throw new AppError(
      "conflict",
      `Finish these first: ${decision.waitingFor?.join(", ")}.`,
    );
  }

  const updated = await markTaskCompleted(db, userId, taskId);
  if (!updated) throw new AppError("not_found", "Task not found.");
}
