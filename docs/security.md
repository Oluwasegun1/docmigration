# Security and privacy

## Authentication and authorization

- Supabase Auth with cookie-based sessions via `@supabase/ssr`.
- Derive the user from the session on the server (`supabase.auth.getUser()`); **never trust a client-supplied user ID**.
- Two layers for private data: server-side ownership/role checks (`server/policies`) **and** database RLS.
- Administrative operations and publishing regulatory content require an authorized reviewer/admin role, checked server-side and recorded in `audit_events`.

## Row Level Security

Default deny on all `public` tables; explicit per-table policies; no permissive development policies. See [database.md](database.md).

## Secrets

- Only `NEXT_PUBLIC_*` values reach the browser, and only the Supabase URL/publishable key and site URL are public.
- `SUPABASE_SERVICE_ROLE_KEY` is read only in `src/lib/env/server.ts` and `src/lib/supabase/server.ts`, both guarded by `server-only`.
- `.env.local` is gitignored; `.env.example` holds placeholders only.
- Never log credentials, tokens or personal data. Error responses are masked for unknown errors.

## Headers

Set in `next.config.ts`: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`. A nonce-based Content-Security-Policy is a planned follow-up.

## Rate limiting (requirement, not yet implemented)

Auth endpoints, form submissions and any future AI endpoints must be rate limited per user/IP at the edge or via a shared store before launch. Implement in `src/lib/security`.

## Privacy

- **No identity-document uploads in V1**; document features are checklists only.
- Collect minimum personal data; record consent.
- Account deletion must remove or anonymize user-owned rows (cascade from `auth.users`) with a documented retention period for audit events.
- Regulatory content is not personal data; audit events avoid storing sensitive content.

## Future AI

Isolated server-side module, feature-flagged, cites approved sources, minimizes/redacts personal data, usage-limited, and can never publish content or influence eligibility rules.
