# Milestone Report: P2-M01 — Phase 2 ADRs, Registry & CBSE XI–XII Academic Schema, Relationship RLS & pgTAP Suite

- **Date:** 2026-11-27
- **Phase:** Phase 2 — Institutional Registry and Academic Structure (**In Progress**)
- **Milestone:** `P2-M01`
- **Status:** **Complete**

---

## 1. Summary of Changes

1. **Accepted Architecture Decision Records (`docs/decisions/`):**
   - Added [`ADR-0003`](../decisions/ADR-0003-academic-structure-and-typed-assignments.md) defining separated academic structure concepts, cross-section teaching groups, composite tenant FKs, and typed time-bound `academic_assignments`.
   - Added [`ADR-0004`](../decisions/ADR-0004-normalized-custom-field-engine.md) defining normalized core registries paired with sensitivity-classified custom field definitions/values (`standard` | `restricted` | `confidential`) enforced in PostgreSQL RLS.
2. **19-Table Phase 2 Schema Migrations (`supabase/migrations/`):**
   - [`202611270004_people_registry_and_custom_fields.sql`](../../supabase/migrations/202611270004_people_registry_and_custom_fields.sql): 6 tables (`student_profiles` with optional `pen_number`/`apaar_id` and no Aadhaar column, `staff_profiles`, `student_guardians`, `admission_applications`, `custom_field_definitions`, `custom_field_values`).
   - [`202611270005_academic_structure_and_assignments.sql`](../../supabase/migrations/202611270005_academic_structure_and_assignments.sql): 13 tables (`academic_sessions` with single-active partial unique index, `academic_terms`, `academic_departments`, `grade_levels`, `sections`, `streams`, `subjects`, `subject_offerings`, `student_session_enrolments`, `student_subject_enrolments`, `teaching_groups`, `teaching_group_memberships`, `academic_assignments`).
   - [`202611270006_phase2_rls_and_helpers.sql`](../../supabase/migrations/202611270006_phase2_rls_and_helpers.sql): 5 `STABLE SECURITY DEFINER SET search_path = ''` `app_auth` helpers and `ENABLE` + `FORCE ROW LEVEL SECURITY` initPlan policies across all 19 tables.
3. **CBSE XI–XII Synthetic Seed & pgTAP Verification (`supabase/seed.sql`, `supabase/tests/`):**
   - Expanded `supabase/seed.sql` while preserving all 4 Phase 1 accounts/roles/audit rows, adding `hod.srsec.sunrise@example.test`, `classteacher.11a.sunrise@example.test`, `monitor.11a.sunrise@example.test`, and `student.11b.sunrise@example.test`, Senior Secondary `2026-27` terms/sections/streams/mixed electives, cross-section `TG-XI-APPMATH-1` & `TG-XI-CS-1`, guardian link for `dual.member@example.test` on Valley `Kabir Rao`, and `house_name` (`standard`) + `counseling_note` (`confidential`) custom fields.
   - Added [`02_phase2_registry_and_academics_rls.test.sql`](../../supabase/tests/02_phase2_registry_and_academics_rls.test.sql) (32 pgTAP assertions) and updated [`sql-migration-invariants.test.ts`](../../tests/unit/sql-migration-invariants.test.ts) (verifying 26 forced-RLS tables and `SECURITY DEFINER` `SET search_path = ''` lock).

---

## 2. Verification & Live CI Evidence

- **Local Static, Unit & Build Checks:**
  - `pnpm typecheck`: **Passed** (0 errors)
  - `pnpm lint`: **Passed** (0 errors)
  - `pnpm test`: **Passed** (10 test files, **40/40** unit & SQL invariant tests across 26 forced-RLS tables)
  - `pnpm build`: **Passed** (Next.js 16 production build)
  - Documentation hygiene: `0` empty dirs, `59` valid relative links.
- **Live GitHub Actions CI Run [`45989069548`](https://github.com/Thangboiahi/DD-oodle-School-OS/actions/runs/45989069548)** (commit `bd7a534`):
  1. **Job 1 — `App Quality & Hygiene` (`140471985271`):** **PASS** (`38s` — frozen lockfile install, typecheck, lint, 40/40 Vitest tests, Next.js build, docs hygiene)
  2. **Job 2 — `Supabase RLS & pgTAP Verification` (`140471984761`):** **PASS** (`1m49s` — live `supabase start`, clean `supabase db reset`, **58/58** live pgTAP assertions across 2 suites [`01_multi_tenant_rls.test.sql` **26/26** + `02_phase2_registry_and_academics_rls.test.sql` **32/32**], `supabase db lint --schema public,app_auth --level error` clean)
  3. **Job 3 — `Live Multi-Tenant Auth & A11y E2E` (`140471985138`):** **PASS** (`2m55s` — **10/10** Playwright E2E, responsive & WCAG AA checks against live Supabase Auth + PostgREST + Next.js with Phase 2 schema and expanded seed)

---

## 3. Next Recommended Action

Proceed to **`P2-M02`** — Server-Only Phase 2 Registry & Academic Domain Services, Institutional Directories, and CBSE Senior Secondary Structure UI.
