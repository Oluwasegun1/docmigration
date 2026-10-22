# Architecture

Migration Hub (product name: Naija Doctor Migration Hub) is a web app and PWA that helps medical professionals plan international career transitions using verified, source-backed data. It is a single Next.js modular monolith. No microservices.

## 1. Stack

Next.js (App Router) · React · TypeScript (strict) · Tailwind CSS v4 · shadcn-style accessible primitives (Radix) · React Hook Form + Zod · Supabase (Postgres, Auth, RLS) · Vitest · Playwright.

## 2. Navigation architecture

Flat navigation, no nested primary levels.

| Slot    | Route        | Purpose                                               | Primary button (exactly one)                                           |
| ------- | ------------ | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Home    | `/dashboard` | Status summary and the next step                      | "Continue: <next task>"                                                |
| Matches | `/matches`   | Review ranked, explainable pathway matches            | "Start a plan from this pathway" / "Check again"                       |
| Explore | `/explore`   | Destinations, pathways, requirements                  | "Add to my plan" (on a pathway) / "Choose a destination" (on the list) |
| Plan    | `/plan`      | Personal plan and tasks                               | "Do next task"                                                         |
| Ask     | `/ask`       | Q&A from approved sources (future, feature-flagged)   | "Ask a question"                                                       |
| More    | `/more`      | Menu: Cost planner, Profile, Reminders, Data controls | "Back to plan"                                                         |

More menu routes: `/more/cost-planner`, `/more/profile`, `/more/reminders`, `/more/data-controls`.

- **Mobile:** bottom tab bar with the four tabs and "More" (a fifth slot opening the menu), thumb-reachable.
- **Desktop:** same items in a left rail or header; no additional levels.
- Implemented once in `src/components/navigation` using a single typed config so tabs, the PWA shortcuts and tests share one source of truth. Active tab uses `aria-current="page"`.
- Unauthenticated visitors use `(public)` routes; `(dashboard)` routes require a session.

## 3. Core principles and how they are enforced

### Next step first

Every primary screen has exactly one primary button. Enforced by:

- A `PrimaryAction` component (`src/components/shared`) as the only way to render the primary-styled button on a screen; all other actions use `outline`/`ghost` variants.
- A Playwright check per primary screen asserting exactly one element with `data-primary-action`.
- The dashboard derives the next step from plan tasks via a pure function (`features/tasks`), which respects dependencies.

### Honest certainty

No requirement renders without a status label and verified date.

- `Requirement` data requires `status` (`verified | needs_review | outdated | unverified`) and `verified_at`. Database `NOT NULL` constraints and Zod schemas reject records missing either.
- The only way to render a requirement is `<RequirementCard>` (`features/regulatory-content/components`), whose props make `status` and `verifiedAt` required; unverified or stale (beyond a configured age) items show a visible warning and a distinct label, never silence.
- Screening outputs `met | not_met | unknown` and `potential_match | more_information_needed | potential_blocker`; unknown is never rounded into a yes or no. No invented probabilities.
- Unit tests cover the stale/unverified rendering rules.

### Show the source

Every requirement links to an official regulator source.

- Each requirement has one or more `source_references` (regulator URL, title, retrieved date). Publishing is blocked at the service and database layer if a requirement has none, or the domain is not on the approved regulator allow-list.
- `<RequirementCard>` always renders the source link (opens in a new tab with `rel="noopener noreferrer"`) and, offline, shows the cached source title and URL.
- Ask answers must cite approved sources, or decline to answer.

## 4. Layers and boundaries

| Layer        | Location                  | Responsibility                                                                                        | May import                            |
| ------------ | ------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Routes       | `src/app`                 | Routing and composition; Server Components by default; thin route handlers                            | components, features, server/services |
| UI           | `src/components`          | `ui/` primitives, `layout/` shell, `navigation/` tabs, `shared/` cross-feature pieces. No data access | lib/utils                             |
| Features     | `src/features/<name>`     | Feature UI, Zod schemas, pure domain rules, types                                                     | components, lib                       |
| Services     | `src/server/services`     | Use cases: validate, authorize via policies, call repositories                                        | policies, repositories                |
| Policies     | `src/server/policies`     | Authorization and ownership decisions (pure)                                                          | types                                 |
| Repositories | `src/server/repositories` | The only code touching Supabase tables                                                                | lib/supabase                          |
| Lib          | `src/lib`                 | Supabase clients, env, errors, security, `offline`, `autosave`                                        | no app layers                         |

Server-only modules import `server-only`. Client Components are used only for interactivity (tab bar state, forms, offline/autosave hooks).

## 5. Directory structure

```
src/
  app/
    layout.tsx  page.tsx  globals.css  error.tsx  loading.tsx  not-found.tsx
    (public)/            destinations/ ...
    (auth)/
    (dashboard)/
      dashboard/         # Home
      explore/
      plan/
      ask/
      more/
        cost-planner/  profile/  reminders/  data-controls/
    admin/               # reviewer/admin only, server-checked
    api/                 health/ ...
  components/
    ui/  layout/  navigation/  shared/
  features/
    auth/ profile/ destinations/ pathways/ plans/ tasks/ costs/
    documents/ regulatory-content/ notifications/ ask/
  lib/
    supabase/ env/ utils/ errors/ security/ offline/ autosave/
  server/
    services/ repositories/ policies/
  types/
supabase/   migrations/  seed.sql
tests/      unit/ integration/ e2e/
docs/       architecture.md database.md development.md security.md decisions/
```

## 6. Domain modules

1. **Identity and profile** (`auth`, `profile`): authentication, doctor profile, preferences, consent.
2. **Regulatory content** (`regulatory-content`, `destinations`, `pathways`): countries, authorities, pathways, requirements, source references, verification dates, version history. Data, not hardcoded UI. Published versions are immutable; significant changes create a new version.
3. **Pathway screening** (`pathways`): explicit deterministic rules; see Honest certainty.
4. **Migration planning** (`plans`, `tasks`): reviewed task templates, user plans, explicit dependencies with cycle prevention, proposed plan changes the user reviews before accepting.
5. **Costs** (`costs`, More → Cost planner): source-backed estimates separate from user budgets and expenses; every amount has a currency and provenance.
6. **Documents** (`documents`): checklists only, no uploads in V1.
7. **Notifications** (`notifications`, More → Reminders): reminders and alerts.
8. **Ask** (`ask`): future AI assistant (see section 9).
9. **Administration** (`app/admin`): roles, draft → review → publish, versioned content, audit events. Publishing needs an authorized reviewer.

## 7. Resilience and performance

Target: mid-range Android on slow or intermittent networks.

### Performance budget

- Server Components by default; ship minimal client JavaScript. Target under about 150 KB gzipped of JS on first load for primary routes, tracked in CI.
- Route-level code splitting; lazy-load Ask, charts and admin code.
- System-first font stack or one subsetted variable font with `font-display: swap`; responsive, lazy images; no layout shift.
- Skeleton loading states; avoid heavy animation; respect `prefers-reduced-motion`.
- Touch targets at least 44 px; test on a throttled CPU (4x) and Slow 4G profile.

### Offline caching of saved plans (PWA)

- Web app manifest and a service worker (added with a vetted tool such as Serwist when implemented; tracked in an ADR).
- Strategy: precache the app shell; **network-first with cache fallback** for plan data and regulatory content the user has saved; **stale-while-revalidate** for static assets.
- Saved plans, their tasks, and the referenced requirement snapshots (including status, verified date and source link) are mirrored to IndexedDB through `src/lib/offline`, keyed by user and plan version.
- Offline UI shows "Saved on this device, last synced <time>" and the verified date of each cached requirement, so staleness is never hidden.
- Offline edits to plans are queued and synced on reconnect with a visible state; conflicts show a review step rather than silently overwriting.
- On sign-out or "Delete local data" (More → Data controls) all cached private data and the service-worker caches are cleared. Private API responses are never cached in shared caches.

### Local autosave for forms

- `src/lib/autosave` provides a `useAutosave` hook for React Hook Form: debounced writes of draft values to IndexedDB (or `localStorage` for tiny forms), restored on return with a "Draft restored" notice and a "Discard draft" option.
- Drafts are namespaced by user ID and form ID, validated with the same Zod schema on restore, and cleared on successful submit.
- Sensitive fields (for example anything resembling identity numbers) are excluded from drafts. V1 collects none and never stores identity documents.

## 8. Security and privacy

Server-side authorization plus RLS for all user-owned data; secrets only on the server; security headers in `next.config.ts`; no identity uploads in V1. Details in [security.md](security.md). Local drafts and offline caches are private user data and are covered by the Data controls screen (export, clear device data, delete account).

## 9. Future AI (Ask)

AI is out of scope and no provider is installed. The Ask tab renders an honest "coming soon" state behind a feature flag. When built, it lives in an isolated server module (`src/server/ai`), answers only from approved regulatory sources with citations, protects private data, enforces usage limits, never influences screening rules or task dependencies, and never publishes content.

## 10. Quality gates

`npm run check` (lint, typecheck, unit tests, build) plus Playwright for: one primary action per screen, requirement cards always showing status, date and source, offline plan access, and draft restore.

## 11. Key decisions

- **Supabase client over Prisma:** one typed path, RLS-native.
- **Flat navigation:** reduces cognitive load for time-pressed clinicians.
- **Single `RequirementCard`:** makes "honest certainty" and "show the source" structurally impossible to bypass.
- **Offline via IndexedDB mirror:** the service worker caches the shell, application code owns data caching so it can be cleared and labelled accurately.
