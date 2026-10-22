import "server-only";
import type { PrismaClient } from "@prisma/client";
import { brand } from "@/config/brand";
import { AppError } from "@/lib/errors";
import type { AuditSink } from "@/modules/audit/service";
import { type Mailer } from "./mailer";
import { hashPassword, verifyPassword } from "./password";
import { rateLimiter } from "./rate-limit";
import { generateToken, hashToken } from "./tokens";

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const firstChar = local[0];
  return `${firstChar}•••@${domain}`;
}

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  termsAccepted: boolean;
  researchConsent?: boolean;
  ipAddress?: string;
  userAgent?: string;
};

export type LoginInput = {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
};

// Dummy scrypt hash used to ensure constant-time calculation when user is not found.
const DUMMY_HASH = "8a21f7c5e3b9a102456789abcdef0123:c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2";

export function createAuthService(db: PrismaClient, mailer: Mailer, audit: AuditSink) {
  return {
    async register(input: RegisterInput): Promise<{ ok: boolean; maskedEmail: string }> {
      const email = input.email.toLowerCase().trim();

      // Rate limit registration by IP and email
      if (input.ipAddress) {
        await rateLimiter.assertAllowed(`register:ip:${input.ipAddress}`, { windowMs: 60_000, maxRequests: 10 });
      }
      await rateLimiter.assertAllowed(`register:email:${email}`, { windowMs: 60_000, maxRequests: 5 });

      if (!input.termsAccepted) {
        throw new AppError("validation_error", "You must accept the terms and privacy notice.");
      }

      // Hash password (validates length and breached status)
      const passwordHash = await hashPassword(input.password);

      const existingUser = await db.user.findUnique({
        where: { email },
        select: { id: true, emailVerified: true },
      });

      if (existingUser) {
        // ENUMERATION SAFE: send "you already have an account" email, never throw error
        await mailer.send({
          to: email,
          subject: `You already have a ${brand.name} account`,
          text: `You recently tried to create an account with ${email}. You already have an account with us. You can sign in directly at ${brand.siteUrl}/sign-in.`,
        });

        await audit.record([
          {
            action: "auth.register.duplicate_attempt",
            entityType: "user",
            entityKey: existingUser.id,
            actorRef: "system:auth",
          },
        ]);

        return { ok: true, maskedEmail: maskEmail(email) };
      }

      // Create new user with lowest role 'user'
      const { user, token } = await db.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            name: input.name.trim() || null,
            email,
            emailVerified: false,
            role: "user",
            status: "active",
          },
        });

        await tx.account.create({
          data: {
            userId: u.id,
            accountId: email,
            providerId: "credential",
            password: passwordHash,
          },
        });

        // Record required legal consent
        await tx.consent.create({
          data: {
            userId: u.id,
            email,
            purpose: "terms_and_privacy",
            documentVersion: brand.legal.termsVersion,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
          },
        });

        // Record optional research consent if given
        if (input.researchConsent) {
          await tx.consent.create({
            data: {
              userId: u.id,
              email,
              purpose: "anonymous_research",
              documentVersion: brand.legal.privacyVersion,
              ipAddress: input.ipAddress ?? null,
              userAgent: input.userAgent ?? null,
            },
          });
        }

        // Initialize signup draft for step 2
        await tx.signupDraft.create({
          data: {
            userId: u.id,
            email,
            step: 2,
            dataJson: {},
          },
        });

        // Single-use verification token (stored hashed)
        const gen = generateToken();
        await tx.verification.create({
          data: {
            identifier: u.id,
            value: gen.hash,
            purpose: "email_verification",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        });

        return { user: u, token: gen.token };
      });

      // Send verification email
      const verifyUrl = `${brand.siteUrl}/auth/verify?token=${token}`;
      await mailer.send({
        to: email,
        subject: `Confirm your email - ${brand.name}`,
        text: `Open this link to confirm your email and continue your setup:\n\n${verifyUrl}\n\nThis link expires in 24 hours.`,
      });

      await audit.record([
        {
          action: "auth.register.success",
          entityType: "user",
          entityKey: user.id,
          actorRef: "system:auth",
        },
      ]);

      return { ok: true, maskedEmail: maskEmail(email) };
    },

    async verifyEmailAndSignIn(rawToken: string, ipAddress?: string, userAgent?: string) {
      const tokenHash = hashToken(rawToken);

      const verification = await db.verification.findFirst({
        where: {
          value: tokenHash,
          purpose: "email_verification",
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!verification) {
        throw new AppError("validation_error", "Verification link is invalid or has expired.");
      }

      // Mark token used and user verified
      const { sessionToken, user, draft } = await db.$transaction(async (tx) => {
        await tx.verification.update({
          where: { id: verification.id },
          data: { usedAt: new Date() },
        });

        const u = await tx.user.update({
          where: { id: verification.identifier },
          data: { emailVerified: true },
        });

        // Generate rotated session token
        const sessGen = generateToken();
        await tx.session.create({
          data: {
            userId: u.id,
            token: sessGen.token,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            ipAddress: ipAddress ?? null,
            userAgent: userAgent ?? null,
          },
        });

        const d = await tx.signupDraft.findUnique({
          where: { userId: u.id },
        });

        return { sessionToken: sessGen.token, user: u, draft: d };
      });

      await audit.record([
        {
          action: "auth.email_verified",
          entityType: "user",
          entityKey: user.id,
          actorRef: user.id,
        },
      ]);

      return {
        sessionToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        nextStep: draft?.step ?? 2,
      };
    },

    async login(input: LoginInput) {
      const email = input.email.toLowerCase().trim();

      if (input.ipAddress) {
        await rateLimiter.assertAllowed(`login:ip:${input.ipAddress}`, { windowMs: 60_000, maxRequests: 20 });
      }
      await rateLimiter.assertAllowed(`login:email:${email}`, { windowMs: 60_000, maxRequests: 10 });

      const user = await db.user.findUnique({
        where: { email },
        include: { accounts: { where: { providerId: "credential" } } },
      });

      const account = user?.accounts[0];
      const validPassword = await verifyPassword(input.password, account?.password ?? DUMMY_HASH);

      if (!user || !account || !validPassword) {
        await audit.record([
          {
            action: "auth.login.failed",
            actorRef: "anonymous",
            metadata: { ip: input.ipAddress ?? "unknown" },
          },
        ]);
        throw new AppError("unauthenticated", "Invalid email or password.");
      }

      if (user.status !== "active") {
        throw new AppError("forbidden", "Account is inaccessible.");
      }

      // Rotate/create session token
      const sessGen = generateToken();
      await db.session.create({
        data: {
          userId: user.id,
          token: sessGen.token,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      });

      await audit.record([
        {
          action: "auth.login.success",
          entityType: "user",
          entityKey: user.id,
          actorRef: user.id,
        },
      ]);

      return {
        sessionToken: sessGen.token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      };
    },

    async logout(sessionToken: string) {
      await db.session.deleteMany({
        where: { token: sessionToken },
      });
    },

    async forgotPassword(emailInput: string, ipAddress?: string) {
      const email = emailInput.toLowerCase().trim();
      if (ipAddress) {
        await rateLimiter.assertAllowed(`forgot:ip:${ipAddress}`, { windowMs: 60_000, maxRequests: 10 });
      }

      const user = await db.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });

      // Always return ok: true (enumeration-safe!)
      if (!user) {
        return { ok: true };
      }

      // Invalidate any existing unused reset tokens for this user
      await db.verification.updateMany({
        where: {
          identifier: user.id,
          purpose: "password_reset",
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });

      const gen = generateToken();
      await db.verification.create({
        data: {
          identifier: user.id,
          value: gen.hash,
          purpose: "password_reset",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
        },
      });

      const resetUrl = `${brand.siteUrl}/auth/reset-password?token=${gen.token}`;
      await mailer.send({
        to: user.email,
        subject: `Reset your password - ${brand.name}`,
        text: `Open this link to reset your password:\n\n${resetUrl}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
      });

      await audit.record([
        {
          action: "auth.forgot_password.requested",
          entityType: "user",
          entityKey: user.id,
          actorRef: user.id,
        },
      ]);

      return { ok: true };
    },

    async resetPassword(rawToken: string, newPassword: string) {
      const tokenHash = hashToken(rawToken);

      const verification = await db.verification.findFirst({
        where: {
          value: tokenHash,
          purpose: "password_reset",
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!verification) {
        throw new AppError("validation_error", "Reset link is invalid or has expired.");
      }

      const newPasswordHash = await hashPassword(newPassword);

      await db.$transaction(async (tx) => {
        // Mark token used
        await tx.verification.update({
          where: { id: verification.id },
          data: { usedAt: new Date() },
        });

        // Update password
        await tx.account.updateMany({
          where: { userId: verification.identifier, providerId: "credential" },
          data: { password: newPasswordHash },
        });

        // REVOKE ALL ACTIVE SESSIONS for this user
        await tx.session.deleteMany({
          where: { userId: verification.identifier },
        });
      });

      await audit.record([
        {
          action: "auth.password.reset_success",
          entityType: "user",
          entityKey: verification.identifier,
          actorRef: verification.identifier,
        },
      ]);

      return { ok: true };
    },

    async getSessionUser(sessionToken: string) {
      const session = await db.session.findUnique({
        where: { token: sessionToken },
        include: { userRel: true },
      });

      if (!session || session.expiresAt <= new Date()) {
        return null;
      }

      return session.userRel;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
