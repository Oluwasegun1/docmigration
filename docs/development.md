# Development

## Prerequisites

Node.js ≥ 20.19 (developed on 24), npm.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Without Supabase variables the app still runs; the homepage shows which variables are missing and `GET /api/health` reports `supabaseConfigured: false`.

## Create and connect a Supabase project

1. Create a project at https://supabase.com (one per environment: dev, staging, prod).
2. In **Project Settings → API**, copy the project URL and publishable (or legacy anon) key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
3. Copy the service-role key into `SUPABASE_SERVICE_ROLE_KEY` only if a server task needs it. It must never be prefixed `NEXT_PUBLIC_`.
4. Restart `npm run dev`. Connectivity is not verified by the app yet because no tables exist.

For fully local work use the Supabase CLI (`supabase start`); see [database.md](database.md).

## Conventions

- Files: `kebab-case.ts(x)`. Components: `PascalCase`. Types/schemas: `PascalCase` / `camelCaseSchema`. Functions: `camelCase`.
- Server Components by default; add `"use client"` only for interactivity.
- Validate inputs with Zod at boundaries; route handlers stay thin and delegate to `server/services`.
- Return errors via `AppError` / `toErrorResponse` from `src/lib/errors`.
- Authorization lives in `server/policies`; database access only in `server/repositories`.
- Accessible, mobile-first UI; include loading, empty and error states.

## Quality checks

`npm run check` runs lint, type-check, unit tests and a production build. Run `npm run test:e2e` after `npx playwright install chromium`. CI should run the same commands.

## Environments

`APP_ENV` is `development | staging | production`. Each environment has its own Supabase project and secrets.
