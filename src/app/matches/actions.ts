"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/require-user";
import { profileAnswersService, planService } from "@/lib/api/services";
import { loadMatchesForUser } from "@/lib/matches/load";

export async function checkAgainAction(): Promise<{
  success: boolean;
  message: string;
  changed: boolean;
}> {
  const { user } = await requireUser();
  if (!user) {
    return {
      success: false,
      message: "Please sign in to re-evaluate matches.",
      changed: false,
    };
  }

  try {
    const res = await loadMatchesForUser(user.id, { forceRecheck: true });
    revalidatePath("/matches");

    if (res.changeSummary) {
      return {
        success: true,
        message: res.changeSummary,
        changed: res.isNewRun,
      };
    }

    return {
      success: true,
      message: "Evaluation refreshed.",
      changed: res.isNewRun,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Failed to check again.",
      changed: false,
    };
  }
}

export async function addAnswerAction(
  fieldKey: string,
  value: unknown
): Promise<{ success: boolean; message: string }> {
  const { user } = await requireUser();
  if (!user) {
    return { success: false, message: "Please sign in to update your answer." };
  }

  try {
    await profileAnswersService.saveAnswers(user.id, {
      [fieldKey]: value,
    });

    revalidatePath("/matches");
    return { success: true, message: "Answer saved and matches refreshed." };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to save answer." };
  }
}

export async function startPlanAction(pathwayVersionId: string): Promise<{
  success: boolean;
  planId?: string;
  message?: string;
}> {
  const { user } = await requireUser();
  if (!user) {
    return { success: false, message: "Please sign in to start a plan." };
  }

  try {
    const plan = await planService.createPlan(user.id, pathwayVersionId);
    return { success: true, planId: plan.id };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || "Could not start plan from this pathway.",
    };
  }
}
