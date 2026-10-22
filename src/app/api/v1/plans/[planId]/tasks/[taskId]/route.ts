import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { planService } from "@/lib/api/services";
import type { TaskUpdatePatch } from "@/modules/plan/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ planId: string; taskId: string }> },
) {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { planId, taskId } = await props.params;

  try {
    const body = (await request.json()) as TaskUpdatePatch;
    await planService.updateTask(user.id, planId, taskId, body);

    return NextResponse.json({
      data: {
        ok: true,
        taskId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to update task." } },
      { status: 400 },
    );
  }
}
