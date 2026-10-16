import type { PrismaClient } from "@prisma/client";

export type ProfileSchemaRow = {
  professionCode: string | null;
  originCountry: string | null;
  version: number;
  steps: unknown;
};

export type ProfileFieldRow = {
  key: string;
  type: string;
  labelKey: string;
  whyAskedKey: string;
  helpKey: string | null;
  optionsJson: unknown;
  validationJson: unknown;
  sensitivity: string;
  category: string;
  storage: string;
  storageJson: unknown;
};

export type ListItemRow = {
  listKey: string;
  value: string;
  labelKey: string;
  sortOrder: number;
  status: string;
};

export interface ProfileRegistryRepository {
  /** Published schemas that could apply: (profession+origin), (profession), or default. */
  listPublishedSchemas(profession: string, origin: string | null): Promise<ProfileSchemaRow[]>;
  getFields(keys: string[]): Promise<ProfileFieldRow[]>;
  getListItems(listKeys: string[]): Promise<ListItemRow[]>;
}

export function createPrismaProfileRegistryRepository(db: PrismaClient): ProfileRegistryRepository {
  return {
    listPublishedSchemas: (profession, origin) =>
      db.profileSchema.findMany({
        where: {
          publishedAt: { not: null, lte: new Date() },
          OR: [
            { professionCode: null, originCountry: null },
            { professionCode: profession, originCountry: null },
            ...(origin ? [{ professionCode: profession, originCountry: origin }] : []),
          ],
        },
        select: { professionCode: true, originCountry: true, version: true, steps: true },
      }),
    getFields: (keys) =>
      db.profileField.findMany({
        where: { key: { in: keys } },
        select: {
          key: true,
          type: true,
          labelKey: true,
          whyAskedKey: true,
          helpKey: true,
          optionsJson: true,
          validationJson: true,
          sensitivity: true,
          category: true,
          storage: true,
          storageJson: true,
        },
      }),
    getListItems: (listKeys) =>
      listKeys.length === 0
        ? Promise.resolve([])
        : db.referenceListItem.findMany({
            where: { listKey: { in: listKeys } },
            select: { listKey: true, value: true, labelKey: true, sortOrder: true, status: true },
          }),
  };
}
