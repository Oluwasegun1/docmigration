import { describe, expect, it } from "vitest";
import type { AuditInput, AuditSink } from "@/modules/audit/service";
import type { SeedBundle } from "@/modules/seed/bundle";
import { rowKey, type EntityName, type Row } from "@/modules/seed/desired";
import { applyBundle, type SeedStore } from "@/modules/seed/runner";
import { validateBundle, type ExistingData } from "@/modules/seed/validate";

function createInMemorySeedStore(): SeedStore & { data: Map<EntityName, Map<string, Row>> } {
  const data = new Map<EntityName, Map<string, Row>>();

  const getMap = (e: EntityName) => {
    let m = data.get(e);
    if (!m) {
      m = new Map();
      data.set(e, m);
    }
    return m;
  };

  return {
    data,
    load: async (entity) => new Map(getMap(entity)),
    insertMany: async (entity, rows) => {
      const m = getMap(entity);
      for (const r of rows) {
        m.set(rowKey(entity, r), { ...r });
      }
    },
    update: async (entity, existing, patch) => {
      const m = getMap(entity);
      const k = rowKey(entity, existing);
      m.set(k, { ...existing, ...patch });
    },
  };
}

function emptyExisting(): ExistingData {
  return {
    sector: new Map(),
    country: new Map(),
    profession: new Map(),
    label: new Map(),
    list: new Map(),
    listItem: new Map(),
    field: new Map(),
    offering: new Map(),
    schema: new Map(),
  };
}

describe("Seed validation & Stage C guards", () => {
  it("rejects registration fields placed in an unregulated profession schema", () => {
    const bundle: SeedBundle = {
      id: "test-bundle",
      version: 1,
      sectors: [{ slug: "tech", label: { en: "Technology" } }],
      professions: [
        {
          slug: "software-dev",
          sector: "tech",
          label: { en: "Developer" },
          labelPlural: { en: "Developers" },
          status: "live",
          isRegulated: false, // UNREGULATED
        },
      ],
      fields: [
        {
          key: "licenceNumber",
          type: "text",
          label: { en: "Licence" },
          whyAsked: { en: "Verification" },
          category: "registration", // REGISTRATION CATEGORY
          purposeNote: "Licence note",
        },
      ],
      stepTitles: { "step-licence": { en: "Licensing" } },
      schemas: [
        {
          profession: "software-dev",
          version: 1,
          steps: [
            {
              key: "step-licence",
              fields: [{ key: "licenceNumber" }],
            },
          ],
        },
      ],
    };

    const problems = validateBundle(bundle, emptyExisting());
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0]).toMatch(/registration field "licenceNumber" is not allowed/);
  });

  it("requires English label on all sectors, professions, and fields", () => {
    const bundle: SeedBundle = {
      id: "bad-labels",
      version: 1,
      sectors: [{ slug: "tech", label: {} }], // missing "en"
    };
    const problems = validateBundle(bundle, emptyExisting());
    expect(problems.some((p) => p.includes('missing "en" label'))).toBe(true);
  });
});

describe("applyBundle Idempotency & Audit", () => {
  const sampleBundle: SeedBundle = {
    id: "bundle-1",
    version: 1,
    sectors: [{ slug: "healthcare", label: { en: "Healthcare" } }],
    professions: [
      {
        slug: "doctor",
        sector: "healthcare",
        label: { en: "Doctor" },
        labelPlural: { en: "Doctors" },
        status: "live",
        isRegulated: true,
      },
    ],
    countries: [
      { iso2: "NG", name: { en: "Nigeria" }, canBeOrigin: true },
      { iso2: "GB", name: { en: "United Kingdom" }, canBeDestination: true },
    ],
    offerings: [
      { profession: "doctor", origin: "NG", destination: "GB", status: "beta" },
    ],
  };

  it("applies changes on first run, records audit events, and is a no-op on second run", async () => {
    const store = createInMemorySeedStore();
    const recordedEvents: AuditInput[] = [];
    const audit: AuditSink = {
      record: async (events) => {
        recordedEvents.push(...events);
      },
    };

    // First run
    const result1 = await applyBundle(sampleBundle, {
      store,
      audit,
      actorRef: "system:test",
    });

    expect(result1.changes.length).toBeGreaterThan(0);
    expect(recordedEvents.length).toBe(result1.changes.length);

    // Second run with the same bundle
    const result2 = await applyBundle(sampleBundle, {
      store,
      audit,
      actorRef: "system:test",
    });

    expect(result2.changes.length).toBe(0);
    expect(result2.unchanged).toBeGreaterThan(0);
  });

  it("validates and applies the actual launch bundle and test-profession fixture in-memory", async () => {
    const launchBundle = (await import("../../seed/reference/index")).default;
    const testProfessionBundle = (await import("../../seed/fixtures/test-profession/index")).default;

    const store = createInMemorySeedStore();
    const audit: AuditSink = { record: async () => {} };

    // 1. Validate launch bundle
    const launchProblems = validateBundle(launchBundle, emptyExisting());
    expect(launchProblems).toEqual([]);

    // 2. Apply launch bundle
    const launchRes = await applyBundle(launchBundle, { store, audit, actorRef: "system:test" });
    expect(launchRes.changes.length).toBeGreaterThan(0);

    // 3. Idempotency of launch bundle
    const launchRes2 = await applyBundle(launchBundle, { store, audit, actorRef: "system:test" });
    expect(launchRes2.changes.length).toBe(0);

    // 4. Apply test-profession fixture bundle on top of existing data
    const fixtureRes = await applyBundle(testProfessionBundle, { store, audit, actorRef: "system:test" });
    expect(fixtureRes.changes.length).toBeGreaterThan(0);

    // 5. Idempotency of fixture bundle
    const fixtureRes2 = await applyBundle(testProfessionBundle, { store, audit, actorRef: "system:test" });
    expect(fixtureRes2.changes.length).toBe(0);
  });
});

