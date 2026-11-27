# DD-oodle School OS

**DD-oodle** is a configurable, multi-institution School Operations and Learning Ecosystem designed initially for Indian schools (validated against a CBSE Senior Secondary reference school).

> **Current Repository State:** Phase 0 — Governance & Documentation Bootstrap (`P0-M01`). Application scaffolding (Next.js / Supabase) has not started yet.

## Prerequisites (Planned Stack)

When Phase 1 application scaffolding begins, the target stack specified in the master blueprint requires:

- **Git** (version control)
- **Node.js** (LTS release — exact version & package manager pending Open Decision `OD-02`)
- **Supabase CLI** (for local PostgreSQL, Auth, Storage and RLS testing — pending `OD-02`)
- **Next.js (App Router) + TypeScript (strict) + Tailwind CSS**

## Local Setup

Application source code is not yet initialized. Once Phase 1 Milestone `P1-M01` is approved and executed:

1. Copy `.env.example` to `.env.local` and supply local/development credentials.
2. Install dependencies with the approved package manager.
3. Start local Supabase / Next.js development servers.

## Environment Variables (Names Only)

Defined as placeholders in [`.env.example`](.env.example). **Never commit real values or `.env*` files.**

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Public / Client & Server | Canonical base URL of the web application |
| `NEXT_PUBLIC_SUPABASE_URL` | Public / Client & Server | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public / Client & Server | Supabase anonymous/publishable client key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only** | Privileged Supabase admin key (never expose to client or `NEXT_PUBLIC_*`) |
| `DATABASE_URL` | **Server-only** | Direct PostgreSQL connection string for migrations/tooling |

## Planned Scripts

No `package.json` exists in Phase 0. Future Phase 1 scaffolding will establish `dev`, `build`, `start`, `lint`, `typecheck` and `test` scripts.

## Canonical Documentation

- [DD-oodle_MASTER_PROJECT_BLUEPRINT.md](DD-oodle_MASTER_PROJECT_BLUEPRINT.md) — Canonical product & architecture baseline (v1.0.0)
- [PROJECT_INSTRUCTIONS.md](PROJECT_INSTRUCTIONS.md) — Permanent operating rules for Gemini & coding agents
- [CHANGELOG.md](CHANGELOG.md) — Dated project change history
- [docs/README.md](docs/README.md) — Repository documentation index
- [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) — Current audited phase, milestone, verification and next steps
- [docs/ROADMAP.md](docs/ROADMAP.md) — Phases 0–10 and future roadmap status
