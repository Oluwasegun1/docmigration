import { setSessionCookie } from "@/lib/auth/cookies";
import { toErrorResponse } from "@/lib/errors";
import { authService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return Response.redirect(new URL("/sign-in?error=invalid_token", request.url));
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await authService.verifyEmailAndSignIn(token, ip, userAgent);
    await setSessionCookie(result.sessionToken);

    const stepPath = result.nextStep === 3 ? "/signup/where-to" : "/signup/about-you";
    return Response.redirect(new URL(stepPath, request.url));
  } catch {
    return Response.redirect(new URL("/sign-in?error=expired_token", request.url));
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body.token;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await authService.verifyEmailAndSignIn(token, ip, userAgent);
    await setSessionCookie(result.sessionToken);

    return Response.json({
      data: {
        ok: true,
        user: result.user,
        nextStep: result.nextStep,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
