# Changelog

All notable changes to the DD-oodle School OS repository are documented in this file.

The format follows dated, grouped entries (`Added`, `Changed`, `Fixed`, `Security`, `Documentation`, `Removed`) per `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` (Part D3).

## [Unreleased]

## [0.1.0-alpha.1] - 2026-11-27

### Added
- Initialized Next.js App Router (`16.4.6`) + React (`19.3.1`) + strict TypeScript (`5.9.3`, `noUncheckedIndexedAccess: true`) + Tailwind CSS (`4.3.5`) + ESLint (`9.39.5`) + Vitest (`5.1.2`) foundation with `pnpm@12.23.0` and `pnpm-lock.yaml`.
- Added minimal application shell (`app/layout.tsx`, `app/globals.css`, `app/page.tsx`) and `/api/health` route returning `{ status: "ok", app: "dd-oodle" }` with `Cache-Control: no-store`.
- Added Zod-validated untrusted tenant routing hint parser (`lib/tenancy/resolve-tenant-hint.ts`) supporting `<slug>.dd-oodle.com`, `<slug>.localhost:3000`, and `/t/<slug>` (`OD-03`).
- Added unit tests (`tests/unit/resolve-tenant-hint.test.ts`, `tests/unit/health-route.test.ts`) covering valid/invalid/reserved tenant hints and `/api/health`.

### Changed
- Updated `.gitignore` to ignore `.pnpm-store/`.
- Updated `README.md` with verified prerequisites, `pnpm` scripts and ADR/testing doc links.

### Documentation
- Closed Phase 0: added `docs/requirements/DOMAIN_GLOSSARY.md` and recorded Product Owner approval for `OD-01`–`OD-05` in `docs/requirements/REQUIREMENTS_INDEX_AND_REGISTERS.md`.
- Authored accepted Core ADRs: `docs/decisions/ADR-0001-multi-tenant-database-strategy.md` and `docs/decisions/ADR-0002-person-identity-and-session-enrolment.md`.
- Added `docs/testing/TEST_STRATEGY.md`, `docs/phase-plans/PHASE-01-MILESTONE-01-foundation-and-core-adrs.md`, and `docs/progress/MILESTONE-REPORT-P1-M01.md`.
- Updated `docs/README.md`, `docs/ROADMAP.md` (Phase 0 `Complete`, Phase 1 `In Progress`), `docs/PROJECT_STATUS.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

### Security
- Enforced `isTrustedMembership: false` contract and reserved-slug/host validation on `resolveTenantHint` (`OD-03` / `ADR-0001`), plus zero environment or secret exposure in `/api/health`.

## [0.0.2] - 2026-11-27

### Added
- `.gitignore` to exclude `.env*` secrets, Node/Next.js build artefacts, logs, OS/IDE files and local data exports.
- `.env.example` with placeholder variable names only for future Next.js and Supabase setup.

### Documentation
- `PROJECT_INSTRUCTIONS.md` — concise permanent operating rules derived from Part B of the master blueprint.
- `README.md` — project overview, planned prerequisites, environment variable index and canonical documentation links.
- `docs/README.md` — documentation index linking active governance, requirements, architecture, compliance, phase-plan and progress records.
- `docs/PROJECT_STATUS.md` — audited repository baseline, Phase 0 status, blockers/open decisions and `P1-M01` candidate next milestone.
- `docs/ROADMAP.md` — Phases 0–10 and future roadmap possibilities mapped to explicit status.
- `docs/requirements/REQUIREMENTS_INDEX_AND_REGISTERS.md` — Part A requirement index, Open Decisions Register (`OD-01`–`OD-05`) and Initial Risk Register.
- `docs/architecture/ARCHITECTURE_OVERVIEW.md` — separation of confirmed repository facts vs. approved baseline design.
- `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` — official reference register seeded from Part F URLs.
- `docs/phase-plans/PHASE-00-MILESTONE-01-governance-bootstrap.md` — Part E milestone plan for `P0-M01` and candidate definition for `P1-M01`.
- `docs/progress/MILESTONE-REPORT-P0-M01.md` — audit findings, files created, verification summary and open decisions.

### Security
- Enforced secret hygiene baseline via `.gitignore` and key-free `.env.example` before any application code or credentials exist.

## [0.0.1] - 2026-11-27

### Added
- `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` (v1.0.0) committed as the canonical product and technical handover baseline (`d7e0dc7`).
- Initial `README.md` placeholder (`# DD-oodle-School-OS`).
