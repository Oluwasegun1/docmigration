import { evaluateOperator } from "./operators";
import {
  type AssessmentEvaluation,
  CRITERION_LABELS,
  type CriterionResult,
  type CriterionRule,
  PATHWAY_OUTCOME_LABELS,
  type PathwayAssessmentOutcome,
} from "./types";

/**
 * Pure evaluation function for screening criteria.
 *
 * Precedence hierarchy (highest to lowest):
 * 1. "Requirement appears unmet" (if any non-mandatory criterion is not_met)
 * 2. "Potential blocker" (if any mandatory criterion is not_met)
 * 3. "More information needed" (no mandatory not_met, but >=1 mandatory is unknown)
 * 4. "Potential match" (all mandatory criteria are met)
 */
export function evaluateCriteria(
  criteria: CriterionRule[],
  profileAnswers: Record<string, unknown>,
  assessedAt: string = new Date().toISOString(),
): AssessmentEvaluation {
  const missingFieldsSet = new Set<string>();
  const sourceIdsSet = new Set<string>();
  const criteriaResults: CriterionResult[] = [];

  for (const rule of criteria) {
    if (rule.sourceId) {
      sourceIdsSet.add(rule.sourceId);
    }

    const userValue = profileAnswers[rule.profileField];
    const isMissing =
      userValue === undefined ||
      userValue === null ||
      userValue === "" ||
      userValue === "unknown";

    if (isMissing && rule.operator !== "exists" && rule.operator !== "not_exists") {
      missingFieldsSet.add(rule.profileField);
    }

    const status = evaluateOperator(rule.operator, userValue, rule.expected);

    criteriaResults.push({
      criterionId: rule.id,
      key: rule.key,
      profileField: rule.profileField,
      mandatory: rule.mandatory,
      sourceId: rule.sourceId,
      explanationKey: rule.explanationKey,
      status,
      label: CRITERION_LABELS[status],
      userValue: userValue ?? null,
      expectedValue: rule.expected,
    });
  }

  // Determine overall outcome following exact precedence
  let outcome: PathwayAssessmentOutcome = "potential_match";

  const hasMandatoryNotMet = criteriaResults.some(
    (c) => c.mandatory && c.status === "not_met",
  );
  const hasOptionalNotMet = criteriaResults.some(
    (c) => !c.mandatory && c.status === "not_met",
  );
  const hasAnyUnknown = criteriaResults.some(
    (c) => c.status === "unknown",
  );

  if (hasOptionalNotMet) {
    outcome = "unmet"; // "Requirement appears unmet"
  } else if (hasMandatoryNotMet) {
    outcome = "potential_blocker"; // "Potential blocker"
  } else if (hasAnyUnknown) {
    outcome = "more_information_needed"; // "More information needed"
  } else {
    outcome = "potential_match"; // "Potential match"
  }

  return {
    outcome,
    outcomeLabel: PATHWAY_OUTCOME_LABELS[outcome],
    criteriaResults,
    missingFields: Array.from(missingFieldsSet),
    sourceIds: Array.from(sourceIdsSet),
    assessedAt,
  };
}
