export type AnswerKey =
  | "currentCountry"
  | "destinationCountry"
  | "graduationYear"
  | "highestQualification"
  | "internshipStatus"
  | "careerStage"
  | "experienceYears"
  | "specialty"
  | "currentWorkCountry"
  | "timeline"
  | "profession"
  | "trainedCountry";

export type MatchProfile = {
  currentCountry: string;
  destinationCountry: string;
  graduationYear: number | null;
  highestQualification: string | null;
  internshipStatus: string | null;
  careerStage: string | null;
  experienceYears: number | null;
  specialty?: string | null;
  currentWorkCountry?: string | null;
  timeline?: string | null;
  profession?: string | null;
  trainedCountry?: string | null;
};

export type RouteType =
  | "professional_registration"
  | "skilled_work"
  | "study"
  | "family"
  | "other";

export type CriterionOperator =
  | "equals"
  | "not_equals"
  | "in"
  | "not_in"
  | "gte"
  | "lte"
  | "gt"
  | "lt"
  | "max_years_since"
  | "min_years_since";

export type PublishedRequirement = {
  id: string;
  key: string;
  label: string;
  severity: "required" | "may_block";
  usedAnswers: AnswerKey[];
  operator: CriterionOperator;
  expectedValue: unknown;
  source: {
    url: string;
    verifiedAt: string;
    publisher?: string;
    title?: string;
  };
};

export type PublishedPathway = {
  id: string;
  versionId: string;
  slug: string;
  title: string;
  sourceCountry: string;
  destinationCountry: string;
  routeType: RouteType;
  profession?: string;
  status: "published";
  publishedAt: string;
  typicalDurationMonths?: number | null;
  requirements: PublishedRequirement[];
};

export type MatchStatus =
  | "requirement_unmet" // shown as "Requirement appears unmet"
  | "potential_blocker" // shown as "Potential blocker"
  | "more_info_needed" // shown as "More information needed"
  | "potential_match"; // shown as "Potential match"

export type CriterionResult = {
  requirementId: string;
  key: string;
  label: string;
  severity: "required" | "may_block";
  outcome: "met" | "not_met" | "unknown";
  reason: {
    code: string;
    params: Record<string, string | number>;
  };
  usedAnswers: AnswerKey[];
  source: {
    url: string;
    verifiedAt: string;
    publisher?: string;
    title?: string;
  };
};

export type MatchResult = {
  pathwayId: string;
  pathwayVersionId: string;
  slug: string;
  title: string;
  routeType: RouteType;
  status: MatchStatus;
  criteria: CriterionResult[];
  missing: AnswerKey[]; // de-duplicated answers that would resolve an unknown
  typicalDurationMonths?: number | null;
  timelineNote?: string | null;
  publishedAt: string;
};

export type EvaluationResult = {
  engineVersion: string;
  evaluatedAt: string;
  results: MatchResult[];
};
