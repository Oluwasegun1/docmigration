/**
 * The ONLY fixed vocabularies in the reference layer. Professions, sectors and
 * countries are database rows and must never be modelled as enums or literal unions.
 */

/** Lifecycle of a profession or an offering (PRD 2.1). */
export const REFERENCE_STATUSES = ["live", "beta", "waitlist", "hidden"] as const;
export type ReferenceStatus = (typeof REFERENCE_STATUSES)[number];

/** Statuses that allow full onboarding. */
export const OPEN_STATUSES: readonly string[] = ["live", "beta"];

export function isOpenStatus(status: string | null | undefined): boolean {
  return status != null && OPEN_STATUSES.includes(status);
}

/** `hidden` must never appear in any API response. */
export function isPublicStatus(status: string): boolean {
  return status !== "hidden";
}

/** How a user relates to a country (PRD 2.2). */
export const COUNTRY_ROLES = ["trained_in", "practising_in", "destination"] as const;
export type CountryRole = (typeof COUNTRY_ROLES)[number];

export const DEFAULT_LOCALE = "en";
export const LOCALE_PATTERN = /^[a-z]{2,3}(-[A-Z]{2})?$/;
export const ISO2_PATTERN = /^[A-Z]{2}$/;
export const SLUG_PATTERN = /^[a-z][a-z0-9-]{1,59}$/;
