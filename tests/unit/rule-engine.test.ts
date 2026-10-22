import { describe, expect, it } from "vitest";
import { evaluateCriteria } from "@/modules/engine/rules/evaluate";
import { evaluateOperator } from "@/modules/engine/rules/operators";
import {
  CRITERION_LABELS,
  PATHWAY_OUTCOME_LABELS,
} from "@/modules/engine/rules/types";
import {
  FIXTURE_CRITERIA,
  FIXTURE_PROFILES,
} from "../fixtures/screening-profiles";

describe("Rule Engine - Table-driven Signed-off Fixtures", () => {
  it.each(FIXTURE_PROFILES)(
    "evaluates $name correctly ($expectedOutcomeLabel)",
    (fixtureCase) => {
      const evaluation = evaluateCriteria(
        FIXTURE_CRITERIA,
        fixtureCase.profileAnswers,
      );

      // Verify outcome code and exact label wording
      expect(evaluation.outcome).toBe(fixtureCase.expectedOutcome);
      expect(evaluation.outcomeLabel).toBe(fixtureCase.expectedOutcomeLabel);

      // Verify criteria counts
      const met = evaluation.criteriaResults.filter((c) => c.status === "met");
      const notMet = evaluation.criteriaResults.filter((c) => c.status === "not_met");
      const unknown = evaluation.criteriaResults.filter((c) => c.status === "unknown");

      expect(met.length).toBe(fixtureCase.expectedMetCount);
      expect(notMet.length).toBe(fixtureCase.expectedNotMetCount);
      expect(unknown.length).toBe(fixtureCase.expectedUnknownCount);

      // Verify missing fields
      expect(evaluation.missingFields.sort()).toEqual(
        fixtureCase.expectedMissingFields.sort(),
      );

      // Verify all used source IDs are collected
      expect(evaluation.sourceIds).toContain("src-official-regulator");
    },
  );
});

describe("Rule Engine - Wording Guardrails", () => {
  it("uses exact PRD-mandated tentative labels and never deterministic verdict wording", () => {
    expect(PATHWAY_OUTCOME_LABELS.potential_match).toBe("Potential match");
    expect(PATHWAY_OUTCOME_LABELS.more_information_needed).toBe("More information needed");
    expect(PATHWAY_OUTCOME_LABELS.potential_blocker).toBe("Potential blocker");
    expect(PATHWAY_OUTCOME_LABELS.unmet).toBe("Requirement appears unmet");

    expect(CRITERION_LABELS.met).toBe("Met");
    expect(CRITERION_LABELS.not_met).toBe("Requirement appears unmet");
    expect(CRITERION_LABELS.unknown).toBe("More information needed");

    // Guardrail: Ensure no verdict language
    for (const label of Object.values(PATHWAY_OUTCOME_LABELS)) {
      expect(label.toLowerCase()).not.toContain("guarantee");
      expect(label.toLowerCase()).not.toContain("will qualify");
      expect(label.toLowerCase()).not.toContain("accepted");
      expect(label.toLowerCase()).not.toContain("verdict");
    }
  });
});

describe("Rule Engine - Operators", () => {
  it("evaluates equals with case-insensitivity for strings", () => {
    expect(evaluateOperator("equals", "doctor", "Doctor")).toBe("met");
    expect(evaluateOperator("equals", "doctor", "nurse")).toBe("not_met");
  });

  it("evaluates in / not_in correctly", () => {
    expect(evaluateOperator("in", "XA", ["XA", "XB"])).toBe("met");
    expect(evaluateOperator("in", "XC", ["XA", "XB"])).toBe("not_met");
    expect(evaluateOperator("not_in", "XC", ["XA", "XB"])).toBe("met");
  });

  it("evaluates numeric operators gte / lte / gt / lt", () => {
    expect(evaluateOperator("gte", 5, 2)).toBe("met");
    expect(evaluateOperator("gte", 1, 2)).toBe("not_met");
    expect(evaluateOperator("lte", 2, 5)).toBe("met");
    expect(evaluateOperator("gt", 5, 5)).toBe("not_met");
    expect(evaluateOperator("lt", 4, 5)).toBe("met");
  });

  it("returns unknown when user value is missing or unknown", () => {
    expect(evaluateOperator("equals", undefined, "doctor")).toBe("unknown");
    expect(evaluateOperator("equals", null, "doctor")).toBe("unknown");
    expect(evaluateOperator("equals", "", "doctor")).toBe("unknown");
    expect(evaluateOperator("equals", "unknown", "doctor")).toBe("unknown");
    expect(evaluateOperator("gte", undefined, 2)).toBe("unknown");
  });

  it("evaluates exists and not_exists directly even when value is null/undefined", () => {
    expect(evaluateOperator("exists", "Unilag", null)).toBe("met");
    expect(evaluateOperator("exists", null, null)).toBe("not_met");
    expect(evaluateOperator("not_exists", null, null)).toBe("met");
    expect(evaluateOperator("not_exists", "Unilag", null)).toBe("not_met");
  });
});
