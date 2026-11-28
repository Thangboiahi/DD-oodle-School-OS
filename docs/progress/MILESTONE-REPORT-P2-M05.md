# Milestone Report: P2-M05 — Phase 2 Exit Gate & Phase 2 Closure

- **Date:** 2026-11-28
- **Phase:** Phase 2 — Institutional Registry and Academic Structure (**Complete**)
- **Milestone:** `P2-M05`
- **Status:** **Complete**

---

## 1. Summary of Changes & Live CI Defect Resolution

1. **Live Phase 2 Exit-Gate E2E Suite & UI Token Hardening (`31494ad`):**
   - Added [`phase2-registry-and-cbse-academics.spec.ts`](../../tests/e2e/phase2-registry-and-cbse-academics.spec.ts) enforcing `E2E_REQUIRE_SUPABASE === "true"` fail-fast execution in CI across 5 live scenarios: Principal CBSE XI–XII & cross-section `TG-XI-APPMATH-1` + confidential custom fields, 3-row staged CSV bulk import/dry-run/valid-only commit/CSV report download, Dual Member relationship scoping + confidential redaction + imports denial + Valley ward switching, Monitor XI-A read-only coordination view + zero management forms, and 4-viewport horizontal overflow + WCAG 2.0/2.1 AA `AxeBuilder` audits.
   - Aligned [`imports/page.tsx`](../../app/t/[slug]/imports/page.tsx) and [`imports/[batchId]/page.tsx`](../../app/t/[slug]/imports/[batchId]/page.tsx) with canonical `globals.css` WCAG AA tokens (`text-fg`, `text-fg-muted`, `border-border-subtle`, `border-border-strong`) and `min-w-0` responsive guards, and added optional `E2E_PORT` configuration to [`playwright.config.ts`](../../playwright.config.ts).
2. **Relationship-Scoped `public.persons` RLS (`4fbbc61` & `beab9d2`):**
   - Added forward-only Migrations [`202611270008_persons_relationship_read_rls.sql`](../../supabase/migrations/202611270008_persons_relationship_read_rls.sql) and [`202611270009_restrict_person_read_staff_assignments.sql`](../../supabase/migrations/202611270009_restrict_person_read_staff_assignments.sql) defining `app_auth.can_read_person_profile(uuid)` (`STABLE SECURITY DEFINER SET search_path = ''`, `REVOKE ALL FROM PUBLIC, anon`, `GRANT EXECUTE TO authenticated`) and policy `persons_select_relationship_scoped`, restricting assignment-wide name resolution strictly to staff assignments (`'hod'`, `'class_teacher'`, `'subject_teacher'`) while keeping student monitors scoped via `app_auth.can_access_student_profile()`.
   - Expanded [`02_phase2_registry_and_academics_rls.test.sql`](../../supabase/tests/02_phase2_registry_and_academics_rls.test.sql) from 32 to **40** pgTAP assertions (`88` total pgTAP assertions across 3 suites).
3. **PostgREST `PGRST201` Ambiguous FK Resolution Fix (`beab9d2`):**
   - Replaced ambiguous `person:persons(...)` embeds on `public.academic_assignments` (which carries both `person_id` and `assigned_by_person_id` FKs) in `getSectionDetail()`, `listTeachingGroups()`, and `listAcademicAssignments()` inside [`server/academics/service.ts`](../../server/academics/service.ts) with direct `academic_assignments` queries (surfacing errors explicitly), caller-RLS batch lookup `fetchPersonNameMap()`, pure `resolveSectionRoleAssignments()` in [`lib/academics/conflicts.ts`](../../lib/academics/conflicts.ts), and unit tests in [`academics-conflicts.test.ts`](../../tests/unit/academics-conflicts.test.ts).
4. **CI Rate-Limit Hardening & Phase 2 Closure (`P2-M05` Closure):**
   - Upgraded `supabase/setup-cli@v1` (`version: latest`) to npm-backed `supabase/setup-cli@v3` (`version: ^2`) in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) across `supabase-rls-pgtap` and `e2e-live-auth`, eliminating GitHub release-API rate-limit failures and Node 20 deprecation warnings.
   - Closed Phase 2 as **Complete** in [`ROADMAP.md`](../ROADMAP.md) and synced all repository control documents.

---

## 2. Live Verification & Phase 2 Exit Gate Evidence

- **Verified Live GitHub Actions CI Run [`46087393787`](https://github.com/Thangboiahi/DD-oodle-School-OS/actions/runs/46087393787)** (commit `beab9d2` on `main`, following `31494ad` and `4fbbc61`):
  1. **Job 1 — `App Quality & Hygiene` (`140803311016`):** **PASS** (`54s` — `pnpm typecheck`, `pnpm lint`, **66/66** Vitest unit & SQL static invariant checks across 28 forced-RLS public tables, `pnpm build`, docs hygiene).
  2. **Job 2 — `Supabase RLS & pgTAP Verification` (`140803309054`):** **PASS** (`2m0s` — `supabase start`, `supabase db reset`, **88/88** pgTAP assertions across 3 suites: `01_multi_tenant_rls` 26/26, `02_phase2_registry_and_academics_rls` 40/40, `03_import_staging_rls` 22/22, plus clean `supabase db lint`).
  3. **Job 3 — `Live Multi-Tenant Auth & A11y E2E` (`140803310183`):** **PASS** (`3m12s` — **15/15** Playwright E2E checks: 10 Phase 1 multi-tenant auth/responsive/a11y checks + 5 Phase 2 CBSE XI–XII, cross-section `TG-XI-APPMATH-1`, staged bulk import/report, `dual.member` relationship & confidential redaction + Valley switch, `monitor.11a` read-only boundary, and 4-viewport + WCAG 2.0/2.1 AA axe-core checks).

---

## 3. Formal Phase 2 Exit Gate Sign-Off

All Phase 2 blueprint exit criteria (`DD-oodle_MASTER_PROJECT_BLUEPRINT.md` Part A §15) are live-verified green:
- CBSE Senior Secondary XI–XII reference school model (`AY-2026-27`, `Senior Secondary` department, `XI-A` & `XI-B`, Science & Commerce streams, individual mixed electives, and cross-section `TG-XI-APPMATH-1`) operates end-to-end under forced RLS.
- Relationship-scoped access (`dual.member` Subject Teacher/Guardian, HOD, Class Teacher, read-only Monitor XI-A) and field sensitivity masking (`standard` vs `confidential` `counseling_note`) are enforced cleanly at PostgreSQL RLS, server DAL, and browser UI layers.
- Staged Bulk Import (`import_batches`, `import_rows`, 5 MB/5,000-row caps, CSV formula neutralization, non-overwriting valid-only commit, and `Cache-Control: no-store` audit reports) passes pgTAP and live E2E without unreviewed writes.
- Zero critical/serious WCAG 2.0/2.1 AA violations and zero horizontal overflow across all 4 responsive viewports.

---

## 4. Next Recommended Action

Phase 2 is **Complete**. Next milestone awaits Product Owner kick-off: candidate **`P3-M01`** — Phase 3 Attendance, Leave & Digital Student Handbook Core Schema, Forced RLS & pgTAP Suite.
