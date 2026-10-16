import type { AuditSink } from "@/modules/audit/service";
import type { SeedBundle } from "./bundle";
import { APPLY_ORDER, buildDesired, type Desired, type EntityName, type Row } from "./desired";
import { SeedValidationError, validateBundle, type ExistingData } from "./validate";

/** Persistence port for the seed runner (Prisma in production, in-memory in tests). */
export interface SeedStore {
  /** All rows of an entity, keyed by `rowKey`. */
  load(entity: EntityName): Promise<Map<string, Row>>;
  insertMany(entity: EntityName, rows: Row[]): Promise<void>;
  update(entity: EntityName, existing: Row, patch: Row): Promise<void>;
}

export type SeedChange = {
  entity: EntityName;
  key: string;
  kind: "created" | "updated";
  /** For updates: field -> [before, after]. */
  fields?: Record<string, [unknown, unknown]>;
};

export type SeedResult = {
  bundleId: string;
  dryRun: boolean;
  changes: SeedChange[];
  unchanged: number;
};

export type SeedDeps = {
  store: SeedStore;
  audit: AuditSink;
  actorRef: string;
  now?: () => Date;
  dryRun?: boolean;
};

function stable(v: unknown): string {
  return JSON.stringify(v, (_k, val) => {
    if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      return Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)));
    }
    return val === undefined ? null : val;
  });
}

const same = (a: unknown, b: unknown) => stable(a ?? null) === stable(b ?? null);

async function loadExisting(store: SeedStore): Promise<ExistingData> {
  const entries = await Promise.all(
    APPLY_ORDER.map(async (e) => [e, await store.load(e)] as const),
  );
  return Object.fromEntries(entries) as ExistingData;
}

/**
 * Idempotent: applying the same bundle twice changes nothing the second time. Only fields
 * the bundle owns are compared; rows absent from the bundle are never touched or deleted.
 * Published profile-schema versions are immutable: a changed definition must be a new version.
 */
export async function applyBundle(bundle: SeedBundle, deps: SeedDeps): Promise<SeedResult> {
  const now = (deps.now ?? (() => new Date()))();
  const existing = await loadExisting(deps.store);

  const problems = validateBundle(bundle, existing);
  if (problems.length) throw new SeedValidationError(problems);

  const desired = buildDesired(bundle, now);
  const changes: SeedChange[] = [];
  const inserts: [EntityName, Row[]][] = [];
  const updates: [EntityName, Row, Row][] = [];
  let unchanged = 0;

  for (const entity of APPLY_ORDER) {
    const current = existing[entity];
    const toInsert: Row[] = [];
    for (const d of desired[entity] as Desired[]) {
      const row = current.get(d.key);
      if (!row) {
        toInsert.push({ ...(d.defaults ?? {}), ...d.row });
        changes.push({ entity, key: d.key, kind: "created" });
        continue;
      }

      const patch: Row = {};
      const fields: Record<string, [unknown, unknown]> = {};
      for (const [k, v] of Object.entries(d.row)) {
        if (!same(row[k], v)) {
          patch[k] = v;
          fields[k] = [row[k] ?? null, v];
        }
      }
      for (const [k, v] of Object.entries(d.defaults ?? {})) {
        if (v != null && row[k] == null && !(k in d.row)) {
          patch[k] = v;
          fields[k] = [null, v];
        }
      }

      if (entity === "schema" && "steps" in patch) {
        throw new SeedValidationError([
          `[${bundle.id}] profile schema ${d.key} already exists with a different definition; publish a new version instead of editing one`,
        ]);
      }

      if (Object.keys(patch).length === 0) {
        unchanged++;
        continue;
      }
      updates.push([entity, row, patch]);
      changes.push({ entity, key: d.key, kind: "updated", fields });
    }
    if (toInsert.length) inserts.push([entity, toInsert]);
  }

  if (!deps.dryRun) {
    // Parents first (APPLY_ORDER) so foreign keys hold; updates last, they never add rows.
    for (const [entity, rows] of inserts) await deps.store.insertMany(entity, rows);
    for (const [entity, row, patch] of updates) await deps.store.update(entity, row, patch);
    await deps.audit.record(
      changes.map((c) => ({
        action: `reference.${c.entity}.${c.kind}`,
        entityType: c.entity,
        entityKey: c.key,
        actorRef: deps.actorRef,
        metadata: { bundle: bundle.id, bundleVersion: bundle.version, ...(c.fields ? { fields: c.fields } : {}) },
      })),
    );
  }

  return { bundleId: bundle.id, dryRun: !!deps.dryRun, changes, unchanged };
}

export function summarize(result: SeedResult): string {
  const byEntity = new Map<string, { created: number; updated: number }>();
  for (const c of result.changes) {
    const e = byEntity.get(c.entity) ?? { created: 0, updated: 0 };
    e[c.kind]++;
    byEntity.set(c.entity, e);
  }
  const lines = [...byEntity].map(([e, n]) => `  ${e}: +${n.created} created, ~${n.updated} updated`);
  return [
    `${result.dryRun ? "[dry run] " : ""}bundle "${result.bundleId}": ${result.changes.length} change(s), ${result.unchanged} unchanged`,
    ...lines,
  ].join("\n");
}
