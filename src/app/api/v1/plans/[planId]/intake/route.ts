import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { intakeService } from "@/lib/api/services";
import type { IntakeAnswerInput } from "@/modules/engine/plan/types";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  props: { params: Promise<{ planId: string }> },
) {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { planId } = await props.params;

  try {
    const groups = await intakeService.getIntakeQuestions(user.id, planId);
    return NextResponse.json({ data: groups });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to load intake questions." } },
      { status: 404 },
    );
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ planId: string }> },
) {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { planId } = await props.params;

  try {
    const body = await request.json();
    const answers = (body.answers ?? []) as IntakeAnswerInput[];

    if (!Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { error: { message: "answers array is required." } },
        { status: 400 },
      );
    }

    await intakeService.saveIntakeAnswers(user.id, planId, answers);

    return NextResponse.json({
      data: {
        ok: true,
        count: answers.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to save intake answers." } },
      { status: 400 },
    );
  }
}
