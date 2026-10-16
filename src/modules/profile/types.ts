import { z } from "zod";

/**
 * Registry shapes stored as JSON in profile_schemas.steps and profile_fields.*_json.
 * Shared by the seed validator, the resolver and the dynamic Zod builder (client + server),
 * so there is one source of truth. No server-only imports here.
 */

export const PROFILE_FIELD_TYPES = [
  "text",
  "number",
  "date",
  "select",
  "multiselect",
  "boolean",
  "country",
] as const;
export type ProfileFieldType = (typeof PROFILE_FIELD_TYPES)[number];

/** PRD layers. Layer "registration" can be absent for unregulated professions. */
export const FIELD_CATEGORIES = [
  "eligibility",
  "registration",
  "career",
  "immigration",
  "general",
] as const;
export type FieldCategory = (typeof FIELD_CATEGORIES)[number];

export const REGISTRATION_CATEGORY: FieldCategory = "registration";

export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | {
      field: string;
      op: "eq" | "neq" | "in" | "notIn" | "exists" | "notExists";
      value?: unknown;
    };

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(conditionSchema).min(1) }).strict(),
    z.object({ any: z.array(conditionSchema).min(1) }).strict(),
    z
      .object({
        field: z.string().min(1),
        op: z.enum(["eq", "neq", "in", "notIn", "exists", "notExists"]),
        value: z.unknown().optional(),
      })
      .strict(),
  ]),
);

export const stepsSchema = z.array(
  z
    .object({
      key: z.string().min(1),
      titleKey: z.string().min(1),
      fields: z
        .array(
          z
            .object({
              key: z.string().min(1),
              required: z.boolean().default(false),
              visibleWhen: conditionSchema.optional(),
            })
            .strict(),
        )
        .min(1),
    })
    .strict(),
).min(1);
export type StepDef = z.infer<typeof stepsSchema>[number];

export const optionsSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("inline"),
    items: z.array(z.object({ value: z.string().min(1), labelKey: z.string().min(1) })).min(1),
  }),
  z.object({ source: z.literal("list"), listKey: z.string().min(1) }),
  z.object({ source: z.literal("countries"), role: z.enum(["origin", "destination", "any"]) }),
]);
export type FieldOptionsDef = z.infer<typeof optionsSchema>;

export const validationSchema = z
  .object({
    min: z.number().optional(),
    max: z.number().optional(),
    integer: z.boolean().optional(),
    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().positive().optional(),
    pattern: z.string().max(200).optional(),
  })
  .strict();
export type FieldValidation = z.infer<typeof validationSchema>;

/** Where an answer lives. 'user_country' fields are virtual: they read/write UserCountry. */
export const storageSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("answer") }),
  z.object({ kind: z.literal("user_country"), role: z.enum(["trained_in", "practising_in", "destination"]) }),
]);
export type FieldStorage = z.infer<typeof storageSchema>;

export type ResolvedOption = { value: string; labelKey: string; label: string };

/** Fully resolved field as returned by GET /meta/profile-schema. Opaque to clients. */
export type ResolvedField = {
  key: string;
  type: ProfileFieldType;
  labelKey: string;
  label: string;
  whyAskedKey: string;
  whyAsked: string;
  helpKey: string | null;
  help: string | null;
  required: boolean;
  visibleWhen: Condition | null;
  options: ResolvedOption[] | null;
  countryRole: "origin" | "destination" | "any" | null;
  validation: FieldValidation;
  sensitivity: string;
  category: string;
  storage: FieldStorage;
};

export type ResolvedStep = {
  key: string;
  titleKey: string;
  title: string;
  fields: ResolvedField[];
};

export type ResolvedProfileSchema = {
  matched: "profession_origin" | "profession" | "default";
  version: number;
  steps: ResolvedStep[];
};
