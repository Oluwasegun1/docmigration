import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { profileAnswersService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const facts = await profileAnswersService.getUserProfileFacts(user.id);
  return NextResponse.json({ data: facts });
}

export async function PUT(request: Request) {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const answers = (body.answers ?? body) as Record<string, unknown>;

    await profileAnswersService.saveAnswers(user.id, answers);
    const updatedFacts = await profileAnswersService.getUserProfileFacts(user.id);

    return NextResponse.json({
      data: {
        ok: true,
        facts: updatedFacts,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to save profile answers." } },
      { status: 400 },
    );
  }
}
