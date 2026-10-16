# Database

Supabase PostgreSQL. No tables exist yet; this describes the proposed model and workflow.

## Proposed domain model

**Identity:** `profiles` (1:1 with `auth.users`), `user_preferences`, `consents`, `user_roles` (`user | reviewer | admin`).

**Regulatory content (versioned):** `countries`, `authorities`, `pathways`, `pathway_versions` (status `draft | in_review | published | archived`, `verified_at`, `verified_by`), `requirements` (per version, with machine-readable rule definition), `source_references` (URL, title, retrieved/verified dates), `cost_estimates` (`amount`, `currency`, source reference), `task_templates`, `task_template_dependencies`.

**User data:** `plans`, `plan_tasks`, `plan_task_dependencies`, `plan_change_proposals`, `screening_results`, `budgets`, `expenses` (`amount`, `currency`, `provenance`), `document_checklist_items`, `notifications`.

**Admin:** `audit_events` (append-only).

Rules: every amount has a `currency` column and provenance; published versions are immutable; dependency cycles are rejected (service check plus database constraint/trigger).

## Row Level Security

- RLS enabled on every table in the `public` schema, default deny.
- User-owned tables: policies on `auth.uid() = user_id`.
- Published regulatory content: readable by everyone; write only by reviewers/admins via role-checked server operations.
- No permissive "development" policies. Use a local Supabase stack with real policies.
- The service-role client bypasses RLS; use it only in audited server services after a role check.

## Migrations

1. Install the Supabase CLI and run `supabase init` (config is created alongside the existing `supabase/` folder) and `supabase start`.
2. Create: `supabase migration new <name>`; edit the SQL in `supabase/migrations/`.
3. Apply locally: `supabase db reset` (replays migrations and `seed.sql`).
4. Link and deploy: `supabase link --project-ref <ref>` then `supabase db push`.
5. Never edit an applied migration; add a new one. Migrations are reviewed in PRs. Regenerate types with `supabase gen types typescript` into `src/types/` once tables exist.

Use separate Supabase projects for development, staging and production.
