import type { ReferenceStatus } from "@/modules/reference/constants";
import type {
  Condition,
  FieldCategory,
  FieldValidation,
  ProfileFieldType,
} from "@/modules/profile/types";

/** locale -> text. Must include the default locale ("en"). */
export type Labels = Record<string, string>;

export type SectorSeed = { slug: string; label: Labels; sortOrder?: number };

export type ProfessionSeed = {
  slug: string;
  sector: string;
  label: Labels;
  labelPlural: Labels;
  status: ReferenceStatus;
  isRegulated: boolean;
  sortOrder?: number;
};

/**
 * Countries are synced from the generated ISO list. canBeOrigin / canBeDestination are
 * applied on create when given; on update they are applied only when given explicitly, so a
 * country that is not mentioned keeps whatever flags it already has.
 */
export type CountrySeed = {
  iso2: string;
  name: Labels;
  callingCode?: string | null;
  defaultTimeZone?: string | null;
  defaultCurrency?: string | null;
  canBeOrigin?: boolean;
  canBeDestination?: boolean;
};

export type OfferingSeed = {
  profession: string;
  origin: string;
  /** null / omitted = any destination. */
  destination?: string | null;
  status: ReferenceStatus;
  launchedAt?: string;
  notesInternal?: string;
};

export type ListSeed = {
  key: string;
  items: { value: string; label: Labels; sortOrder?: number; status?: "live" | "hidden" }[];
};

export type FieldOptionsSeed =
  | { source: "inline"; items: { value: string; label: Labels }[] }
  | { source: "list"; listKey: string }
  | { source: "countries"; role: "origin" | "destination" | "any" };

export type FieldSeed = {
  key: string;
  type: ProfileFieldType;
  label: Labels;
  /** Required: every field must say why it is asked. */
  whyAsked: Labels;
  help?: Labels;
  options?: FieldOptionsSeed;
  validation?: FieldValidation;
  sensitivity?: "standard" | "sensitive";
  category?: FieldCategory;
  storage?: { kind: "answer" } | { kind: "user_country"; role: "trained_in" | "practising_in" | "destination" };
  /** Internal note for the content team; not user-facing. */
  purposeNote: string;
};

export type SchemaSeed = {
  /** null = default schema for every profession. */
  profession: string | null;
  /** null / omitted = any origin. Requires a profession. */
  origin?: string | null;
  version: number;
  published?: boolean;
  steps: { key: string; fields: { key: string; required?: boolean; visibleWhen?: Condition }[] }[];
};

/** A versioned unit of reference data applied by `pnpm seed:reference`. */
export type SeedBundle = {
  id: string;
  version: number;
  sectors?: SectorSeed[];
  professions?: ProfessionSeed[];
  countries?: CountrySeed[];
  offerings?: OfferingSeed[];
  lists?: ListSeed[];
  fields?: FieldSeed[];
  /** Step titles by step key (shared across schemas). */
  stepTitles?: Record<string, Labels>;
  schemas?: SchemaSeed[];
};
