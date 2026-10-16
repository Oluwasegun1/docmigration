import type { SeedBundle } from "@/modules/seed/bundle";

/**
 * TEST FIXTURE ONLY. Never applied by default and refused when APP_ENV=production.
 *
 * Proves the extensibility claim: a fictional UNREGULATED profession, a fictional origin
 * country and a fictional destination country become fully usable in the sign-up wizard
 * through rows alone, with zero application code changes. Country codes XA and XB are
 * ISO 3166-1 user-assigned codes and cannot clash with real countries.
 *
 * Apply after the launch bundle (it reuses shared fields such as yearsOfExperience):
 *   pnpm seed:reference --with seed/fixtures/test-profession
 */
const bundle: SeedBundle = {
  id: "fixture-test-profession",
  version: 1,
  sectors: [{ slug: "test-sector", label: { en: "Test sector" }, sortOrder: 900 }],
  professions: [
    {
      slug: "test-profession",
      sector: "test-sector",
      label: { en: "Test professional" },
      labelPlural: { en: "Test professionals" },
      status: "live",
      isRegulated: false,
      sortOrder: 900,
    },
  ],
  countries: [
    { iso2: "XA", name: { en: "Testland Origin" }, callingCode: "+999", defaultTimeZone: "Etc/UTC", defaultCurrency: "XTS", canBeOrigin: true },
    { iso2: "XB", name: { en: "Testland Destination" }, callingCode: "+998", defaultTimeZone: "Etc/UTC", defaultCurrency: "XTS", canBeDestination: true },
  ],
  offerings: [{ profession: "test-profession", origin: "XA", destination: "XB", status: "beta", notesInternal: "Fixture." }],
  fields: [
    {
      key: "testSkill",
      type: "text",
      label: { en: "Main skill" },
      whyAsked: { en: "Fixture field used to prove profession-specific fields need no code." },
      category: "career",
      purposeNote: "Fixture only.",
    },
    {
      // Never placed in an unregulated schema; exists so tests can prove the guard rejects it.
      key: "testRegistrationNumber",
      type: "text",
      label: { en: "Registration number" },
      whyAsked: { en: "Fixture field used to test the registration guard." },
      category: "registration",
      purposeNote: "Fixture only. Must never appear in an unregulated profession's schema.",
    },
  ],
  stepTitles: { "fixture-about": { en: "About your work" } },
  schemas: [
    {
      profession: "test-profession",
      origin: "XA",
      version: 1,
      steps: [
        {
          key: "fixture-about",
          fields: [{ key: "yearsOfExperience", required: true }, { key: "testSkill" }],
        },
      ],
    },
  ],
};

export default bundle;
