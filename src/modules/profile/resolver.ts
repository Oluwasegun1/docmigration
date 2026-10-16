import { AppError } from "@/lib/errors";
import { createLabelResolver, type ReferenceRepository } from "@/modules/reference/repository";
import type { ProfileFieldRow, ProfileRegistryRepository, ProfileSchemaRow } from "./repository";
import {
  optionsSchema,
  stepsSchema,
  storageSchema,
  validationSchema,
  type ProfileFieldType,
  type ResolvedField,
  type ResolvedOption,
  type ResolvedProfileSchema,
} from "./types";

function specificity(s: ProfileSchemaRow): number {
  return (s.professionCode ? 1 : 0) + (s.originCountry ? 1 : 0);
}

/**
 * Precedence: (profession + origin) > (profession) > default. The most specific scope that
 * has a published schema wins as a whole (no merging); highest version within that scope.
 */
export function pickProfileSchema(
  rows: readonly ProfileSchemaRow[],
  profession: string,
  origin: string | null,
): { row: ProfileSchemaRow; matched: ResolvedProfileSchema["matched"] } | null {
  const applicable = rows.filter(
    (r) =>
      (r.professionCode === null || r.professionCode === profession) &&
      (r.originCountry === null || (origin !== null && r.originCountry === origin)) &&
      !(r.originCountry !== null && r.professionCode === null),
  );
  if (applicable.length === 0) return null;
  const best = applicable.sort(
    (a, b) => specificity(b) - specificity(a) || b.version - a.version,
  )[0];
  const matched =
    specificity(best) === 2 ? "profession_origin" : specificity(best) === 1 ? "profession" : "default";
  return { row: best, matched };
}

export function createProfileSchemaService(
  registry: ProfileRegistryRepository,
  reference: Pick<ReferenceRepository, "getLabels">,
) {
  return {
    async resolve(q: {
      profession: string;
      origin: string | null;
      locale: string;
    }): Promise<ResolvedProfileSchema> {
      const rows = await registry.listPublishedSchemas(q.profession, q.origin);
      const picked = pickProfileSchema(rows, q.profession, q.origin);
      if (!picked) throw new AppError("not_found", "No profile schema is published.");

      const steps = stepsSchema.parse(picked.row.steps);
      const fieldKeys = [...new Set(steps.flatMap((s) => s.fields.map((f) => f.key)))];
      const fieldRows = await registry.getFields(fieldKeys);
      const byKey = new Map<string, ProfileFieldRow>(fieldRows.map((f) => [f.key, f]));

      const parsedOptions = new Map(
        fieldRows.map((f) => [
          f.key,
          f.optionsJson == null ? null : optionsSchema.parse(f.optionsJson),
        ]),
      );
      const listKeys = [
        ...new Set(
          [...parsedOptions.values()].flatMap((o) => (o?.source === "list" ? [o.listKey] : [])),
        ),
      ];
      const listItems = await registry.getListItems(listKeys);

      const labelKeys: string[] = [];
      for (const s of steps) labelKeys.push(s.titleKey);
      for (const f of fieldRows) {
        labelKeys.push(f.labelKey, f.whyAskedKey);
        if (f.helpKey) labelKeys.push(f.helpKey);
        const o = parsedOptions.get(f.key);
        if (o?.source === "inline") labelKeys.push(...o.items.map((i) => i.labelKey));
      }
      labelKeys.push(...listItems.map((i) => i.labelKey));
      const label = await createLabelResolver(reference, labelKeys, q.locale);

      const optionsFor = (key: string): { options: ResolvedOption[] | null; countryRole: ResolvedField["countryRole"] } => {
        const o = parsedOptions.get(key);
        if (!o) return { options: null, countryRole: null };
        if (o.source === "countries") return { options: null, countryRole: o.role };
        if (o.source === "inline") {
          return {
            options: o.items.map((i) => ({ value: i.value, labelKey: i.labelKey, label: label(i.labelKey) })),
            countryRole: null,
          };
        }
        return {
          options: listItems
            .filter((i) => i.listKey === o.listKey && i.status === "live")
            .sort((a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value))
            .map((i) => ({ value: i.value, labelKey: i.labelKey, label: label(i.labelKey) })),
          countryRole: null,
        };
      };

      return {
        matched: picked.matched,
        version: picked.row.version,
        steps: steps.map((s) => ({
          key: s.key,
          titleKey: s.titleKey,
          title: label(s.titleKey),
          fields: s.fields.map((sf): ResolvedField => {
            const f = byKey.get(sf.key);
            if (!f) throw new Error(`Profile schema references unknown field "${sf.key}"`);
            const { options, countryRole } = optionsFor(f.key);
            return {
              key: f.key,
              type: f.type as ProfileFieldType,
              labelKey: f.labelKey,
              label: label(f.labelKey),
              whyAskedKey: f.whyAskedKey,
              whyAsked: label(f.whyAskedKey),
              helpKey: f.helpKey,
              help: f.helpKey ? label(f.helpKey) : null,
              required: sf.required,
              visibleWhen: sf.visibleWhen ?? null,
              options,
              countryRole,
              validation: validationSchema.parse(f.validationJson ?? {}),
              sensitivity: f.sensitivity,
              category: f.category,
              storage: storageSchema.parse(f.storageJson ?? { kind: "answer" }),
            };
          }),
        })),
      };
    },
  };
}

export type ProfileSchemaService = ReturnType<typeof createProfileSchemaService>;
