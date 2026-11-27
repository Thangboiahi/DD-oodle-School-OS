# Changelog

All notable changes to the DD-oodle School OS repository are documented in this file.

The format follows dated, grouped entries (`Added`, `Changed`, `Fixed`, `Security`, `Documentation`, `Removed`) per `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` (Part D3).

## [Unreleased]

## [0.1.0-alpha.4] - 2026-11-27

### Added
- Created GitHub Actions CI workflow (`.github/workflows/ci.yml`) running `app-quality` (Node 22, pnpm `--frozen-lockfile`, typecheck, lint, unit/SQL-invariant tests, Next.js build, docs hygiene) and `supabase-rls-pgtap` (`supabase/setup-cli@v1`, `supabase start`, `supabase db reset`, `supabase test db`, `supabase db lint`).

### Fixed
- Hardened `app_auth.can_write_institution_storage()` (`supabase/migrations/202611270003_private_storage_baseline.sql`) with explicit `CASE WHEN` regex guard before `::uuid` casting so non-UUID storage paths deterministically deny with RLS `42501`.
- Added `SET LOCAL search_path = public, extensions;` in `supabase/seed.sql` and `supabase/tests/01_multi_tenant_rls.test.sql` and explicit empty-string token columns on seeded `auth.users` rows.

### Documentation
- Created `docs/phase-plans/PHASE-01-MILESTONE-03B-ci-and-live-pgtap-gate.md` and `docs/progress/MILESTONE-REPORT-P1-M03B.md`.
- Updated `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` (`REF-06B`, `REF-06C`), `docs/testing/TEST_STRATEGY.md`, `docs/README.md`, `docs/PROJECT_STATUS.md`, and `README.md`.

## [0.1.0-alpha.3] - 2026-11-27

### Added
- Installed `@supabase/supabase-js@2.119.2`, `@supabase/ssr@0.12.7`, and `server-only@0.0.1` for Next.js 16 SSR authentication plumbing.
- Created `supabase/config.toml` exposing `public` only (keeping `app_auth` hidden from PostgREST) with pgTAP testing and `supabase/seed.sql` enabled.
- Created core SQL migrations:
  - `supabase/migrations/202611270001_core_identity_and_tenancy.sql`: private `app_auth` schema, 7 core multi-tenant tables (`persons`, `platform_operators`, `institutions`, `institution_memberships`, `institution_roles`, `role_assignments`, `audit_events`), composite tenant-safe FKs, append-only `audit_events` immutability trigger, `updated_at` triggers, and B-tree indexes.
  - `supabase/migrations/202611270002_rls_helpers_and_policies.sql`: `STABLE SECURITY DEFINER SET search_path = ''` helpers in `app_auth`, forced RLS (`ENABLE` + `FORCE`) across all 7 tables, column-restricted `persons` profile `UPDATE`, and explicit `TO authenticated` initPlan policies.
  - `supabase/migrations/202611270003_private_storage_baseline.sql`: private `institution-private` bucket (`public = false`) and UUID-folder-prefixed Storage RLS policies.
- Created synthetic two-institution seed (`supabase/seed.sql`) and 26-assertion pgTAP security suite (`supabase/tests/01_multi_tenant_rls.test.sql`).
- Implemented `lib/supabase/{env,browser,server,admin,proxy}.ts` and Next.js 16 root `proxy.ts` (`getClaims()` session refresh with graceful pass-through when unconfigured).
- Added `tests/unit/supabase-env.test.ts` and `tests/unit/sql-migration-invariants.test.ts`.

### Changed
- Updated `.env.example` and `README.md` with `NEXT_PUBLIC_APP_DOMAIN`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and local `supabase test db` instructions.

### Documentation
- Created `docs/security/MULTI_TENANT_RLS_BASELINE.md`, `docs/phase-plans/PHASE-01-MILESTONE-03-supabase-schema-rls-storage.md`, and `docs/progress/MILESTONE-REPORT-P1-M03.md`.
- Verified Nov 2026 Supabase official documentation (`REF-04`, `REF-05`, `REF-05B`, `REF-06`, `REF-06B`) in `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md`.
- Updated `docs/README.md` (moved `docs/security/` from deferred to active), `docs/PROJECT_STATUS.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

### Security
- Enforced private `app_auth` helper isolation, `FORCE ROW LEVEL SECURITY` on all 7 public tables, composite cross-tenant FK rejection, platform-vs-institution separation, append-only `audit_events`, private Storage bucket access control, and browser runtime guards on `SUPABASE_SECRET_KEY`. Live `supabase test db` run pending local Docker + Supabase CLI setup.

## [0.1.0-alpha.2] - 2026-11-27

### Added
- Implemented theme and density configuration (`lib/ui/theme.ts`), semantic Tailwind CSS v4 tokens in `app/globals.css` across **Clarity**, **Calm**, and **Focus** (Light & Dark + `compact`/`comfortable` density), `ThemeProvider` (`useSyncExternalStore`), and accessible `ThemeControls`.
- Added core accessible UI primitives (`components/ui/Button.tsx`, `Badge.tsx`, `Card.tsx`, `StateNotice.tsx`, `Skeleton.tsx`).
- Added 4-mode responsive `AppShell` (`components/shell/AppShell.tsx`, `nav-config.ts`) supporting desktop collapsible sidebar, tablet Escape/backdrop drawer, mobile portrait bottom nav with safe-area padding, and mobile landscape compact rail, showcased on `/shell-preview`.
- Added `/sign-in` placeholder route (scheduled for `P1-M03`).
- Added Next.js 16 native PWA skeleton (`app/manifest.ts`, verified binary PNG icons in `public/icons/`, self-contained `public/offline.html`, auditable network-first `public/sw.js` with `DD_OODLE_CLEAR_CACHES`, and `components/pwa/ServiceWorkerRegistrar.tsx`).
- Added unit tests covering theme guards/script (`tests/unit/theme.test.ts`), PWA manifest/PNG icons/SW (`tests/unit/manifest-and-pwa.test.ts`), and security headers (`tests/unit/security-headers.test.ts`).

### Changed
- Replaced starter `app/page.tsx` with minimalistic public landing shell highlighting Indian CBSE & multi-board architecture pillars without exposing tenant data.
- Wired pre-hydration theme script, PWA metadata/viewport, `ThemeProvider`, and `ServiceWorkerRegistrar` into `app/layout.tsx`.
- Configured global security headers and strict `/sw.js` headers in `lib/security/headers.ts` and `next.config.ts`.
- Updated `README.md` with `P1-M02` repository state and UI/UX & PWA documentation link.

### Documentation
- Created `docs/ui-ux/DESIGN_SYSTEM_AND_PWA.md`, `docs/phase-plans/PHASE-01-MILESTONE-02-design-system-shell-pwa.md`, and `docs/progress/MILESTONE-REPORT-P1-M02.md`.
- Verified `REF-03` (Next.js PWA Guide, updated 2026-07-30) in `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md`.
- Updated `docs/README.md` (moved `docs/ui-ux/` from deferred to active), `docs/PROJECT_STATUS.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

### Security
- Enforced allowlist-only pre-hydration theme script (zero string interpolation), network-first navigation SW excluding `/api/*` and HTML caching, explicit cache-purge message hook for sign-out/tenant switching, `no-store` SW HTTP headers, and global `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` headers.

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
