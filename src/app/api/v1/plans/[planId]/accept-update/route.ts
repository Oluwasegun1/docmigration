import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { planService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  props: { params: Promise<{ planId: string }> },
) {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { planId } = await props.params;

  try {
    const body = await request.json();
    if (!body.targetVersionId) {
      return NextResponse.json(
        { error: { message: "targetVersionId is required." } },
        { status: 400 },
      );
    }

    await planService.acceptUpdate(user.id, planId, body.targetVersionId);

    return NextResponse.json({
      data: {
        ok: true,
        targetVersionId: body.targetVersionId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to accept version update." } },
      { status: 400 },
    );
  }
}
