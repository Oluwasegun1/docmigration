import "server-only";
import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth/cookies";
import { authService } from "@/lib/api/services";

export async function requireUser() {
  const token = await getSessionToken();
  if (!token) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: { code: "unauthenticated", message: "Not signed in." } },
        { status: 401 },
      ),
    };
  }

  const user = await authService.getSessionUser(token);
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json(
        { error: { code: "unauthenticated", message: "Session expired or invalid." } },
        { status: 401 },
      ),
    };
  }

  return { user, errorResponse: null };
}
