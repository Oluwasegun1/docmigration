import { clearSessionCookie, getSessionToken } from "@/lib/auth/cookies";
import { toErrorResponse } from "@/lib/errors";
import { authService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const token = await getSessionToken();
    if (token) {
      await authService.logout(token);
    }
    await clearSessionCookie();
    return Response.json({ data: { ok: true } });
  } catch (err) {
    return toErrorResponse(err);
  }
}
