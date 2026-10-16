# Naija Doctor Migration Hub

A platform that helps Nigerian-trained and internationally trained doctors understand medical registration and migration pathways, plan next steps, track tasks and estimate costs.

> **Status:** initial foundation only. No regulatory content, persistence or AI features exist yet. Initial content (UK and Ireland) requires human verification before publication.

## Stack

Next.js (App Router) · React · TypeScript (strict) · Tailwind CSS v4 · shadcn-style UI primitives · React Hook Form + Zod · Supabase (Postgres, Auth, RLS) · Vitest · Playwright · ESLint · Prettier.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase values (optional to start)
npm run dev                  # http://localhost:3000
```

The app starts without Supabase credentials and shows a clear configuration notice. See [docs/development.md](docs/development.md).

## Commands

| Command                           | Purpose                                                  |
| --------------------------------- | -------------------------------------------------------- |
| `npm run dev`                     | Start the dev server                                     |
| `npm run build` / `npm start`     | Production build / serve                                 |
| `npm run lint`                    | ESLint                                                   |
| `npm run typecheck`               | TypeScript, no emit                                      |
| `npm test`                        | Vitest unit/integration tests                            |
| `npm run test:e2e`                | Playwright (run `npx playwright install chromium` first) |
| `npm run format` / `format:check` | Prettier                                                 |
| `npm run check`                   | Lint + typecheck + tests + build                         |

## Documentation

- [Architecture](docs/architecture.md)
- [Database and migrations](docs/database.md)
- [Development](docs/development.md)
- [Security and privacy](docs/security.md)
- [Decision records](docs/decisions/)
