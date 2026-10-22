import { prisma } from "@/lib/prisma";
import { createPrismaAuditSink } from "@/modules/audit/service";
import { createMailerFromEnv } from "@/modules/auth/mailer";
import { createAuthService } from "@/modules/auth/service";
import { createOnboardingService } from "@/modules/onboarding/service";
import { createAccountService } from "@/modules/account/service";
import { createPrismaProfileRegistryRepository } from "@/modules/profile/repository";
import { createProfileSchemaService } from "@/modules/profile/resolver";
import { createPrismaReferenceRepository } from "@/modules/reference/repository";
import { createReferenceService } from "@/modules/reference/service";

/** Composition root for the system services (Prisma-backed). */
export const auditSink = createPrismaAuditSink(prisma);
export const mailer = createMailerFromEnv();

export const referenceRepository = createPrismaReferenceRepository(prisma);
export const referenceService = createReferenceService(referenceRepository);
export const profileSchemaService = createProfileSchemaService(
  createPrismaProfileRegistryRepository(prisma),
  referenceRepository,
);

export const authService = createAuthService(prisma, mailer, auditSink);
export const onboardingService = createOnboardingService(prisma, auditSink);
export const accountService = createAccountService(prisma, auditSink);

// Stage 1 & 2 additions
import { createProfileAnswersService } from "@/modules/profile/answers-service";
import { createPathwayService } from "@/modules/pathways/service";
import { createAssessmentService } from "@/modules/assessment/service";
import { createPlanService } from "@/modules/plan/service";
import { createIntakeService } from "@/modules/intake/service";

export const profileAnswersService = createProfileAnswersService(prisma, auditSink);
export const pathwayService = createPathwayService(prisma);
export const assessmentService = createAssessmentService(
  prisma,
  profileAnswersService,
  pathwayService,
  auditSink,
);
export const planService = createPlanService(prisma, auditSink);
export const intakeService = createIntakeService(prisma, auditSink);
