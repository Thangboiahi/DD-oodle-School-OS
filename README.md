# DD-oodle School OS

**DD-oodle** is a configurable, multi-institution School Operations and Learning Ecosystem designed initially for Indian schools (validated against a CBSE Senior Secondary reference school).

> **Current Repository State:** Phase 1 — Milestone `P1-M03` (Next.js 16 App Router, 3-family Light/Dark Design System, 4-mode Responsive Shell, Native PWA Skeleton, Supabase Multi-Tenant SQL Schema, Forced RLS & Private Storage Baseline, Synthetic Seed, pgTAP Suite & SSR `proxy.ts`). Live `supabase test db` verification requires local Docker + Supabase CLI.

## Prerequisites

- **Git**
- **Node.js** (`>=22.0.0`, LTS 22.x or newer)
- **pnpm** (package manager; `pnpm-lock.yaml` is authoritative)
- **Supabase CLI + Docker** (required for local PostgreSQL, Auth, Storage, `supabase db reset`, and `supabase test db` pgTAP checks)

## Local Setup

```bash
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env.local` to connect a local or cloud Supabase project (sign-in flows activate in `P1-M04`).

For local Supabase database reset & cross-tenant pgTAP RLS tests (requires Docker + Supabase CLI):

```bash
supabase start
supabase db reset
supabase test db
```

## Continuous Integration (GitHub Actions)

Workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs automatically on pushes and pull requests to `main`:

- **`app-quality`:** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and documentation link/directory checks.
- **`supabase-rls-pgtap`:** Starts a real Supabase Docker stack (`supabase start`), replays migrations + synthetic seed (`supabase db reset`), runs all pgTAP cross-tenant RLS/Storage/audit tests (`supabase test db`), and lints PostgreSQL schemas (`supabase db lint`).

## Environment Variables (Names Only)

Defined as placeholders in [`.env.example`](.env.example). **Never commit real values or `.env*` files.**

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public / Client & Server | Canonical base URL of the web application |
| `NEXT_PUBLIC_APP_DOMAIN` | Public / Client & Server | Base multi-tenant host domain (default `dd-oodle.com`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client & Server | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public / Client & Server | Supabase publishable client key (safe for SSR/browser) |
| `SUPABASE_SECRET_KEY` | **Server-only** | Privileged Supabase secret key (bypasses RLS; never expose to client or `NEXT_PUBLIC_*`) |
| `DATABASE_URL` | **Server-only** | Direct PostgreSQL connection string for migrations/tooling |

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Build Next.js production bundle |
| `pnpm start` | Start Next.js production server |
| `pnpm lint` | Run ESLint across the repository |
| `pnpm typecheck` | Run strict TypeScript check (`tsc --noEmit`) |
| `pnpm test` | Run Vitest unit & SQL static invariant tests |

## Canonical Documentation

- [DD-oodle_MASTER_PROJECT_BLUEPRINT.md](DD-oodle_MASTER_PROJECT_BLUEPRINT.md) — Canonical product & architecture baseline (v1.0.0)
- [PROJECT_INSTRUCTIONS.md](PROJECT_INSTRUCTIONS.md) — Permanent operating rules for Gemini & coding agents
- [CHANGELOG.md](CHANGELOG.md) — Dated project change history
- [docs/README.md](docs/README.md) — Repository documentation index
- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — Current audited phase, milestone, verification and next steps
- [docs/ROADMAP.md](docs/ROADMAP.md) — Phases 0–10 and future roadmap status
- [docs/decisions/ADR-0001-multi-tenant-database-strategy.md](docs/decisions/ADR-0001-multi-tenant-database-strategy.md) — Multi-tenant database, storage & routing isolation strategy
- [docs/decisions/ADR-0002-person-identity-and-session-enrolment.md](docs/decisions/ADR-0002-person-identity-and-session-enrolment.md) — Global person identity & three-layer session enrolment model
- [docs/security/MULTI_TENANT_RLS_BASELINE.md](docs/security/MULTI_TENANT_RLS_BASELINE.md) — Private `app_auth` helpers, forced RLS & private Storage isolation
- [docs/ui-ux/DESIGN_SYSTEM_AND_PWA.md](docs/ui-ux/DESIGN_SYSTEM_AND_PWA.md) — Design system tokens, 3 theme families, 4 responsive shell modes & PWA boundaries
- [docs/testing/TEST_STRATEGY.md](docs/testing/TEST_STRATEGY.md) — Testing pyramid & quality gates
