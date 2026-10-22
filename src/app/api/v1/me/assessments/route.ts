import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { assessmentService } from "@/lib/api/services";
import { toAssessmentItemView } from "@/features/pathways/model";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const results = await assessmentService.evaluateAllAvailablePathways(user.id);

  return NextResponse.json({
    data: results.map(toAssessmentItemView),
  });
}

export async function POST(request: Request) {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    if (!body.pathwayVersionId) {
      return NextResponse.json(
        { error: { message: "pathwayVersionId is required." } },
        { status: 400 },
      );
    }

    const evaluation = await assessmentService.runAssessment(
      user.id,
      body.pathwayVersionId,
    );

    return NextResponse.json({ data: evaluation });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Assessment failed." } },
      { status: 400 },
    );
  }
}
