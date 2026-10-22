import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { planService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const plans = await planService.getUserPlans(user.id);
  return NextResponse.json({ data: plans });
}

export async function POST(request: Request) {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: { message: "Idempotency-Key header is required." } },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    if (!body.pathwayVersionId) {
      return NextResponse.json(
        { error: { message: "pathwayVersionId is required." } },
        { status: 400 },
      );
    }

    const plan = await planService.createPlan(
      user.id,
      body.pathwayVersionId,
      idempotencyKey,
    );

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Plan creation failed." } },
      { status: 400 },
    );
  }
}
