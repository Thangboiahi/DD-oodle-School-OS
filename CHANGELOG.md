# Changelog

All notable changes to the DD-oodle School OS repository are documented in this file.

The format follows dated, grouped entries (`Added`, `Changed`, `Fixed`, `Security`, `Documentation`, `Removed`) per `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` (Part D3).

## [Unreleased]

## [0.2.0-alpha.4] - 2026-11-27

### Added
- Added Migration 7 (`supabase/migrations/202611270007_bulk_import_staging.sql`) creating `public.import_batches` and `public.import_rows` with composite `(institution_id, batch_id)` FK, per-institution `idempotency_key` uniqueness, and forced RLS restricted to `imports.manage` or `people.manage`, verified by 22-assertion pgTAP suite `supabase/tests/03_import_staging_rls.test.sql` and updated `tests/unit/sql-migration-invariants.test.ts` (28 forced-RLS public tables).
- Installed `read-excel-file@9.3.20` (avoiding legacy `xlsx` CVEs), configured `6mb` Server Action body limit in `next.config.ts`, and implemented `lib/imports/{csv,spreadsheet,validators}.ts` with RFC-4180 CSV & XLSX parsing, 5 MB / 5,000-row / 60-column limits, `neutralizeCsvFormula()` export protection, Aadhaar header/mapping rejection, and in-file/DB duplicate detection across `students`, `staff`, and `subject_enrolments`.
- Added `server/imports/service.ts` (`import "server-only"`) implementing staged dry-run validation, non-overwriting idempotent batch commits (`resolveOrCreateGlobalPerson()` exported from `server/registry/service.ts` solely for new post-authorization person inserts), batch cancellation, audit logging, and formula-safe CSV reporting.
- Added `/t/[slug]/imports`, `/t/[slug]/imports/[batchId]`, authenticated CSV download route `/t/[slug]/imports/[batchId]/report`, and `app/t/[slug]/imports/actions.ts`.
- Added `tests/unit/imports-csv-and-validation.test.ts` and updated `tests/unit/safe-redirect-and-nav.test.ts`.

### Changed
- Updated `components/shell/nav-config.ts`, `components/shell/AppShell.tsx`, and `lib/auth/navigation.ts` to show `"Bulk Imports"` strictly for `imports.manage` / `people.manage` operators.

### Documentation
- Created `docs/phase-plans/PHASE-02-MILESTONE-04-bulk-import-staging.md` and `docs/progress/MILESTONE-REPORT-P2-M04.md`; updated `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` (`REF-06F`), `docs/PROJECT_STATUS.md`, `docs/README.md`, `docs/security/MULTI_TENANT_RLS_BASELINE.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.2.0-alpha.3] - 2026-11-27

### Added
- Added academic Zod schemas & pure conflict engine (`lib/academics/schemas.ts`, `lib/academics/conflicts.ts`): `detectAcademicAssignmentConflicts()` preventing overlapping active `class_teacher` and per-role `monitor`/`monitress` allocations while permitting concurrent teacher roles and validating section monitor eligibility, plus `validateCrossSectionGroupMembership()` validating active session & subject offering enrolment for cross-section groups.
- Added server-only Academics DAL (`server/academics/service.ts` with `import "server-only"`): caller-RLS queries (`getAcademicsOverview`, `getSectionDetail`, `listTeachingGroups`, `listAcademicAssignments`) and `academics.manage`-gated audited mutations (`createSession`, `activateSession`, `createDepartment`, `createGradeAndSection`, `createSubjectAndOffering`, `enrolStudentInSession`, `enrolStudentInSubject`, `createTeachingGroup`, `addStudentToTeachingGroup`, `assignAcademicResponsibility`, `revokeAcademicResponsibility`) with zero admin client imports.
- Added `/t/[slug]/academics/*` App Router UI, `components/academics/AcademicsSubNav.tsx`, and route-slug-bound Server Actions (`app/t/[slug]/academics/actions.ts`) covering Sessions/Terms/Departments/Sections, Section Detail (with read-only Monitor banner and individual elective badges), Cross-Section Teaching Groups, and Time-Bound Allocations ledger + revocation.
- Added unit tests `tests/unit/academics-conflicts.test.ts` and `tests/unit/academics-schemas.test.ts`, and updated `tests/unit/safe-redirect-and-nav.test.ts`.

### Changed
- Updated `components/shell/nav-config.ts`, `components/shell/AppShell.tsx`, and `lib/auth/navigation.ts` to expose `"Academics"` (`/t/${slug}/academics`) for authorized institutional roles while keeping Governance/Audit hidden from non-Principals.

### Documentation
- Created `docs/phase-plans/PHASE-02-MILESTONE-03-academic-structure-and-allocations.md` and `docs/progress/MILESTONE-REPORT-P2-M03.md`; updated `docs/PROJECT_STATUS.md`, `docs/README.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.2.0-alpha.2] - 2026-11-27

### Added
- Added shared registry validation & sensitivity helpers: `lib/registry/schemas.ts` (strict student/staff/guardian/admission/custom-field Zod schemas rejecting unexpected Aadhaar fields and validating `ALLOWED_ADMISSION_TRANSITIONS` + custom field `data_type`/`options_json`) and `lib/registry/masking.ts` (`filterAndMaskCustomFields`, `maskExternalIdentifier` last-4 PEN/APAAR masking).
- Added server-only audit helper (`server/audit/log.ts`) and registry DAL (`server/registry/service.ts` with `import "server-only"`) providing paginated RLS-enforced reads (`listStudents`, `getStudentDetail`, `listStaff`, `listAdmissions`, `listCustomFieldDefinitions`) and audited server-authorized mutations (`createStudentRecord`, `updateStudentLifecycle`, `linkStudentGuardian`, `createStaffRecord`, `createAdmissionApplication`, `transitionAdmissionStatus` with admission-to-student conversion, `upsertCustomFieldDefinition`, `upsertCustomFieldValue`).
- Added responsive accessible People Registry UI under `/t/[slug]/people`: Student Roster + Student Detail (guardians, enrolment badge, lifecycle updates, grouped sensitivity-filtered custom fields), Staff Directory, Admissions Pipeline, Custom Field Definitions manager, `components/registry/{PeopleSubNav,RegistryActionForm}.tsx`, and route-slug-verified `app/t/[slug]/people/actions.ts`.
- Added unit tests `tests/unit/registry-schemas.test.ts` and `tests/unit/registry-masking.test.ts`, and updated `tests/unit/safe-redirect-and-nav.test.ts`.

### Changed
- Updated `lib/auth/navigation.ts` to route `"People & Registry"` to `/t/[slug]/people` across authorized institutional roles without exposing Principal-only Governance or Audit items to Subject Teachers.

### Documentation
- Created `docs/phase-plans/PHASE-02-MILESTONE-02-people-registry-and-custom-fields.md` and `docs/progress/MILESTONE-REPORT-P2-M02.md`; updated `docs/PROJECT_STATUS.md`, `docs/README.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.2.0-alpha.1] - 2026-11-27

### Added
- Recorded accepted Phase 2 ADRs: `docs/decisions/ADR-0003-academic-structure-and-typed-assignments.md` (separated CBSE Senior Secondary schema + typed `academic_assignments`) and `docs/decisions/ADR-0004-normalized-custom-field-engine.md` (normalized core registries + sensitivity-classified custom fields).
- Added Migration 4 (`supabase/migrations/202611270004_people_registry_and_custom_fields.sql`): 6 forced-RLS tables (`student_profiles` with optional non-PK `pen_number`/`apaar_id` and zero Aadhaar column, `staff_profiles`, `student_guardians`, `admission_applications`, `custom_field_definitions`, `custom_field_values`) with composite tenant FKs.
- Added Migration 5 (`supabase/migrations/202611270005_academic_structure_and_assignments.sql`): 13 forced-RLS tables (`academic_sessions` single-active partial unique index, `academic_terms`, `academic_departments`, `grade_levels`, `sections`, `streams`, `subjects`, `subject_offerings`, `student_session_enrolments`, `student_subject_enrolments`, `teaching_groups`, `teaching_group_memberships`, `academic_assignments`).
- Added Migration 6 (`supabase/migrations/202611270006_phase2_rls_and_helpers.sql`): private `app_auth` relationship & sensitivity helpers (`can_access_student_profile`, `can_access_student_enrolment`, `is_hod_or_class_teacher_of_student`, `custom_field_sensitivity`, `can_read_custom_field`) and forced RLS policies across all 19 Phase 2 tables.
- Expanded `supabase/seed.sql` (preserving all 4 Phase 1 users/roles/audit rows) with CBSE XI–XII `2026-27` session data, mixed elective enrolments across `XI-A` & `XI-B`, cross-section teaching groups (`TG-XI-APPMATH-1`, `TG-XI-CS-1`), HOD/Class Teacher/Monitor/Student accounts, Valley guardian link (`Kabir Rao`), and `standard`/`confidential` custom fields.
- Added 30-assertion pgTAP suite (`supabase/tests/02_phase2_registry_and_academics_rls.test.sql`) and updated `tests/unit/sql-migration-invariants.test.ts` for all 26 forced-RLS public tables.

### Documentation
- Created `docs/phase-plans/PHASE-02-MILESTONE-01-registry-academics-schema.md` and `docs/progress/MILESTONE-REPORT-P2-M01.md`; updated `docs/ROADMAP.md` (Phase 2 `In Progress`), `docs/PROJECT_STATUS.md`, `docs/README.md`, `docs/security/MULTI_TENANT_RLS_BASELINE.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

### Security
- Enforced relationship-scoped RLS for HODs, class teachers, subject teachers (cross-section), guardians, and read-only monitors, field-level `standard`/`restricted`/`confidential` sensitivity isolation, composite `(institution_id, id)` FK tenant locks, and zero automatic school access for `platform_operators`.

## [0.1.0-alpha.6] - 2026-11-27

### Added
- Added synthetic local/CI GoTrue password (`DdOodleTest#2026!` via `extensions.crypt(..., extensions.gen_salt('bf'))`) and idempotent `auth.identities` email rows for the 4 synthetic `@example.test` users in `supabase/seed.sql`.
- Installed `@playwright/test@1.65.1` and `@axe-core/playwright@4.14.1`, created `playwright.config.ts`, and added `pnpm test:e2e` and `pnpm test:e2e:public` scripts.
- Added `tests/e2e/public-and-responsive.spec.ts` covering `/` public zero-leakage assertions, `/api/health`, `/manifest.webmanifest`, `/sw.js` headers, `/offline.html`, theme/density reload persistence, 4-viewport (`390x844`, `844x390`, `820x1180`, `1280x800`) horizontal-overflow & navigation audits, and WCAG 2.0/2.1 AA `axe-core` scans across Light/Dark modes.
- Added `tests/e2e/multi-tenant-auth.spec.ts` exercising live browser sign-in/sign-out, unauthenticated redirects, invalid-credential handling, Sunrise Principal isolation + non-enumerating denial on `/t/valley-cbse` and unknown slugs, Dual-Member single-identity switching across `sunrise-cbse` (`Subject Teacher`) and `valley-cbse` (`Parent / Guardian`) via `WorkspaceSwitcher`, and strict Platform Operator isolation on `/platform` vs `/t/[slug]`.
- Added parallel Job 3 (`e2e-live-auth`) to `.github/workflows/ci.yml` exporting live `supabase status -o env` values without logging keys before `pnpm build` and `pnpm test:e2e` with `E2E_REQUIRE_SUPABASE=true`.

### Documentation
- Closed **Phase 1 — Foundation and Multi-Tenant Platform** as **Complete** in `docs/ROADMAP.md` and `docs/PROJECT_STATUS.md` following green GitHub Actions CI Run `45951599452` (`eb6ed69`).
- Created `docs/phase-plans/PHASE-01-MILESTONE-05-exit-gate-e2e-verification.md` and `docs/progress/MILESTONE-REPORT-P1-M05.md`; updated `docs/testing/TEST_STRATEGY.md`, `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` (`REF-06D`, `REF-06E`), `docs/README.md`, and `README.md`.

### Security
- Verified live end-to-end enforcement across GoTrue, PostgREST RLS (`26/26` pgTAP), and Next.js 16 SSR routes (`10/10` Playwright E2E) including cross-tenant denial, non-enumerating slug responses, platform separation, and fail-fast CI guard (`E2E_REQUIRE_SUPABASE=true`).

## [0.1.0-alpha.5] - 2026-11-27

### Added
- Implemented pure security, permission, and navigation helpers: `lib/auth/safe-redirect.ts` (`sanitizeNextPath`), `lib/auth/permissions.ts` (`evaluatePermission` across active membership, time-bound role assignments, wildcard/exact grants, scope hierarchy, and strict exclusion of platform operator privileges), and `lib/auth/navigation.ts` (`buildInstitutionNav`).
- Implemented server-only authentication and multi-tenant data access layer under `server/` (every module guarded by `import "server-only"`): `server/auth/types.ts`, `server/auth/session.ts` (`getVerifiedAuthIdentity` via `getClaims()` and RLS-enforced `getCurrentPersonWorkspace`), `server/tenancy/resolve-context.ts` (`resolveTenantContextFromWorkspace`, `resolveVerifiedTenantContext`), and `server/auth/guards.ts` (`requireInstitutionPermission`, `requirePlatformOperator`).
- Added global authentication and isolated workspace shells: Zod-validated Server Action sign-in (`app/sign-in/actions.ts`, `SignInForm.tsx`, `page.tsx`), `POST /auth/sign-out`, `components/auth/SignOutButton.tsx` and `components/shell/WorkspaceSwitcher.tsx` (clearing PWA caches via `clearPwaCaches()`), `/workspace`, `/t/[slug]` layout & overview page, and strictly isolated `/platform` console shell.
- Added unit tests covering permissions, safe-redirect/navigation, and tenant context resolution + `server-only` enforcement (`tests/unit/permissions.test.ts`, `tests/unit/safe-redirect-and-nav.test.ts`, `tests/unit/tenant-context-resolution.test.ts`).

### Changed
- Extended `components/shell/AppShell.tsx` and `components/shell/nav-config.ts` with optional `badgeText`, `navItems`, `secondaryNavItems`, `headerSlot`, and domain icons while keeping full compatibility with `/shell-preview`.
- Updated `lib/supabase/proxy.ts` to strip spoofed `x-dd-oodle-tenant-hint` headers and forward parsed subdomain hints strictly as untrusted routing hints alongside `getClaims()` session refresh.
- Updated `app/page.tsx` to check `getVerifiedAuthIdentity()` and surface an `Open Workspace` or `Sign In` CTA without leaking private tenant data.

### Documentation
- Created `docs/phase-plans/PHASE-01-MILESTONE-04-auth-workspace-tenancy.md` and `docs/progress/MILESTONE-REPORT-P1-M04.md`.
- Updated `docs/security/MULTI_TENANT_RLS_BASELINE.md`, `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` (`REF-05C`, `REF-05D`), `docs/architecture/ARCHITECTURE_OVERVIEW.md`, `docs/README.md`, `docs/PROJECT_STATUS.md`, `docs/ROADMAP.md`, and `README.md`.

### Security
- Verified strict server-only tenant verification using `supabase.auth.getClaims()`, non-enumerating denial on nonexistent vs unauthorized institution slugs, complete separation of `platform_operators` from institutional leadership, open-redirect filtering, and PWA cache purging on workspace switch and logout.

## [0.1.0-alpha.4] - 2026-11-27

### Added
- Created GitHub Actions CI workflow (`.github/workflows/ci.yml`) running `app-quality` (Node 22, pnpm `--frozen-lockfile`, typecheck, lint, unit/SQL-invariant tests, Next.js build, docs hygiene) and `supabase-rls-pgtap` (`supabase/setup-cli@v1`, `supabase start`, `supabase db reset`, `supabase test db`, `supabase db lint`).

### Fixed
- Hardened `app_auth.can_write_institution_storage()` (`supabase/migrations/202611270003_private_storage_baseline.sql`) with explicit `CASE WHEN` regex guard before `::uuid` casting so non-UUID storage paths deterministically deny with RLS `42501`.
- Added `SET LOCAL search_path = public, extensions;` in `supabase/seed.sql` and `supabase/tests/01_multi_tenant_rls.test.sql` and explicit empty-string token columns on seeded `auth.users` rows.

### Documentation
- Created `docs/phase-plans/PHASE-01-MILESTONE-03B-ci-and-live-pgtap-gate.md` and `docs/progress/MILESTONE-REPORT-P1-M03B.md`.
- Updated `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` (`REF-06B`, `REF-06C`), `docs/testing/TEST_STRATEGY.md`, `docs/README.md`, `docs/PROJECT_STATUS.md`, `docs/progress/MILESTONE-REPORT-P1-M03.md`, and `README.md`.
- Recorded verified live GitHub Actions CI Run `45946043527` (`app-quality` + `supabase-rls-pgtap`: `Files=1, Tests=26, Result: PASS`, `No schema errors found`) and safe non-destructive recovery of `068cf60` (`ef53895` + `c599486`).

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
