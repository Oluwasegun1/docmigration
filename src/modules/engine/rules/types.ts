/**
 * Pure Domain Engine: Rule Engine Types
 * Zero database, network, or AI dependencies.
 */

export const RULE_OPERATORS = [
  "equals",
  "not_equals",
  "in",
  "not_in",
  "gte",
  "lte",
  "gt",
  "lt",
  "exists",
  "not_exists",
] as const;

export type RuleOperator = (typeof RULE_OPERATORS)[number];

export interface CriterionRule {
  id: string;
  key: string;
  profileField: string;
  operator: RuleOperator;
  expected: unknown;
  mandatory: boolean;
  sourceId: string;
  explanationKey: string;
  verifiedAt: string;
  isPlaceholder?: boolean;
}

export type CriterionEvaluationStatus = "met" | "not_met" | "unknown";

export const CRITERION_LABELS: Record<CriterionEvaluationStatus, string> = {
  met: "Met",
  not_met: "Requirement appears unmet",
  unknown: "More information needed",
};

export type PathwayAssessmentOutcome =
  | "potential_blocker"
  | "unmet"
  | "more_information_needed"
  | "potential_match";

export const PATHWAY_OUTCOME_LABELS: Record<PathwayAssessmentOutcome, string> = {
  unmet: "Requirement appears unmet",
  potential_blocker: "Potential blocker",
  more_information_needed: "More information needed",
  potential_match: "Potential match",
};

export interface CriterionResult {
  criterionId: string;
  key: string;
  profileField: string;
  mandatory: boolean;
  sourceId: string;
  explanationKey: string;
  status: CriterionEvaluationStatus;
  label: string;
  userValue: unknown;
  expectedValue: unknown;
}

export interface AssessmentEvaluation {
  outcome: PathwayAssessmentOutcome;
  outcomeLabel: string;
  criteriaResults: CriterionResult[];
  missingFields: string[];
  sourceIds: string[];
  assessedAt: string;
}
