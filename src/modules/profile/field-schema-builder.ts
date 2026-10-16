import { z } from "zod";
import { isFieldVisible } from "./condition";
import type { ResolvedField } from "./types";

const DEFAULT_TEXT_MAX = 500;

/** Validator for one field's value, derived only from its definition. */
export function buildFieldValidator(field: ResolvedField): z.ZodType {
  const v = field.validation;
  switch (field.type) {
    case "text": {
      let s = z.string().max(v.maxLength ?? DEFAULT_TEXT_MAX);
      if (v.minLength) s = s.min(v.minLength);
      if (v.pattern) s = s.regex(new RegExp(v.pattern));
      return s;
    }
    case "number": {
      let n = v.integer ? z.number().int() : z.number();
      if (v.min !== undefined) n = n.min(v.min);
      if (v.max !== undefined) n = n.max(v.max);
      return n;
    }
    case "date":
      return z.iso.date();
    case "boolean":
      return z.boolean();
    case "country":
      return z.string().regex(/^[A-Z]{2}$/);
    case "select": {
      const allowed = new Set((field.options ?? []).map((o) => o.value));
      return z.string().refine((s) => allowed.has(s), "invalid_option");
    }
    case "multiselect": {
      const allowed = new Set((field.options ?? []).map((o) => o.value));
      return z
        .array(z.string().refine((s) => allowed.has(s), "invalid_option"))
        .max(allowed.size);
    }
  }
}

/**
 * Builds the answers validator from field definitions (server and client share this).
 * Partial save: every field is optional unless `enforceRequired` is set, in which case
 * required fields that are currently visible must be present.
 */
export function buildAnswersSchema(
  fields: readonly ResolvedField[],
  opts: { enforceRequired?: boolean } = {},
) {
  const shape: Record<string, z.ZodType> = {};
  for (const f of fields) shape[f.key] = buildFieldValidator(f).optional();

  return z.object(shape).strict().superRefine((answers, ctx) => {
    if (!opts.enforceRequired) return;
    for (const f of fields) {
      if (!f.required || !isFieldVisible(f.visibleWhen, answers)) continue;
      const value = (answers as Record<string, unknown>)[f.key];
      if (value === undefined || value === null || value === "") {
        ctx.addIssue({ code: "custom", path: [f.key], message: "required" });
      }
    }
  });
}
