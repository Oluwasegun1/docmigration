/**
 * Single source of truth for branding, domains and support contact.
 *
 * NOTE: The word "Doctor" and the country "Nigeria" are NEVER hardcoded into branding
 * or chrome strings. They come exclusively from database reference data (profession
 * and country registries) for the current user's profile.
 */
export const brand = {
  name: "Migration Hub",
  tagline: "Plan your career move abroad with confidence",
  supportEmail: "support@migrationhub.org",
  supportDomain: "migrationhub.org",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://migrationhub.org",
  legal: {
    termsVersion: "2026-10-v1",
    privacyVersion: "2026-10-v1",
    accountRetentionDays: 30,
  },
} as const;

export type Brand = typeof brand;
