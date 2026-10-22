import "server-only";
import type { PrismaClient } from "@prisma/client";
import { brand } from "@/config/brand";
import { AppError } from "@/lib/errors";
import type { AuditSink } from "@/modules/audit/service";

export type SignupDraftData = {
  sector?: string;
  profession?: string;
  trainedInCountry?: string;
  destinations?: string[];
  notSureYet?: boolean;
};

export type WaitlistInput = {
  userId?: string;
  email: string;
  professionId?: string;
  professionFreeText?: string;
  originCountry: string;
  destinationCountry?: string;
  consentGranted: boolean;
  ipAddress?: string;
  userAgent?: string;
};

export function createOnboardingService(db: PrismaClient, audit: AuditSink) {
  return {
    async getDraft(userId: string) {
      const draft = await db.signupDraft.findUnique({
        where: { userId },
      });
      return draft
        ? { step: draft.step, data: draft.dataJson as SignupDraftData }
        : { step: 2, data: {} };
    },

    async saveDraft(userId: string, step: number, data: SignupDraftData) {
      const draft = await db.signupDraft.upsert({
        where: { userId },
        create: {
          userId,
          step,
          dataJson: data,
        },
        update: {
          step,
          dataJson: data,
        },
      });
      return { step: draft.step, data: draft.dataJson as SignupDraftData };
    },

    async saveAboutYou(userId: string, data: { profession: string; trainedInCountry: string; sector?: string }) {
      const { profession, trainedInCountry, sector } = data;

      await db.$transaction(async (tx) => {
        // Upsert UserProfession
        await tx.userProfession.upsert({
          where: { userId_professionCode: { userId, professionCode: profession } },
          create: { userId, professionCode: profession, isPrimary: true },
          update: { isPrimary: true },
        });

        // Upsert UserCountry for trained_in
        await tx.userCountry.upsert({
          where: { userId_role_countryCode: { userId, role: "trained_in", countryCode: trainedInCountry } },
          create: { userId, role: "trained_in", countryCode: trainedInCountry },
          update: {},
        });

        // Update draft to step 3
        const prevDraft = await tx.signupDraft.findUnique({ where: { userId } });
        const existingData = (prevDraft?.dataJson as SignupDraftData) ?? {};

        await tx.signupDraft.upsert({
          where: { userId },
          create: {
            userId,
            step: 3,
            dataJson: { ...existingData, profession, trainedInCountry, sector },
          },
          update: {
            step: 3,
            dataJson: { ...existingData, profession, trainedInCountry, sector },
          },
        });
      });

      await audit.record([
        {
          action: "onboarding.about_you.saved",
          entityType: "user",
          entityKey: userId,
          actorRef: userId,
        },
      ]);
    },

    async saveDestinations(userId: string, destinations: string[], notSureYet = false) {
      await db.$transaction(async (tx) => {
        // Clear previous destinations
        await tx.userCountry.deleteMany({
          where: { userId, role: "destination" },
        });

        // Add ranked destinations (up to 3)
        if (!notSureYet && destinations.length > 0) {
          const toAdd = destinations.slice(0, 3).map((code, idx) => ({
            userId,
            countryCode: code,
            role: "destination",
            priority: idx + 1,
          }));

          await tx.userCountry.createMany({
            data: toAdd,
          });
        }

        // Complete wizard: draft step marked 4 (handoff)
        const prevDraft = await tx.signupDraft.findUnique({ where: { userId } });
        const existingData = (prevDraft?.dataJson as SignupDraftData) ?? {};

        await tx.signupDraft.upsert({
          where: { userId },
          create: {
            userId,
            step: 4,
            dataJson: { ...existingData, destinations, notSureYet },
          },
          update: {
            step: 4,
            dataJson: { ...existingData, destinations, notSureYet },
          },
        });
      });

      await audit.record([
        {
          action: "onboarding.destinations.saved",
          entityType: "user",
          entityKey: userId,
          actorRef: userId,
        },
      ]);
    },

    async joinWaitlist(input: WaitlistInput) {
      if (!input.consentGranted) {
        throw new AppError("validation_error", "You must give consent to join the waitlist.");
      }

      const email = input.email.toLowerCase().trim();

      const entry = await db.$transaction(async (tx) => {
        const consent = await tx.consent.create({
          data: {
            userId: input.userId ?? null,
            email,
            purpose: "waitlist_notification",
            documentVersion: brand.legal.privacyVersion,
            ipAddress: input.ipAddress ?? null,
            userAgent: input.userAgent ?? null,
          },
        });

        return tx.waitlistEntry.create({
          data: {
            userId: input.userId ?? null,
            email,
            professionId: input.professionId ?? null,
            professionFreeText: input.professionFreeText?.trim() || null,
            originCountry: input.originCountry,
            destinationCountry: input.destinationCountry ?? null,
            consentId: consent.id,
          },
        });
      });

      await audit.record([
        {
          action: "waitlist.entry.created",
          entityType: "waitlist_entry",
          entityKey: entry.id,
          actorRef: input.userId ?? "anonymous",
          metadata: {
            origin: input.originCountry,
            destination: input.destinationCountry ?? null,
          },
        },
      ]);

      return { ok: true, id: entry.id };
    },
  };
}

export type OnboardingService = ReturnType<typeof createOnboardingService>;
