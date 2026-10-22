import "server-only";
import type { PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors";

export interface PathwayFilter {
  profession?: string;
  origin?: string;
  destination?: string;
}

export function createPathwayService(db: PrismaClient) {
  return {
    async listPathways(filter: PathwayFilter) {
      const whereClause: {
        status?: { in: string[] };
        professionId?: string;
        originCountry?: string;
        destinationCountry?: string;
      } = {
        status: { in: ["live", "beta"] },
      };

      if (filter.profession) {
        whereClause.professionId = filter.profession;
      }
      if (filter.origin) {
        whereClause.originCountry = filter.origin;
      }
      if (filter.destination) {
        whereClause.destinationCountry = filter.destination;
      }

      const pathways = await db.pathway.findMany({
        where: whereClause,
        include: {
          versions: {
            where: { status: "published" },
            orderBy: { version: "desc" },
            take: 1,
            include: {
              criteria: {
                include: { sourceRel: true },
              },
              templates: {
                include: { sourceRel: true },
              },
            },
          },
          professionRel: { select: { code: true, name: true } },
          originRel: { select: { code: true, name: true } },
          destRel: { select: { code: true, name: true } },
          regulatorRel: { select: { id: true, name: true, shortName: true } },
        },
        orderBy: { slug: "asc" },
      });

      return pathways;
    },

    async getPathway(pathwayId: string) {
      const pathway = await db.pathway.findUnique({
        where: { id: pathwayId },
        include: {
          versions: {
            where: { status: "published" },
            orderBy: { version: "desc" },
            take: 1,
            include: {
              criteria: {
                include: { sourceRel: true },
              },
              templates: {
                include: { sourceRel: true },
              },
            },
          },
          professionRel: true,
          originRel: true,
          destRel: true,
          regulatorRel: true,
        },
      });

      if (!pathway) {
        throw new AppError("not_found", "Pathway not found.");
      }

      return pathway;
    },

    async getPathwayVersion(versionId: string) {
      const version = await db.pathwayVersion.findUnique({
        where: { id: versionId },
        include: {
          pathwayRel: {
            include: {
              professionRel: true,
              originRel: true,
              destRel: true,
              regulatorRel: true,
            },
          },
          criteria: {
            include: { sourceRel: true, profileFieldRel: true },
          },
          templates: {
            include: {
              sourceRel: true,
              dependencies: true,
            },
            orderBy: { intakeOrder: "asc" },
          },
        },
      });

      if (!version) {
        throw new AppError("not_found", "Pathway version not found.");
      }

      return version;
    },
  };
}

export type PathwayService = ReturnType<typeof createPathwayService>;
