import type { AssessmentEvaluation, PathwayAssessmentOutcome } from "./types";

/**
 * Outcome status tier ranking order (Rule 1).
 * 1: Potential match
 * 2: More information needed
 * 3: Potential blocker
 * 4: Requirement appears unmet
 */
export const OUTCOME_RANK_TIER: Record<PathwayAssessmentOutcome, number> = {
  potential_match: 1,
  more_information_needed: 2,
  potential_blocker: 3,
  unmet: 4,
};

export interface RankablePathwayItem {
  pathway: {
    id: string;
    slug: string;
    name: string;
    destinationCountry?: string | null;
    destination?: { code: string; name: string } | null;
    [key: string]: unknown;
  };
  evaluation: AssessmentEvaluation;
  [key: string]: unknown;
}

export interface UserRankingPreferences {
  /**
   * Ordered list of destination country codes from onboarding (e.g. ['GB', 'IE']).
   * Index 0 = 1st choice, Index 1 = 2nd choice, etc.
   */
  destinationPreferences?: string[];
}

/**
 * Deterministically ranks pathway evaluation items according to fixed Part 4 sort rules.
 * Zero scores, zero percentages, zero star ratings, zero probabilities.
 * Pure TypeScript with no database, React, or network dependencies.
 */
export function rankPathwayEvaluations<T extends RankablePathwayItem>(
  items: T[],
  preferences?: UserRankingPreferences,
): T[] {
  const preferredDestinations = preferences?.destinationPreferences ?? [];

  return [...items].sort((a, b) => {
    // 1. Status Tier Precedence (Rule 1)
    const tierA = OUTCOME_RANK_TIER[a.evaluation.outcome] ?? 99;
    const tierB = OUTCOME_RANK_TIER[b.evaluation.outcome] ?? 99;
    if (tierA !== tierB) {
      return tierA - tierB;
    }

    // 2. User Destination Preference (Rule 2)
    const destA =
      a.pathway.destinationCountry ||
      a.pathway.destination?.code ||
      "";
    const destB =
      b.pathway.destinationCountry ||
      b.pathway.destination?.code ||
      "";

    const destIndexA = preferredDestinations.indexOf(destA);
    const destIndexB = preferredDestinations.indexOf(destB);

    // If both have preference ranking, lower index wins (0 is 1st choice)
    const hasPrefA = destIndexA !== -1;
    const hasPrefB = destIndexB !== -1;

    if (hasPrefA && hasPrefB) {
      if (destIndexA !== destIndexB) {
        return destIndexA - destIndexB;
      }
    } else if (hasPrefA) {
      return -1; // Preferred destination comes first
    } else if (hasPrefB) {
      return 1;
    }

    // 3. Information Completeness (Rule 3: fewer missing fields first)
    const missingCountA = a.evaluation.missingFields?.length ?? 0;
    const missingCountB = b.evaluation.missingFields?.length ?? 0;
    if (missingCountA !== missingCountB) {
      return missingCountA - missingCountB;
    }

    // 4. Deterministic Alphabetical Tie-breaker (Rule 4)
    const nameA = a.pathway.name ?? "";
    const nameB = b.pathway.name ?? "";
    return nameA.localeCompare(nameB);
  });
}
