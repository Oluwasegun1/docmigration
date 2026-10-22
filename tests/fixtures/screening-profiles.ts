import type { CriterionRule, PathwayAssessmentOutcome } from "@/modules/engine/rules/types";

export interface FixtureProfileCase {
  id: string;
  name: string;
  description: string;
  profileAnswers: Record<string, unknown>;
  expectedOutcome: PathwayAssessmentOutcome;
  expectedOutcomeLabel: string;
  expectedMissingFields: string[];
  expectedMetCount: number;
  expectedNotMetCount: number;
  expectedUnknownCount: number;
  signedOffBy: string;
  signedOffDate: string;
}

export const FIXTURE_CRITERIA: CriterionRule[] = [
  {
    id: "crit-origin-country",
    key: "qualification_country",
    profileField: "qualificationCountry",
    operator: "equals",
    expected: "XA",
    mandatory: true,
    sourceId: "src-official-regulator",
    explanationKey: "criteria.qualification_country.explanation",
    verifiedAt: "2026-10-01T00:00:00Z",
    isPlaceholder: true,
  },
  {
    id: "crit-min-experience",
    key: "min_experience_years",
    profileField: "yearsOfExperience",
    operator: "gte",
    expected: 2,
    mandatory: true,
    sourceId: "src-official-regulator",
    explanationKey: "criteria.min_experience.explanation",
    verifiedAt: "2026-10-01T00:00:00Z",
    isPlaceholder: true,
  },
  {
    id: "crit-internship",
    key: "internship_completed",
    profileField: "internshipStatus",
    operator: "equals",
    expected: "completed",
    mandatory: true,
    sourceId: "src-official-regulator",
    explanationKey: "criteria.internship.explanation",
    verifiedAt: "2026-10-01T00:00:00Z",
    isPlaceholder: true,
  },
  {
    id: "crit-postgrad-specialty",
    key: "specialty_board_certified",
    profileField: "hasSpecialtyBoard",
    operator: "equals",
    expected: true,
    mandatory: false, // Optional criterion
    sourceId: "src-official-regulator",
    explanationKey: "criteria.specialty.explanation",
    verifiedAt: "2026-10-01T00:00:00Z",
    isPlaceholder: true,
  },
];

export const FIXTURE_PROFILES: FixtureProfileCase[] = [
  {
    id: "profile-perfect-match",
    name: "Fully qualified applicant",
    description: "Meets all mandatory and optional criteria",
    profileAnswers: {
      qualificationCountry: "XA",
      yearsOfExperience: 5,
      internshipStatus: "completed",
      hasSpecialtyBoard: true,
    },
    expectedOutcome: "potential_match",
    expectedOutcomeLabel: "Potential match",
    expectedMissingFields: [],
    expectedMetCount: 4,
    expectedNotMetCount: 0,
    expectedUnknownCount: 0,
    signedOffBy: "content-reviewer-1",
    signedOffDate: "2026-10-17",
  },
  {
    id: "profile-mandatory-unmet",
    name: "Insufficient experience",
    description: "Mandatory experience criterion is unmet -> Potential blocker",
    profileAnswers: {
      qualificationCountry: "XA",
      yearsOfExperience: 1, // requires >= 2
      internshipStatus: "completed",
      hasSpecialtyBoard: true,
    },
    expectedOutcome: "potential_blocker",
    expectedOutcomeLabel: "Potential blocker",
    expectedMissingFields: [],
    expectedMetCount: 3,
    expectedNotMetCount: 1,
    expectedUnknownCount: 0,
    signedOffBy: "content-reviewer-1",
    signedOffDate: "2026-10-17",
  },
  {
    id: "profile-optional-unmet",
    name: "Meets mandatory but lacks optional specialty",
    description: "Optional criterion unmet -> Requirement appears unmet",
    profileAnswers: {
      qualificationCountry: "XA",
      yearsOfExperience: 3,
      internshipStatus: "completed",
      hasSpecialtyBoard: false, // optional unmet
    },
    expectedOutcome: "unmet",
    expectedOutcomeLabel: "Requirement appears unmet",
    expectedMissingFields: [],
    expectedMetCount: 3,
    expectedNotMetCount: 1,
    expectedUnknownCount: 0,
    signedOffBy: "content-reviewer-1",
    signedOffDate: "2026-10-17",
  },
  {
    id: "profile-missing-facts",
    name: "Partial profile",
    description: "Missing mandatory internship status -> More information needed",
    profileAnswers: {
      qualificationCountry: "XA",
      yearsOfExperience: 4,
      // internshipStatus missing
      hasSpecialtyBoard: true,
    },
    expectedOutcome: "more_information_needed",
    expectedOutcomeLabel: "More information needed",
    expectedMissingFields: ["internshipStatus"],
    expectedMetCount: 3,
    expectedNotMetCount: 0,
    expectedUnknownCount: 1,
    signedOffBy: "content-reviewer-1",
    signedOffDate: "2026-10-17",
  },
  {
    id: "profile-empty",
    name: "Empty profile",
    description: "No answers -> More information needed with all missing fields",
    profileAnswers: {},
    expectedOutcome: "more_information_needed",
    expectedOutcomeLabel: "More information needed",
    expectedMissingFields: [
      "qualificationCountry",
      "yearsOfExperience",
      "internshipStatus",
      "hasSpecialtyBoard",
    ],
    expectedMetCount: 0,
    expectedNotMetCount: 0,
    expectedUnknownCount: 4,
    signedOffBy: "content-reviewer-1",
    signedOffDate: "2026-10-17",
  },
];
