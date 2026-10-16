import { z } from "zod";
import { DEFAULT_LOCALE, ISO2_PATTERN, LOCALE_PATTERN, SLUG_PATTERN } from "./constants";

/** Query-string schemas for the public /api/v1/meta endpoints. Unknown params are ignored. */
const locale = z.string().regex(LOCALE_PATTERN).default(DEFAULT_LOCALE);
const slug = z.string().regex(SLUG_PATTERN);
const iso2 = z.string().regex(ISO2_PATTERN);

export const sectorsQuery = z.object({ locale });

export const professionsQuery = z.object({ sector: slug.optional(), locale });

export const countriesQuery = z.object({
  role: z.enum(["origin", "destination"]),
  profession: slug.optional(),
  origin: iso2.optional(),
  scope: z.enum(["launchable", "all"]).default("launchable"),
  locale,
});

export const profileSchemaQuery = z.object({
  profession: slug,
  origin: iso2.optional(),
  locale,
});
