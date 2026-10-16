import { isOpenStatus } from "@/modules/reference/constants";
import { DEFAULT_LOCALE } from "@/modules/reference/constants";
import type { SeedBundle, Labels } from "./bundle";

export type EntityName =
  | "sector"
  | "country"
  | "profession"
  | "label"
  | "list"
  | "listItem"
  | "field"
  | "offering"
  | "schema";

/** Parents before children, so foreign keys hold at every step. */
export const APPLY_ORDER: readonly EntityName[] = [
  "sector",
  "country",
  "profession",
  "label",
  "list",
  "listItem",
  "field",
  "offering",
  "schema",
];

export type Row = Record<string, unknown>;

export type Desired = {
  key: string;
  /** Fields the seed owns: compared on every run and updated when they differ. */
  row: Row;
  /**
   * Server-managed fields: written on insert, and on update only when the stored value is
   * null (e.g. launchedAt, publishedAt). Never compared, so re-runs stay idempotent.
   */
  defaults?: Row;
};

export type DesiredSet = Record<EntityName, Desired[]>;

/** Convention-based i18n keys for reference data. */
export const keys = {
  sector: (slug: string) => `sector.${slug}`,
  profession: (slug: string) => `profession.${slug}`,
  professionPlural: (slug: string) => `profession.${slug}.plural`,
  country: (iso2: string) => `country.${iso2}`,
  fieldLabel: (key: string) => `field.${key}.label`,
  fieldWhy: (key: string) => `field.${key}.why`,
  fieldHelp: (key: string) => `field.${key}.help`,
  fieldOption: (key: string, value: string) => `field.${key}.option.${value}`,
  listItem: (list: string, value: string) => `list.${list}.${value}`,
  step: (key: string) => `step.${key}`,
};

export const offeringKey = (p: string, o: string, d: string | null | undefined) =>
  `${p}|${o}|${d ?? "*"}`;
export const schemaKey = (p: string | null, o: string | null | undefined, v: number) =>
  `${p ?? "*"}|${o ?? "*"}|v${v}`;

/** Identity key of a persisted row; must match the keys used in `Desired`. */
export function rowKey(entity: EntityName, r: Row): string {
  const s = (v: unknown) => (v == null ? null : String(v));
  switch (entity) {
    case "sector":
      return String(r.slug);
    case "country":
    case "profession":
      return String(r.code);
    case "label":
      return `${r.locale}|${r.key}`;
    case "list":
    case "field":
      return String(r.key);
    case "listItem":
      return `${r.listKey}|${r.value}`;
    case "offering":
      return offeringKey(String(r.professionCode), String(r.originCountry), s(r.destinationCountry));
    case "schema":
      return schemaKey(s(r.professionCode), s(r.originCountry), Number(r.version));
  }
}

function omitUndefined(row: Row): Row {
  return Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
}

export function buildDesired(bundle: SeedBundle, now: Date): DesiredSet {
  const out: DesiredSet = {
    sector: [],
    country: [],
    profession: [],
    label: [],
    list: [],
    listItem: [],
    field: [],
    offering: [],
    schema: [],
  };

  const addLabels = (labelKey: string, labels: Labels) => {
    for (const [locale, text] of Object.entries(labels)) {
      out.label.push({ key: `${locale}|${labelKey}`, row: { key: labelKey, locale, text } });
    }
  };

  for (const s of bundle.sectors ?? []) {
    out.sector.push({
      key: s.slug,
      row: { slug: s.slug, labelKey: keys.sector(s.slug), sortOrder: s.sortOrder ?? 0 },
    });
    addLabels(keys.sector(s.slug), s.label);
  }

  for (const c of bundle.countries ?? []) {
    out.country.push({
      key: c.iso2,
      row: omitUndefined({
        code: c.iso2,
        name: c.name[DEFAULT_LOCALE],
        nameKey: keys.country(c.iso2),
        callingCode: c.callingCode,
        defaultTimeZone: c.defaultTimeZone,
        defaultCurrency: c.defaultCurrency,
        canBeOrigin: c.canBeOrigin,
        canBeDestination: c.canBeDestination,
      }),
    });
    addLabels(keys.country(c.iso2), c.name);
  }

  for (const p of bundle.professions ?? []) {
    out.profession.push({
      key: p.slug,
      row: {
        code: p.slug,
        name: p.label[DEFAULT_LOCALE],
        // Mirrors status for the pre-existing RLS policy / readers of is_active.
        isActive: isOpenStatus(p.status),
        sectorId: p.sector,
        labelKey: keys.profession(p.slug),
        labelPluralKey: keys.professionPlural(p.slug),
        status: p.status,
        isRegulated: p.isRegulated,
        sortOrder: p.sortOrder ?? 0,
      },
    });
    addLabels(keys.profession(p.slug), p.label);
    addLabels(keys.professionPlural(p.slug), p.labelPlural);
  }

  for (const o of bundle.offerings ?? []) {
    out.offering.push({
      key: offeringKey(o.profession, o.origin, o.destination),
      row: omitUndefined({
        professionCode: o.profession,
        originCountry: o.origin,
        destinationCountry: o.destination ?? null,
        status: o.status,
        notesInternal: o.notesInternal,
        launchedAt: o.launchedAt ? new Date(o.launchedAt) : undefined,
      }),
      defaults: { launchedAt: isOpenStatus(o.status) ? now : null },
    });
  }

  for (const l of bundle.lists ?? []) {
    out.list.push({ key: l.key, row: { key: l.key } });
    l.items.forEach((item, idx) => {
      const labelKey = keys.listItem(l.key, item.value);
      out.listItem.push({
        key: `${l.key}|${item.value}`,
        row: {
          listKey: l.key,
          value: item.value,
          labelKey,
          sortOrder: item.sortOrder ?? idx,
          status: item.status ?? "live",
        },
      });
      addLabels(labelKey, item.label);
    });
  }

  for (const f of bundle.fields ?? []) {
    let optionsJson: Row | null = null;
    if (f.options?.source === "inline") {
      optionsJson = {
        source: "inline",
        items: f.options.items.map((i) => ({
          value: i.value,
          labelKey: keys.fieldOption(f.key, i.value),
        })),
      };
      for (const i of f.options.items) addLabels(keys.fieldOption(f.key, i.value), i.label);
    } else if (f.options) {
      optionsJson = { ...f.options };
    }
    const storage = f.storage ?? { kind: "answer" as const };
    out.field.push({
      key: f.key,
      row: {
        key: f.key,
        type: f.type,
        labelKey: keys.fieldLabel(f.key),
        whyAskedKey: keys.fieldWhy(f.key),
        helpKey: f.help ? keys.fieldHelp(f.key) : null,
        optionsJson,
        validationJson: f.validation ?? null,
        sensitivity: f.sensitivity ?? "standard",
        category: f.category ?? "general",
        storage: storage.kind,
        storageJson: storage.kind === "user_country" ? { ...storage } : null,
        purposeNote: f.purposeNote,
      },
    });
    addLabels(keys.fieldLabel(f.key), f.label);
    addLabels(keys.fieldWhy(f.key), f.whyAsked);
    if (f.help) addLabels(keys.fieldHelp(f.key), f.help);
  }

  for (const [stepKey, labels] of Object.entries(bundle.stepTitles ?? {})) {
    addLabels(keys.step(stepKey), labels);
  }

  for (const s of bundle.schemas ?? []) {
    out.schema.push({
      key: schemaKey(s.profession, s.origin, s.version),
      row: {
        professionCode: s.profession,
        originCountry: s.origin ?? null,
        version: s.version,
        steps: s.steps.map((st) => ({
          key: st.key,
          titleKey: keys.step(st.key),
          fields: st.fields.map((f) => ({
            key: f.key,
            required: f.required ?? false,
            ...(f.visibleWhen ? { visibleWhen: f.visibleWhen } : {}),
          })),
        })),
      },
      defaults: s.published === false ? undefined : { publishedAt: now },
    });
  }

  return out;
}
