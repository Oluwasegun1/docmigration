import { prisma } from "@/lib/prisma";
import { createPrismaProfileRegistryRepository } from "@/modules/profile/repository";
import { createProfileSchemaService } from "@/modules/profile/resolver";
import { createPrismaReferenceRepository } from "@/modules/reference/repository";
import { createReferenceService } from "@/modules/reference/service";

/** Composition root for the reference/profile read services (Prisma-backed). */
const referenceRepository = createPrismaReferenceRepository(prisma);

export const referenceService = createReferenceService(referenceRepository);
export const profileSchemaService = createProfileSchemaService(
  createPrismaProfileRegistryRepository(prisma),
  referenceRepository,
);
