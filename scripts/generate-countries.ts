/**
 * One-off generator for seed/reference/countries.generated.json (full ISO 3166-1 list).
 * The output is committed; re-run only to refresh from the upstream data packages:
 *   pnpm exec tsx scripts/generate-countries.ts
 *
 * Calling codes, currencies and time zones are DEFAULTS for convenience (first value
 * where a country has several). They are not authoritative and are never used for
 * eligibility or regulatory logic.
 */
import { writeFileSync } from "node:fs";
import { countries } from "countries-list";
import { getCountry } from "countries-and-timezones";

// Not ISO 3166-1 officially assigned (kept out so the table is exactly the ISO list).
const NOT_ISO = new Set(["XK", "AC", "TA", "CP", "DG", "EA", "IC", "EU", "UN"]);

const names = new Intl.DisplayNames(["en"], { type: "region" });

const rows = Object.entries(countries)
  .filter(([iso2]) => !NOT_ISO.has(iso2))
  .map(([iso2, c]) => ({
    iso2,
    name: names.of(iso2) ?? c.name,
    callingCode: c.phone[0] ? `+${c.phone[0]}` : null,
    defaultTimeZone: getCountry(iso2)?.timezones[0] ?? null,
    defaultCurrency: c.currency[0] ?? null,
  }))
  .sort((a, b) => a.iso2.localeCompare(b.iso2));

writeFileSync(
  new URL("../seed/reference/countries.generated.json", import.meta.url),
  JSON.stringify(rows, null, 2) + "\n",
);
console.log(`wrote ${rows.length} countries`);
