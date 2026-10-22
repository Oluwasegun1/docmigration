import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

/**
 * Development helper endpoint: allows testing email verification when an external
 * email provider (e.g. Resend) is not yet configured. Disabled in production.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && process.env.APP_ENV === "production") {
    return Response.json({ error: { message: "Disabled in production" } }, { status: 403 });
  }

  try {
    const { email } = await request.json();
    if (!email) {
      return Response.json({ error: { message: "Email required" } }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return Response.json({ error: { message: "User not found" } }, { status: 404 });
    }

    // Mark verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    // Mark verification tokens as used
    await prisma.verification.updateMany({
      where: {
        identifier: user.id,
        purpose: "email_verification",
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    // Create session
    const { randomBytes } = await import("node:crypto");
    const sessionToken = randomBytes(32).toString("hex");

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    await setSessionCookie(sessionToken);

    return Response.json({
      data: {
        ok: true,
        nextStep: "/signup/about-you",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Dev verify error";
    return Response.json({ error: { message: msg } }, { status: 500 });
  }
}
