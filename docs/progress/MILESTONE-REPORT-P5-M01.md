# Milestone Completion Report — `P5-M01`

- **Milestone:** `P5-M01` — Phase 5 ADRs, Timetable, Academic Calendar, Examinations & Immutable Result Snapshots Core Schema, Forced RLS & pgTAP Suite
- **Date:** `2026-11-28`
- **Phase:** Phase 5 — Timetable, Examinations & Results (**In Progress**)
- **Status:** **Local Verified — Pending GitHub Actions Live CI Verification**
- **Plan Reference:** [`PHASE-05-MILESTONE-01-timetable-exams-results-schema.md`](../phase-plans/PHASE-05-MILESTONE-01-timetable-exams-results-schema.md)

---

## 1. Delivered Changes

- **Accepted ADRs ([`ADR-0009`](../decisions/ADR-0009-versioned-weekly-timetables-and-substitutions.md), [`ADR-0010`](../decisions/ADR-0010-configurable-assessment-schemes-and-immutable-result-snapshots.md)):**
  - Documented versioned weekly `timetables`, conflict-guarded `timetable_slots`, and date-scoped `timetable_substitutions` separated from the weekly template.
  - Documented institution-configurable versioned `assessment_schemes` (avoiding hardcoded unverified board rules), staged `exam_marks_entries` governance, zero student/guardian/monitor access to raw marks, and statement-level immutable `result_snapshots` with reason-audited reissues (`revision_no + 1`).
- **Migrations 17–19 (`202611280008`–`202611280010`):**
  - [`202611280008_timetable_and_calendar_schema.sql`](../../supabase/migrations/202611280008_timetable_and_calendar_schema.sql): Added 6 forced-RLS tables (`venues`, `timetable_periods`, `timetables`, `timetable_slots`, `timetable_substitutions`, `academic_calendar_events`) with composite tenant FKs, `CHECK` constraints, and partial unique indexes preventing teacher/venue/teaching-group double-booking within a timetable version.
  - [`202611280009_examinations_and_result_snapshots.sql`](../../supabase/migrations/202611280009_examinations_and_result_snapshots.sql): Added 5 forced-RLS tables (`assessment_schemes`, `exam_cycles`, `exam_schedules`, `exam_marks_entries`, `result_snapshots`) plus statement-level `BEFORE UPDATE OR DELETE` trigger `trg_result_snapshots_immutable` (`prevent_result_snapshot_mutation()`) raising SQLSTATE `42501`.
  - [`202611280010_phase5_rls_and_helpers.sql`](../../supabase/migrations/202611280010_phase5_rls_and_helpers.sql): Enabled + forced RLS across all 11 tables (**56** total forced-RLS `public.*` tables), created private `app_auth` helpers (`can_manage_timetable`, `can_read_timetable`, `can_write_timetable_substitution`, `can_manage_exams`, `can_enter_exam_marks`, `can_moderate_exam_marks`, `can_read_result_snapshot`) with `SET search_path = ''`, and defined explicit `TO authenticated` policies.
- **Seed, Static Invariants & pgTAP ([`seed.sql`](../../supabase/seed.sql), [`sql-migration-invariants.test.ts`](../../tests/unit/sql-migration-invariants.test.ts), [`06_phase5_timetable_exams_results_rls.test.sql`](../../supabase/tests/06_phase5_timetable_exams_results_rls.test.sql)):**
  - Seeded Sunrise & Valley venues, periods, published/draft timetables, cross-section & homeroom slots, daily substitution, scoped calendar events, configurable assessment schemes (`compliance_verified_at = NULL`), published exam cycles, schedules, staged marks entries, and immutable result snapshots while preserving all Phase 1–4 rows.
  - Updated static SQL invariant tests to require all **56** forced-RLS `public.*` tables and added 50 live pgTAP assertions verifying forced RLS, `anon`/`platform.ops` zero visibility, composite tenant FKs (`23503`), timetable double-booking conflicts (`23505`), statement-level `42501` immutability under both `authenticated` and `RESET ROLE`, subject-teacher vs moderator vs student/guardian/monitor boundaries, and reason-audited reissue snapshots.

---

## 2. Verification Summary

- Local `pnpm typecheck`, `pnpm lint`, `pnpm test` (`sql-migration-invariants.test.ts` updated to 56 forced-RLS public tables), `pnpm build`, and docs link/empty-directory hygiene checks verified prior to `origin/main` push; live GitHub Actions CI run (`supabase db reset`, `supabase test db`, `supabase db lint`, and `e2e-live-auth`) pending.

---

## 3. Recommended Next Action

Proceed to **`P5-M02`** — Weekly Timetables, Conflict Prevention, Substitutions & Academic Calendar Server DAL + UI once CI verifies `P5-M01` green.
