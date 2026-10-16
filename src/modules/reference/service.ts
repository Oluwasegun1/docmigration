import { AppError } from "@/lib/errors";
import { isOpenStatus, isPublicStatus, type CountryRole } from "./constants";
import {
  createLabelResolver,
  type CountryRow,
  type OfferingRow,
  type ProfessionRow,
  type ReferenceRepository,
} from "./repository";

export type PublicSector = { slug: string; labelKey: string; label: string };

export type PublicProfession = {
  slug: string;
  sector: string | null;
  labelKey: string | null;
  label: string;
  labelPluralKey: string | null;
  labelPlural: string;
  status: string;
  isRegulated: boolean;
  /** True when status allows full onboarding (live or beta). Computed server-side. */
  canOnboard: boolean;
};

export type PublicCountry = {
  code: string;
  labelKey: string;
  label: string;
  callingCode: string | null;
  /**
   * Whether the requested (profession, origin[, destination]) combination is launched.
   * null = not evaluated (no profession context supplied). Clients treat this as opaque.
   */
  supported: boolean | null;
};

export type PublicOffering = {
  profession: string;
  origin: string;
  destination: string | null;
  status: string;
};

/**
 * Most specific offering row wins: an explicit (profession, origin, destination) row
 * overrides the "any destination" (destination = null) row, so a single destination can
 * be switched off without touching the origin-level launch.
 */
export function resolveOfferingStatus(
  offerings: readonly OfferingRow[],
  profession: string,
  origin: string,
  destination: string | null,
): string | undefined {
  const scoped = offerings.filter(
    (o) => o.professionCode === profession && o.originCountry === origin,
  );
  if (destination) {
    const exact = scoped.find((o) => o.destinationCountry === destination);
    if (exact) return exact.status;
  }
  return scoped.find((o) => o.destinationCountry === null)?.status;
}

export type CountryListQuery = {
  role: "origin" | "destination";
  profession?: string;
  origin?: string;
  scope?: "launchable" | "all";
  locale: string;
};

export function createReferenceService(repo: ReferenceRepository) {
  async function visibleProfessions(): Promise<ProfessionRow[]> {
    return (await repo.listProfessions()).filter((p) => isPublicStatus(p.status));
  }

  /** Unknown and hidden professions are indistinguishable to callers. */
  async function requireVisibleProfession(code: string): Promise<ProfessionRow> {
    const p = (await visibleProfessions()).find((x) => x.code === code);
    if (!p) throw new AppError("not_found", "Profession not found.");
    return p;
  }

  async function requireOpenProfession(code: string): Promise<ProfessionRow> {
    const p = await requireVisibleProfession(code);
    if (!isOpenStatus(p.status)) throw new AppError("not_found", "Profession not found.");
    return p;
  }

  return {
    requireVisibleProfession,
    requireOpenProfession,

    async listSectors(locale: string): Promise<PublicSector[]> {
      const [sectors, professions] = await Promise.all([
        repo.listSectors(),
        visibleProfessions(),
      ]);
      const used = new Set(professions.map((p) => p.sectorId));
      const shown = sectors.filter((s) => used.has(s.slug));
      const label = await createLabelResolver(repo, shown.map((s) => s.labelKey), locale);
      return shown.map((s) => ({ slug: s.slug, labelKey: s.labelKey, label: label(s.labelKey) }));
    },

    async listProfessions(q: { sector?: string; locale: string }): Promise<PublicProfession[]> {
      const rows = (await visibleProfessions()).filter(
        (p) => !q.sector || p.sectorId === q.sector,
      );
      const label = await createLabelResolver(
        repo,
        rows.flatMap((p) => [p.labelKey, p.labelPluralKey]),
        q.locale,
      );
      return rows.map((p) => ({
        slug: p.code,
        sector: p.sectorId,
        labelKey: p.labelKey,
        label: label(p.labelKey, p.name),
        labelPluralKey: p.labelPluralKey,
        labelPlural: label(p.labelPluralKey, p.name),
        status: p.status,
        isRegulated: p.isRegulated,
        canOnboard: isOpenStatus(p.status),
      }));
    },

    async listCountries(q: CountryListQuery): Promise<PublicCountry[]> {
      const [countries, offerings] = await Promise.all([
        repo.listCountries(),
        repo.listOfferings(),
      ]);
      const profession = q.profession ? await requireVisibleProfession(q.profession) : null;
      const professionOpen = profession ? isOpenStatus(profession.status) : false;
      const scopeAll = q.scope === "all";

      let candidates: CountryRow[];
      let supportedFor: (c: CountryRow) => boolean | null;

      if (q.role === "origin") {
        candidates = scopeAll ? countries : countries.filter((c) => c.canBeOrigin);
        supportedFor = (c) =>
          !profession
            ? null
            : professionOpen &&
              offerings.some(
                (o) =>
                  o.professionCode === profession.code &&
                  o.originCountry === c.code &&
                  isOpenStatus(o.status),
              );
      } else {
        if (profession && !q.origin) {
          throw new AppError("validation_error", "An origin country is required with a profession.");
        }
        const origin = q.origin
          ? countries.find((c) => c.code === q.origin && (c.canBeOrigin || scopeAll))
          : undefined;
        if (q.origin && !origin) throw new AppError("not_found", "Country not found.");
        candidates = (scopeAll ? countries : countries.filter((c) => c.canBeDestination)).filter(
          (c) => c.code !== q.origin,
        );
        supportedFor = (c) =>
          !profession || !origin
            ? null
            : professionOpen &&
              isOpenStatus(resolveOfferingStatus(offerings, profession.code, origin.code, c.code));
      }

      const label = await createLabelResolver(repo, candidates.map((c) => c.nameKey), q.locale);
      const items = candidates.map((c): PublicCountry => ({
        code: c.code,
        labelKey: c.nameKey ?? `country.${c.code}`,
        label: label(c.nameKey, c.name),
        callingCode: c.callingCode,
        supported: supportedFor(c),
      }));

      // Without scope=all the list is exactly what the matrix launches (when a profession
      // context is given); unsupported pairs are reached through the waitlist path instead.
      const filtered = scopeAll || !profession ? items : items.filter((i) => i.supported);
      return filtered.sort((a, b) => a.label.localeCompare(b.label, q.locale));
    },

    /** Public view of the launch matrix: only live/beta rows of non-hidden open professions. */
    async listOfferings(): Promise<PublicOffering[]> {
      const [offerings, professions] = await Promise.all([
        repo.listOfferings(),
        visibleProfessions(),
      ]);
      const open = new Set(professions.filter((p) => isOpenStatus(p.status)).map((p) => p.code));
      return offerings
        .filter((o) => isOpenStatus(o.status) && open.has(o.professionCode))
        .map((o) => ({
          profession: o.professionCode,
          origin: o.originCountry,
          destination: o.destinationCountry,
          status: o.status,
        }))
        .sort((a, b) =>
          `${a.profession}${a.origin}${a.destination}`.localeCompare(
            `${b.profession}${b.origin}${b.destination}`,
          ),
        );
    },

    /** Server-side authority for "is this combination launched?" (used by signup and waitlist). */
    async isSupported(profession: string, origin: string, destination: string | null) {
      const [p, offerings] = await Promise.all([
        repo.listProfessions().then((l) => l.find((x) => x.code === profession)),
        repo.listOfferings(),
      ]);
      return (
        !!p &&
        isOpenStatus(p.status) &&
        isOpenStatus(resolveOfferingStatus(offerings, profession, origin, destination))
      );
    },
  };
}

export type ReferenceService = ReturnType<typeof createReferenceService>;
export type { CountryRole };
