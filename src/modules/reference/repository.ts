import type { PrismaClient } from "@prisma/client";
import { DEFAULT_LOCALE } from "./constants";

export type SectorRow = { slug: string; labelKey: string; sortOrder: number };

export type ProfessionRow = {
  code: string;
  name: string;
  sectorId: string | null;
  labelKey: string | null;
  labelPluralKey: string | null;
  status: string;
  isRegulated: boolean;
  sortOrder: number;
};

export type CountryRow = {
  code: string;
  name: string;
  nameKey: string | null;
  callingCode: string | null;
  canBeOrigin: boolean;
  canBeDestination: boolean;
};

export type OfferingRow = {
  professionCode: string;
  originCountry: string;
  destinationCountry: string | null;
  status: string;
};

export type LabelRow = { key: string; locale: string; text: string };

/** Read-side port for reference data. Implemented by Prisma and by an in-memory fake. */
export interface ReferenceRepository {
  listSectors(): Promise<SectorRow[]>;
  listProfessions(): Promise<ProfessionRow[]>;
  listCountries(): Promise<CountryRow[]>;
  listOfferings(): Promise<OfferingRow[]>;
  getLabels(keys: string[], locales: string[]): Promise<LabelRow[]>;
}

export function createPrismaReferenceRepository(db: PrismaClient): ReferenceRepository {
  return {
    listSectors: () =>
      db.sector.findMany({
        select: { slug: true, labelKey: true, sortOrder: true },
        orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
      }),
    listProfessions: () =>
      db.profession.findMany({
        select: {
          code: true,
          name: true,
          sectorId: true,
          labelKey: true,
          labelPluralKey: true,
          status: true,
          isRegulated: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
      }),
    listCountries: () =>
      db.country.findMany({
        select: {
          code: true,
          name: true,
          nameKey: true,
          callingCode: true,
          canBeOrigin: true,
          canBeDestination: true,
        },
      }),
    listOfferings: () =>
      db.offering.findMany({
        select: {
          professionCode: true,
          originCountry: true,
          destinationCountry: true,
          status: true,
        },
      }),
    getLabels: (keys, locales) =>
      keys.length === 0
        ? Promise.resolve([])
        : db.referenceLabel.findMany({
            where: { key: { in: keys }, locale: { in: locales } },
            select: { key: true, locale: true, text: true },
          }),
  };
}

/**
 * Resolves localised text for reference keys, falling back to the default locale and
 * finally to the caller-provided fallback (or the key itself).
 */
export async function createLabelResolver(
  repo: Pick<ReferenceRepository, "getLabels">,
  keys: Iterable<string | null | undefined>,
  locale: string,
): Promise<(key: string | null | undefined, fallback?: string) => string> {
  const unique = [...new Set([...keys].filter((k): k is string => !!k))];
  const locales = locale === DEFAULT_LOCALE ? [locale] : [locale, DEFAULT_LOCALE];
  const rows = await repo.getLabels(unique, locales);
  const byKey = new Map<string, Map<string, string>>();
  for (const r of rows) {
    const m = byKey.get(r.key) ?? new Map<string, string>();
    m.set(r.locale, r.text);
    byKey.set(r.key, m);
  }
  return (key, fallback) => {
    if (!key) return fallback ?? "";
    const m = byKey.get(key);
    return m?.get(locale) ?? m?.get(DEFAULT_LOCALE) ?? fallback ?? key;
  };
}
