import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { AuditSink } from "@/modules/audit/service";

export interface ProfileAnswersService {
  getUserProfileFacts(userId: string): Promise<Record<string, unknown>>;
  getUserDestinationPreferences(userId: string): Promise<string[]>;
  saveAnswers(
    userId: string,
    answers: Record<string, unknown>,
    schemaVersion?: number,
  ): Promise<void>;
}

export function createProfileAnswersService(
  db: PrismaClient,
  audit: AuditSink,
): ProfileAnswersService {
  return {
    async getUserProfileFacts(userId: string): Promise<Record<string, unknown>> {
      const [answers, countries, professions, draft] = await Promise.all([
        db.profileAnswer.findMany({
          where: { userId },
          select: { fieldKey: true, valueJson: true },
        }),
        db.userCountry.findMany({
          where: { userId },
          select: { role: true, countryCode: true },
        }),
        db.userProfession.findMany({
          where: { userId, isPrimary: true },
          select: { professionCode: true },
        }),
        db.signupDraft.findUnique({
          where: { userId },
          select: { dataJson: true },
        }),
      ]);

      const facts: Record<string, unknown> = {};

      for (const a of answers) {
        facts[a.fieldKey] = a.valueJson;
      }

      // Virtual storage mapping
      for (const c of countries) {
        if (c.role === "trained_in") {
          facts.trainedInCountry = c.countryCode;
          facts.qualificationCountry = c.countryCode;
        } else if (c.role === "practising_in") {
          facts.residenceCountry = c.countryCode;
        } else if (c.role === "destination") {
          facts.destinationCountry = c.countryCode;
        }
      }

      if (professions.length > 0) {
        facts.profession = professions[0].professionCode;
      }

      // Fallback from signup draft if not yet promoted to userCountry / userProfession
      const draftData = (draft?.dataJson as Record<string, unknown>) || {};
      if (!facts.trainedInCountry && draftData.trainedInCountry) {
        facts.trainedInCountry = draftData.trainedInCountry;
        facts.qualificationCountry = draftData.trainedInCountry;
      }
      if (!facts.profession && draftData.profession) {
        facts.profession = draftData.profession;
      }
      if (!facts.trainedInCountry) {
        facts.trainedInCountry = "NG";
        facts.qualificationCountry = "NG";
      }
      if (!facts.originCountry) {
        facts.originCountry = (facts.trainedInCountry as string) || "NG";
      }
      if (!facts.profession) {
        facts.profession = "doctor";
      }

      return facts;
    },

    async getUserDestinationPreferences(userId: string): Promise<string[]> {
      const [destCountries, draft] = await Promise.all([
        db.userCountry.findMany({
          where: { userId, role: "destination" },
          orderBy: { priority: "asc" },
          select: { countryCode: true },
        }),
        db.signupDraft.findUnique({
          where: { userId },
          select: { dataJson: true },
        }),
      ]);

      if (destCountries.length > 0) {
        return destCountries.map((c) => c.countryCode);
      }

      const draftData = (draft?.dataJson as Record<string, unknown>) || {};
      if (Array.isArray(draftData.destinations) && draftData.destinations.length > 0) {
        return draftData.destinations as string[];
      }

      return [];
    },

    async saveAnswers(
      userId: string,
      answers: Record<string, unknown>,
      schemaVersion = 1,
    ): Promise<void> {
      // Query registered profile fields to guard foreign key relation
      const validFields = await db.profileField.findMany({
        select: { key: true, storage: true },
      });
      const fieldMap = new Map(validFields.map((f) => [f.key, f]));

      const operations: Promise<unknown>[] = [];

      for (const [key, val] of Object.entries(answers)) {
        if (val === undefined || val === null || val === "") continue;

        // Virtual storage checks: user_country (role: trained_in)
        if (key === "trainedInCountry" || key === "qualificationCountry") {
          const countryCode = String(val).toUpperCase().trim();
          if (countryCode.length === 2) {
            operations.push(
              db.userCountry.upsert({
                where: {
                  userId_role_countryCode: {
                    userId,
                    role: "trained_in",
                    countryCode,
                  },
                },
                create: { userId, role: "trained_in", countryCode },
                update: {},
              })
            );
          }
        }

        // Virtual storage checks: user_country (role: practising_in)
        if (key === "currentCountry" || key === "residenceCountry") {
          const countryCode = String(val).toUpperCase().trim();
          if (countryCode.length === 2) {
            operations.push(
              db.userCountry.upsert({
                where: {
                  userId_role_countryCode: {
                    userId,
                    role: "practising_in",
                    countryCode,
                  },
                },
                create: { userId, role: "practising_in", countryCode },
                update: {},
              })
            );
          }
        }

        // Virtual storage checks: user_country (role: destination)
        if (key === "destinationCountry") {
          const countryCode = String(val).toUpperCase().trim();
          if (countryCode.length === 2) {
            operations.push(
              db.userCountry.upsert({
                where: {
                  userId_role_countryCode: {
                    userId,
                    role: "destination",
                    countryCode,
                  },
                },
                create: { userId, role: "destination", countryCode, priority: 1 },
                update: { priority: 1 },
              })
            );
          }
        }

        // Virtual storage checks: user_professions
        if (key === "profession") {
          const profCode = String(val).trim();
          if (profCode) {
            operations.push(
              db.userProfession.upsert({
                where: {
                  userId_professionCode: {
                    userId,
                    professionCode: profCode,
                  },
                },
                create: { userId, professionCode: profCode, isPrimary: true },
                update: { isPrimary: true },
              })
            );
          }
        }

        // Foreign key guard: only persist in profile_answers if field exists in profile_fields
        const fieldDef = fieldMap.get(key);
        if (!fieldDef) {
          continue;
        }

        // Virtual storage fields are stored in user_countries, not duplicated in profile_answers
        if (fieldDef.storage === "user_country") {
          continue;
        }

        // Persist standard fields in profile_answers
        operations.push(
          db.profileAnswer.upsert({
            where: {
              userId_fieldKey: { userId, fieldKey: key },
            },
            create: {
              userId,
              fieldKey: key,
              valueJson: val as object,
              schemaVersion,
            },
            update: {
              valueJson: val as object,
              schemaVersion,
            },
          })
        );
      }

      await Promise.all(operations);

      await audit.record([
        {
          action: "profile.answers.updated",
          entityType: "user",
          entityKey: userId,
          actorRef: userId,
          metadata: { keys: Object.keys(answers) },
        },
      ]);
    },
  };
}
