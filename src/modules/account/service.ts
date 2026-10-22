import "server-only";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors";
import type { AuditSink } from "@/modules/audit/service";

export interface AccountService {
  exportUserData(userId: string): Promise<Record<string, unknown>>;
  requestAccountDeletion(userId: string): Promise<{ ok: boolean; retentionExpiresAt: Date }>;
  purgeExpiredAccounts(): Promise<{ purgedCount: number }>;
}

export function createAccountService(
  db: PrismaClient,
  audit: AuditSink
): AccountService {
  return {
    async exportUserData(userId: string) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          consents: true,
          professions: true,
          countries: true,
          profileAnswers: true,
          signupDraft: true,
        },
      });

      if (!user) {
        throw new AppError("not_found", "User not found.");
      }

      await audit.record([
        {
          action: "account.data_exported",
          entityType: "user",
          entityKey: userId,
          actorRef: userId,
        },
      ]);

      return {
        exportedAt: new Date().toISOString(),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        consents: user.consents.map((c) => ({
          purpose: c.purpose,
          documentVersion: c.documentVersion,
          grantedAt: c.grantedAt,
          withdrawnAt: c.withdrawnAt,
        })),
        professions: user.professions.map((p) => ({
          professionCode: p.professionCode,
          isPrimary: p.isPrimary,
          createdAt: p.createdAt,
        })),
        countries: user.countries.map((c) => ({
          countryCode: c.countryCode,
          role: c.role,
          priority: c.priority,
          createdAt: c.createdAt,
        })),
        profileAnswers: user.profileAnswers.map((a) => ({
          fieldKey: a.fieldKey,
          valueJson: a.valueJson,
          updatedAt: a.updatedAt,
        })),
      };
    },

    async requestAccountDeletion(userId: string) {
      const now = new Date();
      const retentionExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30-day retention window

      await db.$transaction(async (tx) => {
        // Soft delete user and record expiry
        await tx.user.update({
          where: { id: userId },
          data: {
            status: "deleted",
            deletedAt: now,
            retentionExpiresAt,
          },
        });

        // Revoke all active sessions
        await tx.session.deleteMany({
          where: { userId },
        });
      });

      await audit.record([
        {
          action: "account.deletion_requested",
          entityType: "user",
          entityKey: userId,
          actorRef: userId,
          metadata: { retentionExpiresAt: retentionExpiresAt.toISOString() },
        },
      ]);

      return { ok: true, retentionExpiresAt };
    },

    async purgeExpiredAccounts() {
      const now = new Date();
      const expiredUsers = await db.user.findMany({
        where: {
          status: "deleted",
          retentionExpiresAt: { lte: now },
        },
        select: { id: true },
      });

      let purgedCount = 0;

      for (const { id: expiredUserId } of expiredUsers) {
        await db.$transaction(async (tx) => {
          // Cascade clean dependent entities
          await tx.session.deleteMany({ where: { userId: expiredUserId } });
          await tx.account.deleteMany({ where: { userId: expiredUserId } });
          await tx.verification.deleteMany({ where: { identifier: expiredUserId } });
          await tx.consent.deleteMany({ where: { userId: expiredUserId } });
          await tx.userProfession.deleteMany({ where: { userId: expiredUserId } });
          await tx.userCountry.deleteMany({ where: { userId: expiredUserId } });
          await tx.profileAnswer.deleteMany({ where: { userId: expiredUserId } });
          await tx.signupDraft.deleteMany({ where: { userId: expiredUserId } });
          await tx.user.delete({ where: { id: expiredUserId } });
        });

        await audit.record([
          {
            action: "account.purged",
            entityType: "user",
            entityKey: expiredUserId,
            actorRef: "system:retention_job",
          },
        ]);

        purgedCount++;
      }

      return { purgedCount };
    },
  };
}
