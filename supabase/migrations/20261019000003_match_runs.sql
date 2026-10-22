-- Migration: 20261019000003_match_runs.sql
-- Review Pathway Matches Flow persistence:
-- match_runs, match_results, RLS policies and save_match_run security definer function.

-- 1. match_runs table
CREATE TABLE IF NOT EXISTS "match_runs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES auth.users("id") ON DELETE CASCADE,
  "profile_snapshot" JSONB NOT NULL,
  "profile_hash" TEXT NOT NULL,
  "engine_version" TEXT NOT NULL,
  "content_fingerprint" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "match_runs_user_id_created_at_idx"
  ON "match_runs" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "match_runs_profile_hash_content_fingerprint_idx"
  ON "match_runs" ("user_id", "profile_hash", "content_fingerprint");

-- 2. match_results table
CREATE TABLE IF NOT EXISTS "match_results" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "run_id" UUID NOT NULL REFERENCES "match_runs"("id") ON DELETE CASCADE,
  "pathway_id" UUID NOT NULL REFERENCES "pathways"("id") ON DELETE CASCADE,
  "pathway_version_id" UUID NOT NULL REFERENCES "pathway_versions"("id") ON DELETE CASCADE,
  "status" TEXT NOT NULL CHECK ("status" IN ('requirement_unmet', 'potential_blocker', 'more_info_needed', 'potential_match')),
  "criteria" JSONB NOT NULL,
  "missing" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "sort_rank" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "match_results_run_id_idx"
  ON "match_results" ("run_id");

CREATE INDEX IF NOT EXISTS "match_results_pathway_id_idx"
  ON "match_results" ("pathway_id");

CREATE INDEX IF NOT EXISTS "match_results_pathway_version_id_idx"
  ON "match_results" ("pathway_version_id");

-- 3. Row Level Security
ALTER TABLE "match_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "match_results" ENABLE ROW LEVEL SECURITY;

-- match_runs policies: user can read their own rows; insert permitted only for self; no update or delete
DROP POLICY IF EXISTS "Users can read own match runs" ON "match_runs";
CREATE POLICY "Users can read own match runs"
  ON "match_runs"
  FOR SELECT
  TO authenticated
  USING ("user_id" = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own match runs" ON "match_runs";
CREATE POLICY "Users can insert own match runs"
  ON "match_runs"
  FOR INSERT
  TO authenticated
  WITH CHECK ("user_id" = (SELECT auth.uid()));

-- match_results policies: user can read only rows belonging to their own runs
DROP POLICY IF EXISTS "Users can read own match results" ON "match_results";
CREATE POLICY "Users can read own match results"
  ON "match_results"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "match_runs"
      WHERE "match_runs"."id" = "match_results"."run_id"
        AND "match_runs"."user_id" = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert match results for own runs" ON "match_results";
CREATE POLICY "Users can insert match results for own runs"
  ON "match_results"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "match_runs"
      WHERE "match_runs"."id" = "match_results"."run_id"
        AND "match_runs"."user_id" = (SELECT auth.uid())
    )
  );

-- 4. Atomic save_match_run security definer function
CREATE OR REPLACE FUNCTION "save_match_run"(
  p_user_id UUID,
  p_profile_snapshot JSONB,
  p_profile_hash TEXT,
  p_engine_version TEXT,
  p_content_fingerprint TEXT,
  p_results JSONB,
  p_cooldown_seconds INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_uid UUID;
  v_latest_run_id UUID;
  v_latest_created_at TIMESTAMPTZ;
  v_latest_profile_hash TEXT;
  v_latest_fingerprint TEXT;
  v_elapsed_seconds NUMERIC;
  v_new_run_id UUID;
  v_item JSONB;
  v_rank INT := 0;
BEGIN
  -- Authenticate caller
  v_caller_uid := auth.uid();
  IF v_caller_uid IS NULL OR v_caller_uid <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: Caller must own the profile';
  END IF;

  -- Check latest run for this user
  SELECT "id", "created_at", "profile_hash", "content_fingerprint"
  INTO v_latest_run_id, v_latest_created_at, v_latest_profile_hash, v_latest_fingerprint
  FROM "match_runs"
  WHERE "user_id" = p_user_id
  ORDER BY "created_at" DESC
  LIMIT 1;

  IF v_latest_run_id IS NOT NULL THEN
    v_elapsed_seconds := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - v_latest_created_at));

    -- If profile and content are identical, return existing run (powers 'Nothing has changed')
    IF v_latest_profile_hash = p_profile_hash AND v_latest_fingerprint = p_content_fingerprint THEN
      RETURN jsonb_build_object(
        'runId', v_latest_run_id,
        'changed', false,
        'message', 'Nothing has changed since last evaluation.'
      );
    END IF;

    -- If inputs changed but user is within cooldown window, enforce cooldown
    IF v_elapsed_seconds < p_cooldown_seconds THEN
      RAISE EXCEPTION 'Cooldown active. Please wait % seconds before checking again.',
        CEIL(p_cooldown_seconds - v_elapsed_seconds);
    END IF;
  END IF;

  -- Insert new run atomically
  INSERT INTO "match_runs" (
    "user_id",
    "profile_snapshot",
    "profile_hash",
    "engine_version",
    "content_fingerprint"
  ) VALUES (
    p_user_id,
    p_profile_snapshot,
    p_profile_hash,
    p_engine_version,
    p_content_fingerprint
  ) RETURNING "id" INTO v_new_run_id;

  -- Insert each result item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_results)
  LOOP
    v_rank := v_rank + 1;
    INSERT INTO "match_results" (
      "run_id",
      "pathway_id",
      "pathway_version_id",
      "status",
      "criteria",
      "missing",
      "sort_rank"
    ) VALUES (
      v_new_run_id,
      (v_item->>'pathwayId')::UUID,
      (v_item->>'pathwayVersionId')::UUID,
      v_item->>'status',
      COALESCE(v_item->'criteria', '[]'::jsonb),
      COALESCE(v_item->'missing', '[]'::jsonb),
      v_rank
    );
  END LOOP;

  RETURN jsonb_build_object(
    'runId', v_new_run_id,
    'changed', true,
    'message', 'New match evaluation recorded.'
  );
END;
$$;
