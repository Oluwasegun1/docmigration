import type { CountrySeed, SeedBundle } from "@/modules/seed/bundle";
import generated from "./countries.generated.json";
import profile from "./profile";

/**
 * Launch reference data (Stage A). Everything here is data: to launch more professions,
 * origins or destinations, add rows (see docs/reference-data.md). No application code
 * reads these values; it reads the database they are applied to.
 *
 * Launch flags: the only countries flagged for use at launch. Every other ISO country is
 * seeded with both flags off and can be turned on by a later bundle.
 */
const LAUNCH_FLAGS: Record<string, Pick<CountrySeed, "canBeOrigin" | "canBeDestination">> = {
  NG: { canBeOrigin: true },
  // PLACEHOLDER destinations: the PRD's working hypothesis, pending the selection scorecard.
  GB: { canBeDestination: true },
  IE: { canBeDestination: true },
};

const countries: CountrySeed[] = generated.map((c) => ({
  iso2: c.iso2,
  name: { en: c.name },
  callingCode: c.callingCode,
  defaultTimeZone: c.defaultTimeZone,
  defaultCurrency: c.defaultCurrency,
  ...LAUNCH_FLAGS[c.iso2],
}));

/** Additional healthcare professions to demonstrate extensible states (waitlist and hidden). */
const extraHealthcare = [
  { slug: "nurse", label: "Nurse", plural: "Nurses", sortOrder: 20, status: "waitlist" as const },
  { slug: "midwife", label: "Midwife", plural: "Midwives", sortOrder: 30, status: "hidden" as const },
  { slug: "pharmacist", label: "Pharmacist", plural: "Pharmacists", sortOrder: 40, status: "waitlist" as const },
  { slug: "dentist", label: "Dentist", plural: "Dentists", sortOrder: 50, status: "hidden" as const },
];

const bundle: SeedBundle = {
  id: "reference-launch",
  version: 1,
  sectors: [{ slug: "healthcare", label: { en: "Healthcare" }, sortOrder: 10 }],
  professions: [
    {
      slug: "doctor",
      sector: "healthcare",
      label: { en: "Doctor" },
      labelPlural: { en: "Doctors" },
      status: "live",
      isRegulated: true,
      sortOrder: 10,
    },
    ...extraHealthcare.map((p) => ({
      slug: p.slug,
      sector: "healthcare",
      label: { en: p.label },
      labelPlural: { en: p.plural },
      status: p.status,
      isRegulated: true,
      sortOrder: p.sortOrder,
    })),
  ],
  countries,
  offerings: [
    // PLACEHOLDER: destinations GB and IE are only a working hypothesis until the
    // destination-selection scorecard is complete. Do not treat them as final.
    {
      profession: "doctor",
      origin: "NG",
      destination: "GB",
      status: "beta",
      notesInternal: "PLACEHOLDER destination pending selection scorecard.",
    },
    {
      profession: "doctor",
      origin: "NG",
      destination: "IE",
      status: "beta",
      notesInternal: "PLACEHOLDER destination pending selection scorecard.",
    },
    // Hidden rows prove that later medical professions need rows only (Stage B).
    ...extraHealthcare.map((p) => ({
      profession: p.slug,
      origin: "NG",
      destination: null,
      status: "hidden" as const,
      notesInternal: "Not launched. Seeded to prove the shape.",
    })),
  ],
  ...profile,
};

export default bundle;
