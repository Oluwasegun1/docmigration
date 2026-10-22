import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionToken } from "@/lib/auth/cookies";
import { accountService, authService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "Not signed in." } }, { status: 401 });
  }

  const user = await authService.getSessionUser(token);
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "Session expired or invalid." } }, { status: 401 });
  }

  const result = await accountService.requestAccountDeletion(user.id);
  await clearSessionCookie();

  return NextResponse.json({
    data: {
      ok: true,
      retentionExpiresAt: result.retentionExpiresAt.toISOString(),
      message: "Account marked for deletion. Data will be retained for 30 days before permanent erasure.",
    },
  });
}
