import type { CriterionEvaluationStatus, RuleOperator } from "./types";

/**
 * Pure operator evaluator for screening criteria.
 * Strict, deterministic, with 3-valued logic (met, not_met, unknown).
 */
export function evaluateOperator(
  operator: RuleOperator,
  userValue: unknown,
  expected: unknown,
): CriterionEvaluationStatus {
  // Missing or unknown value handling
  const isMissing =
    userValue === undefined ||
    userValue === null ||
    userValue === "" ||
    userValue === "unknown";

  // Operators that can evaluate presence directly
  if (operator === "exists") {
    return !isMissing ? "met" : "not_met";
  }

  if (operator === "not_exists") {
    return isMissing ? "met" : "not_met";
  }

  // If user value is missing for standard operators, result is unknown (never guess)
  if (isMissing) {
    return "unknown";
  }

  switch (operator) {
    case "equals": {
      if (typeof userValue === "string" && typeof expected === "string") {
        return userValue.trim().toLowerCase() === expected.trim().toLowerCase()
          ? "met"
          : "not_met";
      }
      return userValue === expected ? "met" : "not_met";
    }

    case "not_equals": {
      if (typeof userValue === "string" && typeof expected === "string") {
        return userValue.trim().toLowerCase() !== expected.trim().toLowerCase()
          ? "met"
          : "not_met";
      }
      return userValue !== expected ? "met" : "not_met";
    }

    case "in": {
      if (!Array.isArray(expected)) {
        return "unknown";
      }
      if (typeof userValue === "string") {
        const normalized = userValue.trim().toLowerCase();
        const found = expected.some(
          (item) => typeof item === "string" && item.trim().toLowerCase() === normalized,
        );
        return found ? "met" : "not_met";
      }
      return expected.includes(userValue) ? "met" : "not_met";
    }

    case "not_in": {
      if (!Array.isArray(expected)) {
        return "unknown";
      }
      if (typeof userValue === "string") {
        const normalized = userValue.trim().toLowerCase();
        const found = expected.some(
          (item) => typeof item === "string" && item.trim().toLowerCase() === normalized,
        );
        return !found ? "met" : "not_met";
      }
      return !expected.includes(userValue) ? "met" : "not_met";
    }

    case "gte": {
      const numUser = Number(userValue);
      const numExpected = Number(expected);
      if (Number.isNaN(numUser) || Number.isNaN(numExpected)) return "unknown";
      return numUser >= numExpected ? "met" : "not_met";
    }

    case "lte": {
      const numUser = Number(userValue);
      const numExpected = Number(expected);
      if (Number.isNaN(numUser) || Number.isNaN(numExpected)) return "unknown";
      return numUser <= numExpected ? "met" : "not_met";
    }

    case "gt": {
      const numUser = Number(userValue);
      const numExpected = Number(expected);
      if (Number.isNaN(numUser) || Number.isNaN(numExpected)) return "unknown";
      return numUser > numExpected ? "met" : "not_met";
    }

    case "lt": {
      const numUser = Number(userValue);
      const numExpected = Number(expected);
      if (Number.isNaN(numUser) || Number.isNaN(numExpected)) return "unknown";
      return numUser < numExpected ? "met" : "not_met";
    }

    default:
      return "unknown";
  }
}
