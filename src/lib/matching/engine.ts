import type {
  AnswerKey,
  CriterionOperator,
  CriterionResult,
  EvaluationResult,
  MatchProfile,
  MatchResult,
  MatchStatus,
  PublishedPathway,
  PublishedRequirement,
  RouteType,
} from "./types";

export const ENGINE_VERSION = "2026.10.1";

const STATUS_RANK: Record<MatchStatus, number> = {
  potential_match: 1,
  more_info_needed: 2,
  potential_blocker: 3,
  requirement_unmet: 4,
};

const ROUTE_TYPE_ORDER: Record<RouteType, number> = {
  professional_registration: 1,
  skilled_work: 2,
  study: 3,
  family: 4,
  other: 5,
};

/**
 * Pure evaluation function.
 * Deterministic: identical input yields byte-identical output.
 */
export function evaluateMatches(
  profile: MatchProfile,
  pathways: PublishedPathway[],
  now: Date
): EvaluationResult {
  const currentYear = now.getFullYear();

  // Rule 1: Evaluate only pathways whose source country matches origin and destination matches destination
  // and only published versions.
  const applicablePathways = pathways.filter((p) => {
    if (p.status !== "published") return false;
    const originMatch =
      p.sourceCountry === profile.currentCountry ||
      (profile.trainedCountry && p.sourceCountry === profile.trainedCountry);
    const destMatch = p.destinationCountry === profile.destinationCountry;
    return originMatch && destMatch;
  });

  const evaluatedResults: MatchResult[] = applicablePathways.map((pathway) => {
    const missingSet = new Set<AnswerKey>();
    const criteriaResults: CriterionResult[] = pathway.requirements.map(
      (requirement) => {
        const result = evaluateRequirement(requirement, profile, currentYear);
        if (result.outcome === "unknown") {
          for (const key of requirement.usedAnswers) {
            const val = profile[key];
            if (val === null || val === undefined || val === "") {
              missingSet.add(key);
            }
          }
        }
        return result;
      }
    );

    // Rule 4: Status is the worst outcome across criteria.
    // Precedence:
    // 1. required criterion is not_met -> requirement_unmet
    // 2. may_block criterion is not_met -> potential_blocker
    // 3. any unknown -> more_info_needed
    // 4. all met -> potential_match
    let status: MatchStatus = "potential_match";

    const hasRequiredNotMet = criteriaResults.some(
      (c) => c.severity === "required" && c.outcome === "not_met"
    );
    const hasMayBlockNotMet = criteriaResults.some(
      (c) => c.severity === "may_block" && c.outcome === "not_met"
    );
    const hasUnknown = criteriaResults.some((c) => c.outcome === "unknown");

    if (hasRequiredNotMet) {
      status = "requirement_unmet";
    } else if (hasMayBlockNotMet) {
      status = "potential_blocker";
    } else if (hasUnknown) {
      status = "more_info_needed";
    } else {
      status = "potential_match";
    }

    // Timeline note (Rule 6): does not change status or order; adds note if typical duration exists
    let timelineNote: string | null = null;
    if (pathway.typicalDurationMonths && profile.timeline) {
      timelineNote = `Typical route duration is approximately ${pathway.typicalDurationMonths} months.`;
    }

    return {
      pathwayId: pathway.id,
      pathwayVersionId: pathway.versionId,
      slug: pathway.slug,
      title: pathway.title,
      routeType: pathway.routeType,
      status,
      criteria: criteriaResults,
      missing: Array.from(missingSet),
      typicalDurationMonths: pathway.typicalDurationMonths ?? null,
      timelineNote,
      publishedAt: pathway.publishedAt,
    };
  });

  // Rule 6: Order results by:
  // 1. Status (Potential match > More info needed > Potential blocker > Requirement appears unmet)
  // 2. Fewer unknown criteria
  // 3. Route type (professional_registration > skilled_work > study > family > other)
  // 4. Title A to Z
  // 5. Pathway ID
  evaluatedResults.sort((a, b) => {
    // 1. Status rank
    const statusDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (statusDiff !== 0) return statusDiff;

    // 2. Fewer unknown criteria
    const aUnknowns = a.criteria.filter((c) => c.outcome === "unknown").length;
    const bUnknowns = b.criteria.filter((c) => c.outcome === "unknown").length;
    if (aUnknowns !== bUnknowns) return aUnknowns - bUnknowns;

    // 3. Route type
    const aRoute = ROUTE_TYPE_ORDER[a.routeType] ?? 99;
    const bRoute = ROUTE_TYPE_ORDER[b.routeType] ?? 99;
    if (aRoute !== bRoute) return aRoute - bRoute;

    // 4. Title A to Z
    const titleDiff = a.title.localeCompare(b.title);
    if (titleDiff !== 0) return titleDiff;

    // 5. Pathway ID
    return a.pathwayId.localeCompare(b.pathwayId);
  });

  return {
    engineVersion: ENGINE_VERSION,
    evaluatedAt: now.toISOString(),
    results: evaluatedResults,
  };
}

/**
 * Evaluates a single requirement against the profile.
 * Inclusive thresholds (Rule 2).
 * Missing answer -> unknown (Rule 3).
 * Returns reason code + params only (Rule 5).
 */
function evaluateRequirement(
  req: PublishedRequirement,
  profile: MatchProfile,
  currentYear: number
): CriterionResult {
  // Check if any used answer is missing
  for (const answerKey of req.usedAnswers) {
    const val = profile[answerKey];
    if (val === null || val === undefined || val === "") {
      return {
        requirementId: req.id,
        key: req.key,
        label: req.label,
        severity: req.severity,
        outcome: "unknown",
        reason: {
          code: "missing_answer",
          params: { field: answerKey },
        },
        usedAnswers: req.usedAnswers,
        source: req.source,
      };
    }
  }

  const primaryKey = req.usedAnswers[0];
  const userValue = profile[primaryKey];

  const evalResult = compareValues(
    req.operator,
    userValue,
    req.expectedValue,
    currentYear,
    primaryKey
  );

  return {
    requirementId: req.id,
    key: req.key,
    label: req.label,
    severity: req.severity,
    outcome: evalResult.outcome,
    reason: evalResult.reason,
    usedAnswers: req.usedAnswers,
    source: req.source,
  };
}

function compareValues(
  operator: CriterionOperator,
  actual: unknown,
  expected: unknown,
  currentYear: number,
  fieldKey: string
): {
  outcome: "met" | "not_met" | "unknown";
  reason: { code: string; params: Record<string, string | number> };
} {
  switch (operator) {
    case "equals": {
      const isMet = actual === expected;
      if (fieldKey === "internshipStatus") {
        return {
          outcome: isMet ? "met" : "not_met",
          reason: {
            code: isMet ? "internship_completed" : "internship_not_completed",
            params: { actual: String(actual), expected: String(expected) },
          },
        };
      }
      return {
        outcome: isMet ? "met" : "not_met",
        reason: {
          code: isMet ? "exact_match" : "country_mismatch",
          params: { actual: String(actual), expected: String(expected) },
        },
      };
    }

    case "not_equals": {
      const isMet = actual !== expected;
      return {
        outcome: isMet ? "met" : "not_met",
        reason: {
          code: isMet ? "generic_met" : "unrecognized_value",
          params: { actual: String(actual), field: fieldKey },
        },
      };
    }

    case "in": {
      const arr = Array.isArray(expected) ? expected : [expected];
      const isMet = arr.includes(actual);
      if (fieldKey === "specialty") {
        return {
          outcome: isMet ? "met" : "not_met",
          reason: {
            code: isMet ? "specialty_matched" : "specialty_not_matched",
            params: { actual: String(actual) },
          },
        };
      }
      return {
        outcome: isMet ? "met" : "not_met",
        reason: {
          code: isMet ? "value_in_set" : "unrecognized_value",
          params: { actual: String(actual), options: arr.join(", "), field: fieldKey },
        },
      };
    }

    case "not_in": {
      const arr = Array.isArray(expected) ? expected : [expected];
      const isMet = !arr.includes(actual);
      return {
        outcome: isMet ? "met" : "not_met",
        reason: {
          code: isMet ? "generic_met" : "unrecognized_value",
          params: { actual: String(actual), field: fieldKey },
        },
      };
    }

    case "gte": {
      // Inclusive threshold (Rule 2)
      const numActual = Number(actual);
      const numExpected = Number(expected);
      const isMet = numActual >= numExpected;
      if (fieldKey === "experienceYears") {
        return {
          outcome: isMet ? "met" : "not_met",
          reason: {
            code: isMet ? "experience_met" : "experience_too_low",
            params: { actual: numActual, min: numExpected },
          },
        };
      }
      return {
        outcome: isMet ? "met" : "not_met",
        reason: {
          code: isMet ? "threshold_met" : "experience_too_low",
          params: { actual: numActual, threshold: numExpected, min: numExpected },
        },
      };
    }

    case "lte": {
      // Inclusive threshold
      const numActual = Number(actual);
      const numExpected = Number(expected);
      const isMet = numActual <= numExpected;
      return {
        outcome: isMet ? "met" : "not_met",
        reason: {
          code: isMet ? "max_limit_met" : "unrecognized_value",
          params: { actual: numActual, limit: numExpected, field: fieldKey },
        },
      };
    }

    case "gt": {
      const isMet = Number(actual) > Number(expected);
      return {
        outcome: isMet ? "met" : "not_met",
        reason: {
          code: isMet ? "generic_met" : "generic_unmet",
          params: { actual: String(actual), field: fieldKey },
        },
      };
    }

    case "lt": {
      const isMet = Number(actual) < Number(expected);
      return {
        outcome: isMet ? "met" : "not_met",
        reason: {
          code: isMet ? "generic_met" : "generic_unmet",
          params: { actual: String(actual), field: fieldKey },
        },
      };
    }

    case "max_years_since": {
      // e.g. graduation within 5 years: (currentYear - graduationYear) <= limit (inclusive)
      const gradYear = Number(actual);
      const limit = Number(expected);
      const yearsAgo = currentYear - gradYear;
      const isMet = yearsAgo <= limit;
      return {
        outcome: isMet ? "met" : "not_met",
        reason: {
          code: isMet ? "graduation_window_met" : "graduation_too_old",
          params: { years: yearsAgo, limit },
        },
      };
    }

    case "min_years_since": {
      const gradYear = Number(actual);
      const limit = Number(expected);
      const yearsAgo = currentYear - gradYear;
      const isMet = yearsAgo >= limit;
      return {
        outcome: isMet ? "met" : "not_met",
        reason: {
          code: isMet ? "generic_met" : "generic_unmet",
          params: { years: yearsAgo, limit },
        },
      };
    }

    default:
      return {
        outcome: "unknown",
        reason: {
          code: "generic_unknown",
          params: { field: fieldKey },
        },
      };
  }
}
