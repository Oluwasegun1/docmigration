import type { MatchStatus } from "./types";

/**
 * Status labels (Part 1 & Part 6).
 * Fixed precedence: Requirement appears unmet > Potential blocker > More information needed > Potential match.
 */
export const STATUS_LABELS: Record<MatchStatus, string> = {
  requirement_unmet: "Requirement appears unmet",
  potential_blocker: "Potential blocker",
  more_info_needed: "More information needed",
  potential_match: "Potential match",
};

/**
 * Outcome words per criterion (Part 6).
 */
export const CRITERION_OUTCOMES = {
  met: "Met",
  not_met: "Not met",
  unknown: "Need information",
} as const;

export type CriterionOutcomeWord =
  (typeof CRITERION_OUTCOMES)[keyof typeof CRITERION_OUTCOMES];

/**
 * User-reported answer prefix (Part 6).
 */
export const USER_REPORTED_PREFIX = "You reported:";

/**
 * Sentence templates for reason codes.
 * Every engine reason.code maps here.
 * None of the banned terms appear in these templates.
 */
export const REASON_TEMPLATES: Record<
  string,
  (params: Record<string, string | number>) => string
> = {
  exact_match: (p) => `Matches the expected value of ${p.expected}.`,
  value_in_set: (p) => `Matches one of the acceptable options (${p.options}).`,
  threshold_met: (p) =>
    `Meets the minimum requirement of ${p.threshold} with your reported ${p.actual}.`,
  max_limit_met: (p) =>
    `Within the stated limit of ${p.limit} with your reported ${p.actual}.`,
  internship_completed: () =>
    `You reported completing your supervised practice or internship period.`,
  internship_not_completed: (p) =>
    `Supervised practice or internship is required, but you reported ${p.actual}.`,
  graduation_too_old: (p) =>
    `Graduation was ${p.years} years ago, which is outside the stated ${p.limit} year window.`,
  graduation_window_met: (p) =>
    `Graduation was ${p.years} years ago, which is within the ${p.limit} year window.`,
  experience_too_low: (p) =>
    `Requires at least ${p.min} years of practice, but you reported ${p.actual}.`,
  experience_met: (p) =>
    `Your reported ${p.actual} years of practice meets the requirement.`,
  specialty_not_matched: (p) =>
    `Requires a recognized specialty, but you reported ${p.actual}.`,
  specialty_matched: (p) =>
    `Your reported specialty matches the pathway requirement.`,
  missing_answer: (p) =>
    `We need information for ${p.field} to review this requirement.`,
  unrecognized_value: (p) =>
    `The reported value for ${p.field} does not match the requirement.`,
  country_mismatch: (p) =>
    `Requires credentials from ${p.expected}, but you reported ${p.actual}.`,
  country_matched: (p) =>
    `Your reported country of ${p.actual} matches the requirement.`,
  generic_met: () => `Requirement conditions appear satisfied.`,
  generic_unmet: () => `Requirement appears unmet based on reported details.`,
  generic_unknown: (p) =>
    `Additional details needed for ${p.field || "this requirement"}.`,
};

/**
 * Formats a reason code into approved wording.
 */
export function formatReason(
  code: string,
  params: Record<string, string | number> = {}
): string {
  const template = REASON_TEMPLATES[code];
  if (!template) {
    return `Status evaluated for requirement (${code}).`;
  }
  return template(params);
}

/**
 * Route type labels (Heading level 3 context).
 */
export const ROUTE_TYPE_LABELS: Record<string, string> = {
  professional_registration: "Professional Registration",
  skilled_work: "Skilled Work",
  study: "Study and Training",
  family: "Family and Settlement",
  other: "Other Pathway",
};

/**
 * Field labels for display when prompting for missing answers.
 */
export const FIELD_LABELS: Record<string, string> = {
  currentCountry: "Country you are in",
  destinationCountry: "Destination country",
  graduationYear: "Year you graduated",
  highestQualification: "Highest educational degree",
  internshipStatus: "Supervised practice or internship status",
  careerStage: "Current career stage",
  experienceYears: "Years of experience",
  specialty: "Specialty",
  currentWorkCountry: "Country where you work now",
  timeline: "Target timeline to move",
  profession: "Profession",
  trainedCountry: "Country where you completed training",
};

/**
 * Guidance disclaimer (Mandatory Part 1 and Part 5).
 */
export const GUIDANCE_DISCLAIMER =
  "These are guidance, not an official decision. The regulator decides.";

/**
 * Summary sentence formatter.
 */
export function formatCriteriaSummary(metCount: number, totalCount: number, unknownCount: number): string {
  if (unknownCount > 0) {
    return `${metCount} of ${totalCount} criteria met, ${unknownCount} need information`;
  }
  return `${metCount} of ${totalCount} criteria met`;
}

/**
 * Formats user answer text for "You reported: {answer}".
 */
export function formatUserReported(answer: unknown): string {
  if (answer === null || answer === undefined || answer === "") {
    return `${USER_REPORTED_PREFIX} Not provided`;
  }
  if (typeof answer === "boolean") {
    return `${USER_REPORTED_PREFIX} ${answer ? "Yes" : "No"}`;
  }
  return `${USER_REPORTED_PREFIX} ${String(answer)}`;
}
