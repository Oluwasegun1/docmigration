-- Migration: 20261017000002_pathways_and_plans.sql
-- PRD v1.1 Schema additions: Pathway versions, immutable criteria, sources,
-- task templates with acyclic dependencies, assessment runs, migration plans,
-- plan tasks, and intake answers.

-- Alter pathways to match PRD v1.1 data model
ALTER TABLE "pathways"
  ADD COLUMN IF NOT EXISTS "profession_id" TEXT,
  ADD COLUMN IF NOT EXISTS "origin_country" CHAR(2),
  ADD COLUMN IF NOT EXISTS "destination_country" CHAR(2),
  ADD COLUMN IF NOT EXISTS "category_label_key" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'hidden',
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Populate new columns if existing pathways exist
UPDATE "pathways"
SET "profession_id" = "profession",
    "destination_country" = "country",
    "origin_country" = 'NG',
    "category_label_key" = 'pathway.category.general'
WHERE "profession_id" IS NULL;

-- Add foreign key constraints on pathways if not already existing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pathways_profession_id_fkey'
  ) THEN
    ALTER TABLE "pathways"
      ADD CONSTRAINT "pathways_profession_id_fkey"
      FOREIGN KEY ("profession_id") REFERENCES "professions"("code") ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pathways_origin_country_fkey'
  ) THEN
    ALTER TABLE "pathways"
      ADD CONSTRAINT "pathways_origin_country_fkey"
      FOREIGN KEY ("origin_country") REFERENCES "countries"("code") ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pathways_destination_country_fkey'
  ) THEN
    ALTER TABLE "pathways"
      ADD CONSTRAINT "pathways_destination_country_fkey"
      FOREIGN KEY ("destination_country") REFERENCES "countries"("code") ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "pathways_profession_id_origin_country_destination_country_idx"
  ON "pathways" ("profession_id", "origin_country", "destination_country");

-- 1. Pathway versions
CREATE TABLE IF NOT EXISTS "pathway_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pathway_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "published_at" TIMESTAMPTZ,
  "superseded_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pathway_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pathway_versions_pathway_id_fkey" FOREIGN KEY ("pathway_id") REFERENCES "pathways"("id") ON DELETE CASCADE,
  CONSTRAINT "pathway_versions_pathway_id_version_key" UNIQUE ("pathway_id", "version")
);

CREATE INDEX IF NOT EXISTS "pathway_versions_pathway_id_status_idx"
  ON "pathway_versions" ("pathway_id", "status");

-- 2. Sources
CREATE TABLE IF NOT EXISTS "sources" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "url" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "publisher" TEXT NOT NULL,
  "verified_at" TIMESTAMPTZ NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'live',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- 3. Criteria
CREATE TABLE IF NOT EXISTS "criteria" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pathway_version_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "profile_field" TEXT NOT NULL,
  "operator" TEXT NOT NULL,
  "expected" JSONB NOT NULL,
  "mandatory" BOOLEAN NOT NULL DEFAULT true,
  "source_id" UUID NOT NULL,
  "explanation_key" TEXT NOT NULL,
  "verified_at" TIMESTAMPTZ NOT NULL,
  "is_placeholder" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "criteria_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "criteria_pathway_version_id_fkey" FOREIGN KEY ("pathway_version_id") REFERENCES "pathway_versions"("id") ON DELETE CASCADE,
  CONSTRAINT "criteria_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT,
  CONSTRAINT "criteria_profile_field_fkey" FOREIGN KEY ("profile_field") REFERENCES "profile_fields"("key") ON DELETE RESTRICT,
  CONSTRAINT "criteria_pathway_version_id_key_key" UNIQUE ("pathway_version_id", "key")
);

-- 4. Task Templates
CREATE TABLE IF NOT EXISTS "task_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pathway_version_id" UUID NOT NULL,
  "key" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "title_key" TEXT NOT NULL,
  "body_key" TEXT NOT NULL,
  "intake_key" TEXT,
  "intake_group" TEXT,
  "intake_order" INTEGER NOT NULL DEFAULT 0,
  "ask_at_intake" BOOLEAN NOT NULL DEFAULT true,
  "is_irreversible_payment" BOOLEAN NOT NULL DEFAULT false,
  "source_id" UUID NOT NULL,
  "is_placeholder" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "task_templates_pathway_version_id_fkey" FOREIGN KEY ("pathway_version_id") REFERENCES "pathway_versions"("id") ON DELETE CASCADE,
  CONSTRAINT "task_templates_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT,
  CONSTRAINT "task_templates_pathway_version_id_key_key" UNIQUE ("pathway_version_id", "key")
);

-- Task Template Dependencies
CREATE TABLE IF NOT EXISTS "task_template_dependencies" (
  "task_template_id" UUID NOT NULL,
  "depends_on_id" UUID NOT NULL,
  CONSTRAINT "task_template_dependencies_pkey" PRIMARY KEY ("task_template_id", "depends_on_id"),
  CONSTRAINT "task_template_dependencies_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "task_templates"("id") ON DELETE CASCADE,
  CONSTRAINT "task_template_dependencies_depends_on_id_fkey" FOREIGN KEY ("depends_on_id") REFERENCES "task_templates"("id") ON DELETE CASCADE
);

-- 5. Assessment Runs
CREATE TABLE IF NOT EXISTS "assessment_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "pathway_version_id" UUID NOT NULL,
  "status" TEXT NOT NULL,
  "criteria_results" JSONB NOT NULL,
  "missing_fields" JSONB NOT NULL,
  "assessed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "profile_hash" TEXT NOT NULL,
  CONSTRAINT "assessment_runs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assessment_runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "assessment_runs_pathway_version_id_fkey" FOREIGN KEY ("pathway_version_id") REFERENCES "pathway_versions"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "assessment_runs_user_id_pathway_version_id_idx"
  ON "assessment_runs" ("user_id", "pathway_version_id");

-- 6. Migration Plans
CREATE TABLE IF NOT EXISTS "migration_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "pathway_version_id" UUID NOT NULL,
  "pending_update" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "migration_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "migration_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "migration_plans_pathway_version_id_fkey" FOREIGN KEY ("pathway_version_id") REFERENCES "pathway_versions"("id") ON DELETE RESTRICT,
  CONSTRAINT "migration_plans_user_id_pathway_version_id_key" UNIQUE ("user_id", "pathway_version_id")
);

CREATE INDEX IF NOT EXISTS "migration_plans_user_id_idx"
  ON "migration_plans" ("user_id");

-- 7. Plan Tasks (recreated for MigrationPlan)
DROP TABLE IF EXISTS "plan_task_dependencies" CASCADE;
DROP TABLE IF EXISTS "plan_requirements" CASCADE;
DROP TABLE IF EXISTS "plan_tasks" CASCADE;
DROP TABLE IF EXISTS "plans" CASCADE;

CREATE TABLE "plan_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "origin_template_task_id" UUID,
  "template_key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'not_started',
  "verification_type" TEXT NOT NULL DEFAULT 'user_reported',
  "user_edited" BOOLEAN NOT NULL DEFAULT false,
  "review_needed" BOOLEAN NOT NULL DEFAULT false,
  "needs_confirmation" BOOLEAN NOT NULL DEFAULT false,
  "completed_month" TEXT,
  "due_date" DATE,
  "note" TEXT,
  "not_applicable_reason" TEXT,
  "waiting_on_text" TEXT,
  "blocked_by" JSONB,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_irreversible_payment" BOOLEAN NOT NULL DEFAULT false,
  "source_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "plan_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "plan_tasks_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "migration_plans"("id") ON DELETE CASCADE,
  CONSTRAINT "plan_tasks_origin_template_task_id_fkey" FOREIGN KEY ("origin_template_task_id") REFERENCES "task_templates"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "plan_tasks_plan_id_status_idx"
  ON "plan_tasks" ("plan_id", "status");

-- 8. Intake Answers
CREATE TABLE IF NOT EXISTS "intake_answers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "plan_id" UUID NOT NULL,
  "task_template_id" UUID NOT NULL,
  "answer" TEXT NOT NULL,
  "completed_month" TEXT,
  "note" TEXT,
  "answered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "intake_answers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "intake_answers_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "migration_plans"("id") ON DELETE CASCADE,
  CONSTRAINT "intake_answers_task_template_id_fkey" FOREIGN KEY ("task_template_id") REFERENCES "task_templates"("id") ON DELETE CASCADE,
  CONSTRAINT "intake_answers_plan_id_task_template_id_key" UNIQUE ("plan_id", "task_template_id")
);
