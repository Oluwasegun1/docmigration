import "server-only";
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { evaluateCriteria } from "@/modules/engine/rules/evaluate";
import { rankPathwayEvaluations } from "@/modules/engine/rules/rank";
import type {
  AssessmentEvaluation,
  CriterionRule,
  RuleOperator,
} from "@/modules/engine/rules/types";
import type { AuditSink } from "@/modules/audit/service";
import type { ProfileAnswersService } from "@/modules/profile/answers-service";
import type { PathwayService } from "@/modules/pathways/service";

function computeHash(data: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(data ?? {}))
    .digest("hex");
}

export function createAssessmentService(
  db: PrismaClient,
  answersService: ProfileAnswersService,
  pathwayService: PathwayService,
  audit: AuditSink,
) {
  return {
    async getAssessments(userId: string) {
      return db.assessmentRun.findMany({
        where: { userId },
        include: {
          pathwayVersionRel: {
            include: {
              pathwayRel: {
                include: {
                  professionRel: true,
                  originRel: true,
                  destRel: true,
                  regulatorRel: true,
                },
              },
            },
          },
        },
        orderBy: { assessedAt: "desc" },
      });
    },

    async runAssessment(
      userId: string,
      pathwayVersionId: string,
    ): Promise<AssessmentEvaluation & { id: string; pathwayVersionId: string }> {
      const [facts, version] = await Promise.all([
        answersService.getUserProfileFacts(userId),
        pathwayService.getPathwayVersion(pathwayVersionId),
      ]);

      const criteriaRules: CriterionRule[] = version.criteria.map((c) => ({
        id: c.id,
        key: c.key,
        profileField: c.profileField,
        operator: c.operator as RuleOperator,
        expected: c.expected,
        mandatory: c.mandatory,
        sourceId: c.sourceId,
        explanationKey: c.explanationKey,
        verifiedAt: c.verifiedAt.toISOString(),
        isPlaceholder: c.isPlaceholder,
      }));

      const evaluation = evaluateCriteria(criteriaRules, facts);
      const profileHash = computeHash(facts);

      const run = await db.assessmentRun.create({
        data: {
          userId,
          pathwayVersionId,
          status: evaluation.outcome,
          criteriaResults: evaluation.criteriaResults as object,
          missingFields: evaluation.missingFields as object,
          profileHash,
          assessedAt: new Date(evaluation.assessedAt),
        },
      });

      await audit.record([
        {
          action: "screening.assessment.run",
          entityType: "assessment_run",
          entityKey: run.id,
          actorRef: userId,
          metadata: {
            pathwayVersionId,
            outcome: evaluation.outcome,
            missingFieldsCount: evaluation.missingFields.length,
          },
        },
      ]);

      return {
        ...evaluation,
        id: run.id,
        pathwayVersionId,
      };
    },

    async evaluateAllAvailablePathways(userId: string) {
      const [facts, destinationPreferences] = await Promise.all([
        answersService.getUserProfileFacts(userId),
        answersService.getUserDestinationPreferences(userId),
      ]);

      const profession = facts.profession as string | undefined;
      const origin = (facts.originCountry ?? facts.trainedInCountry) as string | undefined;

      const pathways = await pathwayService.listPathways({
        profession,
        origin,
      });

      const evaluations: Array<{
        pathway: (typeof pathways)[number];
        version: (typeof pathways)[number]["versions"][number];
        evaluation: AssessmentEvaluation;
      }> = [];

      for (const p of pathways) {
        const latestVersion = p.versions[0];
        if (!latestVersion) continue;

        const rules: CriterionRule[] = latestVersion.criteria.map((c) => ({
          id: c.id,
          key: c.key,
          profileField: c.profileField,
          operator: c.operator as RuleOperator,
          expected: c.expected,
          mandatory: c.mandatory,
          sourceId: c.sourceId,
          explanationKey: c.explanationKey,
          verifiedAt: c.verifiedAt.toISOString(),
          isPlaceholder: c.isPlaceholder,
        }));

        const evaluation = evaluateCriteria(rules, facts);
        evaluations.push({
          pathway: p,
          version: latestVersion,
          evaluation,
        });
      }

      return rankPathwayEvaluations(evaluations, {
        destinationPreferences,
      });
    },
  };
}

export type AssessmentService = ReturnType<typeof createAssessmentService>;
