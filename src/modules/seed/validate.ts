import {
  ISO2_PATTERN,
  REFERENCE_STATUSES,
  SLUG_PATTERN,
  DEFAULT_LOCALE,
  isOpenStatus,
} from "@/modules/reference/constants";
import {
  FIELD_CATEGORIES,
  PROFILE_FIELD_TYPES,
  REGISTRATION_CATEGORY,
  conditionSchema,
  type Condition,
} from "@/modules/profile/types";
import type { Labels, SeedBundle } from "./bundle";
import type { EntityName, Row } from "./desired";

const FIELD_KEY_PATTERN = /^[a-z][a-zA-Z0-9]{1,59}$/;
const VALUE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,59}$/;

export type ExistingData = Record<EntityName, Map<string, Row>>;

export class SeedValidationError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Seed validation failed:\n - ${problems.join("\n - ")}`);
    this.name = "SeedValidationError";
  }
}

function conditionFields(c: Condition): string[] {
  if ("all" in c) return c.all.flatMap(conditionFields);
  if ("any" in c) return c.any.flatMap(conditionFields);
  return [c.field];
}

/**
 * Validates a bundle against itself AND the rows already in the database, so a bundle may
 * reference shared reference data it does not redefine (e.g. a new profession reusing
 * `yearsOfExperience`). Returns every problem found rather than stopping at the first.
 */
export function validateBundle(bundle: SeedBundle, existing: ExistingData): string[] {
  const problems: string[] = [];
  const add = (msg: string) => problems.push(`[${bundle.id}] ${msg}`);

  const needEn = (where: string, labels: Labels | undefined) => {
    if (!labels?.[DEFAULT_LOCALE]?.trim()) add(`${where}: missing "${DEFAULT_LOCALE}" label`);
  };
  const dupes = (what: string, items: string[]) => {
    const seen = new Set<string>();
    for (const i of items) {
      if (seen.has(i)) add(`duplicate ${what} "${i}"`);
      seen.add(i);
    }
  };

  // ---- universes (existing rows + this bundle) ----
  const sectors = new Set<string>([...existing.sector.keys(), ...(bundle.sectors ?? []).map((s) => s.slug)]);
  const lists = new Set<string>([...existing.list.keys(), ...(bundle.lists ?? []).map((l) => l.key)]);

  const countries = new Map<string, { canBeOrigin: boolean; canBeDestination: boolean }>();
  for (const [code, r] of existing.country) {
    countries.set(code, {
      canBeOrigin: r.canBeOrigin === true,
      canBeDestination: r.canBeDestination === true,
    });
  }
  for (const c of bundle.countries ?? []) {
    const prev = countries.get(c.iso2);
    countries.set(c.iso2, {
      canBeOrigin: c.canBeOrigin ?? prev?.canBeOrigin ?? false,
      canBeDestination: c.canBeDestination ?? prev?.canBeDestination ?? false,
    });
  }

  const professions = new Map<string, { status: string; isRegulated: boolean }>();
  for (const [code, r] of existing.profession) {
    professions.set(code, { status: String(r.status), isRegulated: r.isRegulated !== false });
  }
  for (const p of bundle.professions ?? []) {
    professions.set(p.slug, { status: p.status, isRegulated: p.isRegulated });
  }

  const fields = new Map<string, { category: string }>();
  for (const [key, r] of existing.field) fields.set(key, { category: String(r.category) });
  for (const f of bundle.fields ?? []) fields.set(f.key, { category: f.category ?? "general" });

  // ---- sectors ----
  dupes("sector", (bundle.sectors ?? []).map((s) => s.slug));
  for (const s of bundle.sectors ?? []) {
    if (!SLUG_PATTERN.test(s.slug)) add(`sector "${s.slug}": invalid slug`);
    needEn(`sector "${s.slug}"`, s.label);
  }

  // ---- countries ----
  dupes("country", (bundle.countries ?? []).map((c) => c.iso2));
  for (const c of bundle.countries ?? []) {
    if (!ISO2_PATTERN.test(c.iso2)) add(`country "${c.iso2}": iso2 must be two upper-case letters`);
    needEn(`country "${c.iso2}"`, c.name);
    if (c.defaultCurrency && !/^[A-Z]{3}$/.test(c.defaultCurrency)) {
      add(`country "${c.iso2}": defaultCurrency must be ISO 4217`);
    }
  }

  // ---- professions ----
  dupes("profession", (bundle.professions ?? []).map((p) => p.slug));
  for (const p of bundle.professions ?? []) {
    if (!SLUG_PATTERN.test(p.slug)) add(`profession "${p.slug}": invalid slug`);
    if (!REFERENCE_STATUSES.includes(p.status)) add(`profession "${p.slug}": invalid status "${p.status}"`);
    if (!sectors.has(p.sector)) add(`profession "${p.slug}": unknown sector "${p.sector}"`);
    needEn(`profession "${p.slug}"`, p.label);
    needEn(`profession "${p.slug}" plural`, p.labelPlural);
  }

  // ---- offerings ----
  dupes("offering", (bundle.offerings ?? []).map((o) => `${o.profession}|${o.origin}|${o.destination ?? "*"}`));
  for (const o of bundle.offerings ?? []) {
    const id = `offering ${o.profession}/${o.origin}/${o.destination ?? "any"}`;
    const prof = professions.get(o.profession);
    if (!prof) add(`${id}: unknown profession`);
    if (!REFERENCE_STATUSES.includes(o.status)) add(`${id}: invalid status "${o.status}"`);
    if (!countries.has(o.origin)) add(`${id}: unknown origin country`);
    if (o.destination && !countries.has(o.destination)) add(`${id}: unknown destination country`);
    if (o.destination && o.destination === o.origin) add(`${id}: origin and destination are the same`);
    if (isOpenStatus(o.status)) {
      if (prof && !isOpenStatus(prof.status)) add(`${id}: ${o.status} offering for a profession that is ${prof.status}`);
      if (countries.get(o.origin)?.canBeOrigin !== true) add(`${id}: origin country is not flagged canBeOrigin`);
      if (o.destination && countries.get(o.destination)?.canBeDestination !== true) {
        add(`${id}: destination country is not flagged canBeDestination`);
      }
    }
  }

  // ---- lists ----
  dupes("list", (bundle.lists ?? []).map((l) => l.key));
  for (const l of bundle.lists ?? []) {
    if (!SLUG_PATTERN.test(l.key)) add(`list "${l.key}": invalid key`);
    dupes(`item in list "${l.key}"`, l.items.map((i) => i.value));
    for (const i of l.items) {
      if (!VALUE_PATTERN.test(i.value)) add(`list "${l.key}" item "${i.value}": invalid value`);
      needEn(`list "${l.key}" item "${i.value}"`, i.label);
    }
  }

  // ---- fields ----
  dupes("field", (bundle.fields ?? []).map((f) => f.key));
  for (const f of bundle.fields ?? []) {
    const id = `field "${f.key}"`;
    if (!FIELD_KEY_PATTERN.test(f.key)) add(`${id}: invalid key (camelCase expected)`);
    if (!PROFILE_FIELD_TYPES.includes(f.type)) add(`${id}: invalid type "${f.type}"`);
    needEn(`${id} label`, f.label);
    needEn(`${id} whyAsked`, f.whyAsked);
    if (!f.purposeNote?.trim()) add(`${id}: purposeNote is required`);
    if (f.category && !FIELD_CATEGORIES.includes(f.category)) add(`${id}: invalid category "${f.category}"`);
    if (f.help) needEn(`${id} help`, f.help);

    const needsOptions = f.type === "select" || f.type === "multiselect";
    if (needsOptions && !f.options) add(`${id}: select fields need options`);
    if (!needsOptions && f.type !== "country" && f.options) add(`${id}: options are only valid for select, multiselect and country`);
    if (f.type === "country" && f.options && f.options.source !== "countries") add(`${id}: country fields use the "countries" source`);
    if (f.options?.source === "inline") {
      dupes(`option in ${id}`, f.options.items.map((i) => i.value));
      for (const i of f.options.items) {
        if (!VALUE_PATTERN.test(i.value)) add(`${id} option "${i.value}": invalid value`);
        needEn(`${id} option "${i.value}"`, i.label);
      }
    }
    if (f.options?.source === "list" && !lists.has(f.options.listKey)) {
      add(`${id}: unknown list "${f.options.listKey}"`);
    }
    if (f.storage?.kind === "user_country" && f.type !== "country") {
      add(`${id}: user_country storage requires type "country"`);
    }
  }

  // ---- step titles ----
  for (const [k, labels] of Object.entries(bundle.stepTitles ?? {})) needEn(`step "${k}"`, labels);

  // ---- schemas ----
  dupes("schema", (bundle.schemas ?? []).map((s) => `${s.profession ?? "*"}|${s.origin ?? "*"}|${s.version}`));
  const titledSteps = new Set(Object.keys(bundle.stepTitles ?? {}));
  for (const s of bundle.schemas ?? []) {
    const id = `schema ${s.profession ?? "default"}/${s.origin ?? "any"} v${s.version}`;
    if (s.profession && !professions.has(s.profession)) add(`${id}: unknown profession`);
    if (s.origin && !s.profession) add(`${id}: origin requires a profession`);
    if (s.origin && !countries.has(s.origin)) add(`${id}: unknown origin country`);
    if (!Number.isInteger(s.version) || s.version < 1) add(`${id}: version must be a positive integer`);
    if (s.steps.length === 0) add(`${id}: no steps`);

    // Layer 2 (registration) can be absent. Default schemas apply to every profession and
    // regulated-only schemas are the only place registration fields may appear.
    const mayHaveRegistration = s.profession !== null && professions.get(s.profession)?.isRegulated === true;

    const seen = new Set<string>();
    const stepKeys = new Set<string>();
    for (const st of s.steps) {
      if (stepKeys.has(st.key)) add(`${id}: duplicate step "${st.key}"`);
      stepKeys.add(st.key);
      if (!SLUG_PATTERN.test(st.key)) add(`${id}: invalid step key "${st.key}"`);
      if (!titledSteps.has(st.key) && !existing.label.has(`${DEFAULT_LOCALE}|step.${st.key}`)) {
        add(`${id}: step "${st.key}" has no title`);
      }
      if (st.fields.length === 0) add(`${id}: step "${st.key}" has no fields`);
      for (const sf of st.fields) {
        const def = fields.get(sf.key);
        if (!def) add(`${id}: step "${st.key}" references unknown field "${sf.key}"`);
        if (seen.has(sf.key)) add(`${id}: field "${sf.key}" appears more than once`);
        seen.add(sf.key);
        if (def?.category === REGISTRATION_CATEGORY && !mayHaveRegistration) {
          add(`${id}: registration field "${sf.key}" is not allowed (profession is unregulated or schema is a default)`);
        }
        if (sf.visibleWhen) {
          const parsed = conditionSchema.safeParse(sf.visibleWhen);
          if (!parsed.success) add(`${id}: invalid visibleWhen on "${sf.key}"`);
        }
      }
    }
    // visibleWhen may only look at fields in the same schema.
    for (const st of s.steps) {
      for (const sf of st.fields) {
        if (!sf.visibleWhen) continue;
        for (const ref of conditionFields(sf.visibleWhen)) {
          if (!seen.has(ref)) add(`${id}: visibleWhen on "${sf.key}" references "${ref}" which is not in the schema`);
        }
      }
    }
  }

  return problems;
}
