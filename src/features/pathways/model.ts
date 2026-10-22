import type { AssessmentEvaluation } from "@/modules/engine/rules/types";

export interface CriterionItem {
  criterionId: string;
  key: string;
  title: string;
  profileField: string;
  status: "met" | "not_met" | "unknown";
  mandatory: boolean;
  explanation?: string | null;
  userValue?: unknown;
  source?: {
    title: string;
    url: string;
    publisher: string;
    verifiedAt: string | null;
  } | null;
}

export interface AssessmentItemView {
  pathway: {
    id: string;
    slug: string;
    name: string;
    profession: { code: string; name: string } | null;
    origin: { code: string; name: string } | null;
    destination: { code: string; name: string } | null;
    destinationCountry?: string;
    regulator: { id: string; name: string; shortName: string } | null;
    status: string;
  };
  version: {
    id: string;
    version: number;
    publishedAt: string;
  };
  evaluation: {
    outcome: "potential_match" | "potential_blocker" | "more_information_needed" | "unmet";
    outcomeLabel: string;
    criteriaResults: CriterionItem[];
    missingFields: string[];
    sourceIds: string[];
    assessedAt: string;
  };
}

export function toAssessmentItemView(r: {
  pathway: {
    id: string;
    slug: string;
    name: string;
    destinationCountry?: string | null;
    originCountry?: string | null;
    professionId?: string | null;
    professionRel?: { code: string; name: string } | null;
    originRel?: { code: string; name: string } | null;
    destRel?: { code: string; name: string } | null;
    regulatorRel?: { id: string; name: string; shortName: string } | null;
    status: string;
  };
  version: {
    id: string;
    version: number;
    publishedAt?: Date | string | null;
    criteria: Array<{
      id?: string;
      key: string;
      explanationKey?: string | null;
      sourceRel?: {
        title: string;
        url: string;
        publisher: string;
        verifiedAt?: Date | string | null;
      } | null;
    }>;
  };
  evaluation: AssessmentEvaluation;
}): AssessmentItemView {
  return {
    pathway: {
      id: r.pathway.id,
      slug: r.pathway.slug,
      name: r.pathway.name,
      destinationCountry: r.pathway.destinationCountry ?? undefined,
      profession:
        r.pathway.professionRel ??
        (r.pathway.professionId
          ? { code: r.pathway.professionId, name: r.pathway.professionId }
          : null),
      origin:
        r.pathway.originRel ??
        (r.pathway.originCountry
          ? { code: r.pathway.originCountry, name: r.pathway.originCountry }
          : null),
      destination:
        r.pathway.destRel ??
        (r.pathway.destinationCountry
          ? { code: r.pathway.destinationCountry, name: r.pathway.destinationCountry }
          : null),
      regulator: r.pathway.regulatorRel ?? null,
      status: r.pathway.status,
    },
    version: {
      id: r.version.id,
      version: r.version.version,
      publishedAt: r.version.publishedAt
        ? r.version.publishedAt instanceof Date
          ? r.version.publishedAt.toISOString()
          : String(r.version.publishedAt)
        : "",
    },
    evaluation: {
      outcome: r.evaluation.outcome,
      outcomeLabel: r.evaluation.outcomeLabel,
      criteriaResults: r.evaluation.criteriaResults.map((cr) => {
        const criterionDef = r.version.criteria.find(
          (c) => c.id === cr.criterionId || c.key === cr.key,
        );
        return {
          criterionId: cr.criterionId,
          key: cr.key,
          profileField: cr.profileField,
          status: cr.status,
          mandatory: cr.mandatory,
          userValue: cr.userValue,
          title: criterionDef?.key
            ? criterionDef.key
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase())
            : cr.key,
          explanation: criterionDef?.explanationKey ?? null,
          source: criterionDef?.sourceRel
            ? {
                title: criterionDef.sourceRel.title,
                url: criterionDef.sourceRel.url,
                publisher: criterionDef.sourceRel.publisher,
                verifiedAt: criterionDef.sourceRel.verifiedAt
                  ? criterionDef.sourceRel.verifiedAt instanceof Date
                    ? criterionDef.sourceRel.verifiedAt.toISOString().slice(0, 10)
                    : String(criterionDef.sourceRel.verifiedAt).slice(0, 10)
                  : null,
              }
            : null,
        };
      }),
      missingFields: r.evaluation.missingFields,
      sourceIds: r.evaluation.sourceIds,
      assessedAt: r.evaluation.assessedAt,
    },
  };
}
