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
    "code" TEXT NOT NULL,
    "label_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "reference_list_items_pkey" PRIMARY KEY ("list_key","code")
);

-- CreateTable
CREATE TABLE "profile_field_groups" (
    "slug" TEXT NOT NULL,
    "title_key" TEXT NOT NULL,
    "description_key" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "profile_field_groups_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "profile_fields" (
    "code" TEXT NOT NULL,
    "group_slug" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "label_key" TEXT NOT NULL,
    "help_text_key" TEXT,
    "placeholder_key" TEXT,
    "validation_rules_json" JSONB,
    "reference_list_key" TEXT,
    "applies_to_profession_code" TEXT,
    "applies_to_country_code" CHAR(2),
    "applies_to_country_role" TEXT,
    "visibility_rule_json" JSONB,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'live',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_fields_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "seed_bundles" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "applied_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seed_bundles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offerings_profession_code_origin_country_destination_count_key" ON "offerings"("profession_code", "origin_country", "destination_country");

-- CreateIndex
CREATE INDEX "reference_labels_key_idx" ON "reference_labels"("key");

-- CreateIndex
CREATE INDEX "profile_fields_applies_to_profession_code_idx" ON "profile_fields"("applies_to_profession_code");

-- CreateIndex
CREATE INDEX "profile_fields_applies_to_country_code_applies_to_country_idx" ON "profile_fields"("applies_to_country_code", "applies_to_country_role");

-- AddForeignKey
ALTER TABLE "professions" ADD CONSTRAINT "professions_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_profession_code_fkey" FOREIGN KEY ("profession_code") REFERENCES "professions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_origin_country_fkey" FOREIGN KEY ("origin_country") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offerings" ADD CONSTRAINT "offerings_destination_country_fkey" FOREIGN KEY ("destination_country") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_list_items" ADD CONSTRAINT "reference_list_items_list_key_fkey" FOREIGN KEY ("list_key") REFERENCES "reference_lists"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_fields" ADD CONSTRAINT "profile_fields_group_slug_fkey" FOREIGN KEY ("group_slug") REFERENCES "profile_field_groups"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_fields" ADD CONSTRAINT "profile_fields_reference_list_key_fkey" FOREIGN KEY ("reference_list_key") REFERENCES "reference_lists"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_fields" ADD CONSTRAINT "profile_fields_applies_to_profession_code_fkey" FOREIGN KEY ("applies_to_profession_code") REFERENCES "professions"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_fields" ADD CONSTRAINT "profile_fields_applies_to_country_code_fkey" FOREIGN KEY ("applies_to_country_code") REFERENCES "countries"("code") ON DELETE CASCADE ON UPDATE CASCADE;
