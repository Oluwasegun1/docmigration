-- AlterTable
ALTER TABLE "countries" ADD COLUMN     "calling_code" TEXT,
ADD COLUMN     "can_be_destination" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "can_be_origin" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "default_currency" CHAR(3),
ADD COLUMN     "default_time_zone" TEXT,
ADD COLUMN     "name_key" TEXT;

-- AlterTable
ALTER TABLE "professions" ADD COLUMN     "is_regulated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "label_key" TEXT,
ADD COLUMN     "label_plural_key" TEXT,
ADD COLUMN     "sector_id" TEXT,
ADD COLUMN     "sort_order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'hidden';

-- CreateTable
CREATE TABLE "sectors" (
    "slug" TEXT NOT NULL,
    "label_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sectors_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "offerings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profession_code" TEXT NOT NULL,
    "origin_country" CHAR(2) NOT NULL,
    "destination_country" CHAR(2),
    "status" TEXT NOT NULL DEFAULT 'hidden',
    "launched_at" TIMESTAMPTZ,
    "notes_internal" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_labels" (
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "reference_labels_pkey" PRIMARY KEY ("key","locale")
);

-- CreateTable
CREATE TABLE "reference_lists" (
    "key" TEXT NOT NULL,

    CONSTRAINT "reference_lists_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "reference_list_items" (
    "list_key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'live',

    CONSTRAINT "reference_list_items_pkey" PRIMARY KEY ("list_key","value")
);

-- CreateTable
CREATE TABLE "profile_fields" (
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label_key" TEXT NOT NULL,
    "why_asked_key" TEXT NOT NULL,
    "help_key" TEXT,
    "options_json" JSONB,
    "validation_json" JSONB,
    "sensitivity" TEXT NOT NULL DEFAULT 'standard',
    "category" TEXT NOT NULL DEFAULT 'general',
    "storage" TEXT NOT NULL DEFAULT 'answer',
    "storage_json" JSONB,
    "purpose_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_fields_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "profile_schemas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profession_code" TEXT,
    "origin_country" CHAR(2),
    "version" INTEGER NOT NULL DEFAULT 1,
    "steps" JSONB NOT NULL,
    "published_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_key" TEXT,
    "actor_ref" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offerings_profession_code_origin_country_idx" ON "offerings"("profession_code", "origin_country");

-- CreateIndex
CREATE INDEX "profile_schemas_profession_code_origin_country_idx" ON "profile_schemas"("profession_code", "origin_country");

-- CreateIndex
CREATE INDEX "audit_events_action_created_at_idx" ON "audit_events"("action", "created_at");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_key_idx" ON "audit_events"("entity_type", "entity_key");

-- AddForeignKey
ALTER TABLE "professions" ADD CONSTRAINT "professions_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_profession_code_fkey" FOREIGN KEY ("profession_code") REFERENCES "professions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_origin_country_fkey" FOREIGN KEY ("origin_country") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_destination_country_fkey" FOREIGN KEY ("destination_country") REFERENCES "countries"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_list_items" ADD CONSTRAINT "reference_list_items_list_key_fkey" FOREIGN KEY ("list_key") REFERENCES "reference_lists"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_schemas" ADD CONSTRAINT "profile_schemas_profession_code_fkey" FOREIGN KEY ("profession_code") REFERENCES "professions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Hand-written additions (not expressible in schema.prisma)
-- ---------------------------------------------------------------------------

-- Keep existing rows meaningful: mirror the old is_active flag into status.
UPDATE "professions" SET "status" = CASE WHEN "is_active" THEN 'live' ELSE 'hidden' END;

-- Small fixed vocabularies. Professions/countries/sectors themselves are NEVER constrained
-- to a list of values: they are rows.
ALTER TABLE "professions" ADD CONSTRAINT "professions_status_chk"
  CHECK ("status" IN ('live', 'beta', 'waitlist', 'hidden'));
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_status_chk"
  CHECK ("status" IN ('live', 'beta', 'waitlist', 'hidden'));
ALTER TABLE "reference_list_items" ADD CONSTRAINT "reference_list_items_status_chk"
  CHECK ("status" IN ('live', 'hidden'));
ALTER TABLE "profile_fields" ADD CONSTRAINT "profile_fields_type_chk"
  CHECK ("type" IN ('text', 'number', 'date', 'select', 'multiselect', 'boolean', 'country'));
ALTER TABLE "profile_fields" ADD CONSTRAINT "profile_fields_storage_chk"
  CHECK ("storage" IN ('answer', 'user_country'));
ALTER TABLE "profile_fields" ADD CONSTRAINT "profile_fields_sensitivity_chk"
  CHECK ("sensitivity" IN ('standard', 'sensitive'));
ALTER TABLE "profile_fields" ADD CONSTRAINT "profile_fields_why_asked_chk"
  CHECK (length("why_asked_key") > 0);
ALTER TABLE "profile_schemas" ADD CONSTRAINT "profile_schemas_origin_needs_profession_chk"
  CHECK ("origin_country" IS NULL OR "profession_code" IS NOT NULL);
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_origin_ne_destination_chk"
  CHECK ("destination_country" IS NULL OR "destination_country" <> "origin_country");
ALTER TABLE "countries" ADD CONSTRAINT "countries_code_chk" CHECK ("code" ~ '^[A-Z]{2}$');

-- One row per (profession, origin, destination); NULL destination = "any" counts as a value.
CREATE UNIQUE INDEX "offerings_triple_uidx"
  ON "offerings" ("profession_code", "origin_country", COALESCE("destination_country", '--'));
CREATE UNIQUE INDEX "profile_schemas_scope_version_uidx"
  ON "profile_schemas" (COALESCE("profession_code", ''), COALESCE("origin_country", '--'), "version");

-- ---------------------------------------------------------------------------
-- Row Level Security. Supabase exposes `public` tables through PostgREST, so every new
-- table is locked down with NO policies: the anon/authenticated roles can read nothing,
-- which guarantees `hidden` professions cannot leak through that side door. The app reads
-- these tables server-side through Prisma (table owner) and serves them via /api/v1/meta/*.
-- ---------------------------------------------------------------------------
ALTER TABLE "sectors"              ENABLE ROW LEVEL SECURITY;
ALTER TABLE "offerings"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reference_labels"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reference_lists"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reference_list_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profile_fields"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profile_schemas"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_events"         ENABLE ROW LEVEL SECURITY;
