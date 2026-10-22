import { describe, expect, it } from "vitest";
import {
  rankPathwayEvaluations,
  type RankablePathwayItem,
} from "@/modules/engine/rules/rank";
import type { AssessmentEvaluation } from "@/modules/engine/rules/types";

function mockEvaluation(
  outcome: AssessmentEvaluation["outcome"],
  missingFields: string[] = [],
): AssessmentEvaluation {
  return {
    outcome,
    outcomeLabel: outcome,
    criteriaResults: [],
    missingFields,
    sourceIds: ["src-1"],
    assessedAt: "2026-10-19T00:00:00.000Z",
  };
}

describe("Part 4 Deterministic Ranking Engine", () => {
  it("Rule 1: Sorts strictly by status tier precedence (potential_match > more_information_needed > potential_blocker > unmet)", () => {
    const items: RankablePathwayItem[] = [
      {
        pathway: { id: "p1", slug: "p1", name: "Pathway A", destinationCountry: "GB" },
        evaluation: mockEvaluation("unmet"),
      },
      {
        pathway: { id: "p2", slug: "p2", name: "Pathway B", destinationCountry: "GB" },
        evaluation: mockEvaluation("potential_match"),
      },
      {
        pathway: { id: "p3", slug: "p3", name: "Pathway C", destinationCountry: "GB" },
        evaluation: mockEvaluation("potential_blocker"),
      },
      {
        pathway: { id: "p4", slug: "p4", name: "Pathway D", destinationCountry: "GB" },
        evaluation: mockEvaluation("more_information_needed"),
      },
    ];

    const ranked = rankPathwayEvaluations(items);
    expect(ranked.map((r) => r.evaluation.outcome)).toEqual([
      "potential_match",
      "more_information_needed",
      "potential_blocker",
      "unmet",
    ]);
  });

  it("Rule 2: Respects user destination preference within the same status tier", () => {
    const items: RankablePathwayItem[] = [
      {
        pathway: { id: "p-ie", slug: "ie-route", name: "Ireland Route", destinationCountry: "IE" },
        evaluation: mockEvaluation("potential_match"),
      },
      {
        pathway: { id: "p-ca", slug: "ca-route", name: "Canada Route", destinationCountry: "CA" },
        evaluation: mockEvaluation("potential_match"),
      },
      {
        pathway: { id: "p-gb", slug: "gb-route", name: "UK Route", destinationCountry: "GB" },
        evaluation: mockEvaluation("potential_match"),
      },
    ];

    // User ranked GB as 1st preference, IE as 2nd
    const ranked = rankPathwayEvaluations(items, {
      destinationPreferences: ["GB", "IE"],
    });

    expect(ranked.map((r) => r.pathway.destinationCountry)).toEqual(["GB", "IE", "CA"]);
  });

  it("Rule 3: Breaks ties with information completeness (fewer missing fields first)", () => {
    const items: RankablePathwayItem[] = [
      {
        pathway: { id: "p1", slug: "p1", name: "Route Many Unknowns", destinationCountry: "GB" },
        evaluation: mockEvaluation("more_information_needed", ["f1", "f2", "f3"]),
      },
      {
        pathway: { id: "p2", slug: "p2", name: "Route One Unknown", destinationCountry: "GB" },
        evaluation: mockEvaluation("more_information_needed", ["f1"]),
      },
    ];

    const ranked = rankPathwayEvaluations(items, {
      destinationPreferences: ["GB"],
    });

    expect(ranked.map((r) => r.pathway.name)).toEqual([
      "Route One Unknown",
      "Route Many Unknowns",
    ]);
  });

  it("Rule 4: Breaks ties deterministically alphabetically by pathway name", () => {
    const items: RankablePathwayItem[] = [
      {
        pathway: { id: "p2", slug: "p2", name: "Zebra Route", destinationCountry: "GB" },
        evaluation: mockEvaluation("potential_match"),
      },
      {
        pathway: { id: "p1", slug: "p1", name: "Alpha Route", destinationCountry: "GB" },
        evaluation: mockEvaluation("potential_match"),
      },
    ];

    const ranked = rankPathwayEvaluations(items, {
      destinationPreferences: ["GB"],
    });

    expect(ranked.map((r) => r.pathway.name)).toEqual(["Alpha Route", "Zebra Route"]);
  });

  it("Contains no scores, percentages, star ratings or match strength metrics", () => {
    const items: RankablePathwayItem[] = [
      {
        pathway: { id: "p1", slug: "p1", name: "Route", destinationCountry: "GB" },
        evaluation: mockEvaluation("potential_match"),
      },
    ];

    const ranked = rankPathwayEvaluations(items);
    const first = ranked[0];

    expect(first).not.toHaveProperty("score");
    expect(first).not.toHaveProperty("percentage");
    expect(first).not.toHaveProperty("stars");
    expect(first).not.toHaveProperty("probability");
    expect(first).not.toHaveProperty("matchStrength");
  });
});
