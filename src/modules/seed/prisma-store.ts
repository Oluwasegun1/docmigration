import { Prisma, type PrismaClient } from "@prisma/client";
import { rowKey, type EntityName, type Row } from "./desired";
import type { SeedStore } from "./runner";

type Tx = Prisma.TransactionClient | PrismaClient;

type Delegate = {
  findMany(): Promise<Row[]>;
  createMany(args: { data: Row[] }): Promise<unknown>;
  update(args: { where: Row; data: Row }): Promise<unknown>;
};

const JSON_COLUMNS: Partial<Record<EntityName, string[]>> = {
  field: ["optionsJson", "validationJson", "storageJson"],
  schema: ["steps"],
};

function delegates(db: Tx): Record<EntityName, Delegate> {
  return {
    sector: db.sector,
    country: db.country,
    profession: db.profession,
    label: db.referenceLabel,
    list: db.referenceList,
    listItem: db.referenceListItem,
    field: db.profileField,
    offering: db.offering,
    schema: db.profileSchema,
  } as unknown as Record<EntityName, Delegate>;
}

function whereFor(entity: EntityName, r: Row): Row {
  switch (entity) {
    case "sector":
      return { slug: r.slug };
    case "country":
    case "profession":
      return { code: r.code };
    case "label":
      return { key_locale: { key: r.key, locale: r.locale } };
    case "list":
    case "field":
      return { key: r.key };
    case "listItem":
      return { listKey_value: { listKey: r.listKey, value: r.value } };
    case "offering":
    case "schema":
      return { id: r.id };
  }
}

/** JSON columns need explicit DbNull for SQL NULL. */
function prep(entity: EntityName, row: Row): Row {
  const out: Row = { ...row };
  for (const col of JSON_COLUMNS[entity] ?? []) {
    if (col in out && out[col] == null) out[col] = Prisma.DbNull;
  }
  return out;
}

export function createPrismaSeedStore(db: Tx): SeedStore {
  const d = delegates(db);
  return {
    async load(entity) {
      const rows = await d[entity].findMany();
      return new Map(rows.map((r) => [rowKey(entity, r), r]));
    },
    async insertMany(entity, rows) {
      // Chunked so very large inserts (e.g. all ISO labels) stay under parameter limits.
      for (let i = 0; i < rows.length; i += 500) {
        await d[entity].createMany({ data: rows.slice(i, i + 500).map((r) => prep(entity, r)) });
      }
    },
    async update(entity, existing, patch) {
      await d[entity].update({ where: whereFor(entity, existing), data: prep(entity, patch) });
    },
  };
}
