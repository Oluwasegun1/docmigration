import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { planService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  props: { params: Promise<{ planId: string }> },
) {
  const { user, errorResponse } = await requireUser();
  if (errorResponse) return errorResponse;

  const { planId } = await props.params;

  try {
    const changes = await planService.getChanges(user.id, planId);
    return NextResponse.json({ data: changes });
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to load version changes." } },
      { status: 400 },
    );
  }
}
