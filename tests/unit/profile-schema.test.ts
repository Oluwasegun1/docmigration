import { describe, expect, it } from "vitest";
import { evaluateCondition } from "@/modules/profile/condition";
import { buildAnswersSchema } from "@/modules/profile/field-schema-builder";
import type {
  ProfileRegistryRepository,
  ProfileSchemaRow,
} from "@/modules/profile/repository";
import { createProfileSchemaService, pickProfileSchema } from "@/modules/profile/resolver";
import type { ResolvedField } from "@/modules/profile/types";

describe("pickProfileSchema", () => {
  const schemas: ProfileSchemaRow[] = [
    { professionCode: null, originCountry: null, version: 1, steps: [] },
    { professionCode: "doctor", originCountry: null, version: 1, steps: [] },
    { professionCode: "doctor", originCountry: "NG", version: 1, steps: [] },
    { professionCode: "doctor", originCountry: "NG", version: 2, steps: [] },
  ];

  it("selects (profession, origin) over (profession) and default, picking highest version", () => {
    const picked = pickProfileSchema(schemas, "doctor", "NG");
    expect(picked).not.toBeNull();
    expect(picked!.matched).toBe("profession_origin");
    expect(picked!.row.version).toBe(2);
  });

  it("selects (profession) when origin does not match", () => {
    const picked = pickProfileSchema(schemas, "doctor", "GH");
    expect(picked).not.toBeNull();
    expect(picked!.matched).toBe("profession");
    expect(picked!.row.professionCode).toBe("doctor");
    expect(picked!.row.originCountry).toBeNull();
  });

  it("selects default when profession does not match", () => {
    const picked = pickProfileSchema(schemas, "engineer", "NG");
    expect(picked).not.toBeNull();
    expect(picked!.matched).toBe("default");
    expect(picked!.row.professionCode).toBeNull();
  });
});

describe("evaluateCondition", () => {
  it("evaluates eq, neq, in, exists correctly", () => {
    expect(evaluateCondition({ field: "stage", op: "eq", value: "intern" }, { stage: "intern" })).toBe(true);
    expect(evaluateCondition({ field: "stage", op: "eq", value: "intern" }, { stage: "consultant" })).toBe(false);
    expect(evaluateCondition({ field: "stage", op: "neq", value: "intern" }, { stage: "consultant" })).toBe(true);
    expect(evaluateCondition({ field: "num", op: "in", value: [1, 2, 3] }, { num: 2 })).toBe(true);
    expect(evaluateCondition({ field: "num", op: "notIn", value: [1, 2, 3] }, { num: 4 })).toBe(true);
    expect(evaluateCondition({ field: "val", op: "exists" }, { val: "present" })).toBe(true);
    expect(evaluateCondition({ field: "val", op: "exists" }, { val: "" })).toBe(false);
    expect(evaluateCondition({ field: "val", op: "notExists" }, {})).toBe(true);
  });

  it("evaluates complex logical groups (all / any)", () => {
    const cond = {
      all: [
        { field: "gradYear", op: "eq" as const, value: 2020 },
        { any: [{ field: "spec", op: "eq" as const, value: "cardio" }, { field: "spec", op: "eq" as const, value: "neuro" }] },
      ],
    };
    expect(evaluateCondition(cond, { gradYear: 2020, spec: "cardio" })).toBe(true);
    expect(evaluateCondition(cond, { gradYear: 2020, spec: "ortho" })).toBe(false);
    expect(evaluateCondition(cond, { gradYear: 2019, spec: "cardio" })).toBe(false);
  });
});

describe("buildAnswersSchema and Field Validation", () => {
  const fields: ResolvedField[] = [
    {
      key: "yearsExperience",
      type: "number",
      labelKey: "field.years.label",
      label: "Years of Experience",
      whyAskedKey: "field.years.why",
      whyAsked: "Reason",
      helpKey: null,
      help: null,
      required: true,
      visibleWhen: null,
      options: null,
      countryRole: null,
      validation: { integer: true, min: 0, max: 50 },
      sensitivity: "standard",
      category: "career",
      storage: { kind: "answer" },
    },
    {
      key: "hasSpecialty",
      type: "boolean",
      labelKey: "field.hasSpec.label",
      label: "Has Specialty",
      whyAskedKey: "field.hasSpec.why",
      whyAsked: "Reason",
      helpKey: null,
      help: null,
      required: false,
      visibleWhen: null,
      options: null,
      countryRole: null,
      validation: {},
      sensitivity: "standard",
      category: "career",
      storage: { kind: "answer" },
    },
    {
      key: "specialtyName",
      type: "text",
      labelKey: "field.specName.label",
      label: "Specialty Name",
      whyAskedKey: "field.specName.why",
      whyAsked: "Reason",
      helpKey: null,
      help: null,
      required: true,
      visibleWhen: { field: "hasSpecialty", op: "eq", value: true },
      options: null,
      countryRole: null,
      validation: { minLength: 2, maxLength: 50 },
      sensitivity: "standard",
      category: "career",
      storage: { kind: "answer" },
    },
  ];

  it("permits partial answers when enforceRequired is false", () => {
    const schema = buildAnswersSchema(fields, { enforceRequired: false });
    const result = schema.safeParse({ yearsExperience: 5 });
    expect(result.success).toBe(true);
  });

  it("enforces required fields when enforceRequired is true", () => {
    const schema = buildAnswersSchema(fields, { enforceRequired: true });

    // missing yearsExperience
    const result1 = schema.safeParse({});
    expect(result1.success).toBe(false);

    // specialtyName is required only when hasSpecialty is true
    const result2 = schema.safeParse({ yearsExperience: 5, hasSpecialty: false });
    expect(result2.success).toBe(true);

    const result3 = schema.safeParse({ yearsExperience: 5, hasSpecialty: true });
    expect(result3.success).toBe(false); // specialtyName is missing

    const result4 = schema.safeParse({ yearsExperience: 5, hasSpecialty: true, specialtyName: "Pediatrics" });
    expect(result4.success).toBe(true);
  });
});

describe("Stage C: Unregulated Profession Schema Verification", () => {
  it("resolves schema for unregulated profession without any registration steps", async () => {
    const mockRegistry: ProfileRegistryRepository = {
      listPublishedSchemas: async () => [
        {
          professionCode: "test-profession",
          originCountry: "XA",
          version: 1,
          steps: [
            {
              key: "work-history",
              titleKey: "step.work",
              fields: [{ key: "yearsExperience", required: true }],
            },
          ],
        },
      ],
      getFields: async () => [
        {
          key: "yearsExperience",
          type: "number",
          labelKey: "field.years.label",
          whyAskedKey: "field.years.why",
          helpKey: null,
          optionsJson: null,
          validationJson: {},
          sensitivity: "standard",
          category: "career",
          storage: "answer",
          storageJson: null,
        },
      ],
      getListItems: async () => [],
    };

    const mockLabelsRepo = {
      getLabels: async () => [
        { key: "step.work", locale: "en", text: "Work History" },
        { key: "field.years.label", locale: "en", text: "Years of Experience" },
        { key: "field.years.why", locale: "en", text: "Why we ask" },
      ],
    };

    const service = createProfileSchemaService(mockRegistry, mockLabelsRepo);
    const resolved = await service.resolve({
      profession: "test-profession",
      origin: "XA",
      locale: "en",
    });

    expect(resolved.steps).toHaveLength(1);
    expect(resolved.steps[0].key).toBe("work-history");

    // Verify none of the steps or fields are in the registration category
    for (const step of resolved.steps) {
      expect(step.key).not.toMatch(/licens|regist/i);
      for (const field of step.fields) {
        expect(field.category).not.toBe("registration");
      }
    }
  });
});
