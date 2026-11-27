# DD-oodle School OS

**DD-oodle** is a configurable, multi-institution School Operations and Learning Ecosystem designed initially for Indian schools (validated against a CBSE Senior Secondary reference school).

> **Current Repository State:** Phase 1 — Milestone `P1-M02` (Next.js 16 App Router, strict TypeScript, 3-family Light/Dark Design System, 4-mode Responsive Shell, Public Landing Shell & Native PWA Skeleton). Supabase Auth, schema and RLS are scheduled next in `P1-M03`.

## Prerequisites

- **Git**
- **Node.js** (`>=22.0.0`, LTS 22.x or newer)
- **pnpm** (package manager; `pnpm-lock.yaml` is authoritative)
- **Supabase CLI + Docker** (required starting in `P1-M03` for local PostgreSQL, Auth, Storage and RLS testing)

## Local Setup

```bash
pnpm install --frozen-lockfile
```

Copy `.env.example` to `.env.local` once environment-backed modules (Supabase) are introduced in `P1-M03`.

## Environment Variables (Names Only)

Defined as placeholders in [`.env.example`](.env.example). **Never commit real values or `.env*` files.**

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public / Client & Server | Canonical base URL of the web application |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client & Server | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client & Server | Supabase anonymous/publishable client key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Privileged Supabase admin key (never expose to client or `NEXT_PUBLIC_*`) |
| `DATABASE_URL` | **Server-only** | Direct PostgreSQL connection string for migrations/tooling |

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start Next.js development server |
| `pnpm build` | Build Next.js production bundle |
| `pnpm start` | Start Next.js production server |
| `pnpm lint` | Run ESLint across the repository |
| `pnpm typecheck` | Run strict TypeScript check (`tsc --noEmit`) |
| `pnpm test` | Run Vitest unit tests |

## Canonical Documentation

- [DD-oodle_MASTER_PROJECT_BLUEPRINT.md](DD-oodle_MASTER_PROJECT_BLUEPRINT.md) — Canonical product & architecture baseline (v1.0.0)
- [PROJECT_INSTRUCTIONS.md](PROJECT_INSTRUCTIONS.md) — Permanent operating rules for Gemini & coding agents
- [CHANGELOG.md](CHANGELOG.md) — Dated project change history
- [docs/README.md](docs/README.md) — Repository documentation index
- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — Current audited phase, milestone, verification and next steps
- [docs/ROADMAP.md](docs/ROADMAP.md) — Phases 0–10 and future roadmap status
- [docs/decisions/ADR-0001-multi-tenant-database-strategy.md](docs/decisions/ADR-0001-multi-tenant-database-strategy.md) — Multi-tenant database, storage & routing isolation strategy
- [docs/decisions/ADR-0002-person-identity-and-session-enrolment.md](docs/decisions/ADR-0002-person-identity-and-session-enrolment.md) — Global person identity & three-layer session enrolment model
- [docs/ui-ux/DESIGN_SYSTEM_AND_PWA.md](docs/ui-ux/DESIGN_SYSTEM_AND_PWA.md) — Design system tokens, 3 theme families, 4 responsive shell modes & PWA boundaries
- [docs/testing/TEST_STRATEGY.md](docs/testing/TEST_STRATEGY.md) — Testing pyramid & quality gates
