"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { getSession } from "@/lib/auth/session";
import { completeTask } from "@/server/services/tasks";

export type CompleteTaskResult = { ok: true } | { ok: false; message: string };

const TaskIdSchema = z.uuid();

export async function completeTaskAction(
  taskId: string,
): Promise<CompleteTaskResult> {
  const parsed = TaskIdSchema.safeParse(taskId);
  if (!parsed.success)
    return { ok: false, message: "That task could not be found." };

  const session = await getSession();
  if (session.status !== "authenticated") {
    return { ok: false, message: "Please sign in again to update your tasks." };
  }

  try {
    await completeTask(session.supabase, session.user.id, parsed.data);
  } catch (err) {
    if (err instanceof AppError) return { ok: false, message: err.message };
    console.error(
      "completeTask failed",
      err instanceof Error ? err.name : "unknown",
    );
    return { ok: false, message: "We couldn't save that. Please try again." };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}
