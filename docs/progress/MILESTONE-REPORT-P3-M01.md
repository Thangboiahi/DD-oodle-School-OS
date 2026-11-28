# Milestone Report: P3-M01 — Phase 3 ADRs, Attendance, Leave & Digital Student Handbook Schema, Forced RLS & pgTAP Suite

- **Date:** 2026-11-28
- **Phase:** Phase 3 — Attendance, Leave & Digital Handbook (**In Progress**)
- **Milestone:** `P3-M01`
- **Status:** **Local Verified — Pending Host Push / Live pgTAP CI**

---

## 1. Summary of Changes

1. **Accepted ADRs (`docs/decisions/`):**
   - Recorded [`ADR-0005`](../decisions/ADR-0005-two-layer-attendance-ledger-and-signoff.md) (Two-Layer Attendance Ledger, Sign-Off Workflow & Optional Biometric Boundary — zero raw biometric templates stored in cloud, disabled by default).
   - Recorded [`ADR-0006`](../decisions/ADR-0006-category-partitioned-digital-student-handbook.md) (Category-Partitioned Digital Student Handbook & Visibility RLS with live Phase 3 assembly and Phase 4/6 seams).
2. **Versioned SQL Migrations (`202611280001`–`202611280003`):**
   - Added [`202611280001_attendance_and_leave_schema.sql`](../../supabase/migrations/202611280001_attendance_and_leave_schema.sql): 7 tables (`attendance_policies`, append-only `attendance_events` with `BEFORE UPDATE OR DELETE` trigger + `UNIQUE (institution_id, idempotency_key)`, `student_daily_attendance`, `student_period_attendance`, `staff_daily_attendance`, `leave_applications`, `parent_attendance_notices`) with composite tenant FKs and B-tree indexes.
   - Added [`202611280002_digital_student_handbook.sql`](../../supabase/migrations/202611280002_digital_student_handbook.sql): `handbook_entries` partitioned by `category` and `visibility_scope` with composite tenant FKs.
   - Added [`202611280003_phase3_rls_and_helpers.sql`](../../supabase/migrations/202611280003_phase3_rls_and_helpers.sql): `ENABLE` + `FORCE ROW LEVEL SECURITY` on all 8 new tables (36 total forced-RLS public tables), private `app_auth` helpers (`is_section_class_teacher_or_hod`, `is_section_monitor`, `is_teaching_group_teacher`, `can_read_handbook_entry`), verified-only monitor read boundary on `student_daily_attendance`, guardian notice scoping, and category/scope-partitioned `handbook_entries` policies.
3. **Seed & Verification Suites (`supabase/`, `tests/unit/`):**
   - Expanded [`supabase/seed.sql`](../../supabase/seed.sql) with Sunrise & Valley `attendance_policies` (`75.00%` / `80.00%`, biometric false), verified `XI-A` and `draft` `XI-B` daily attendance + events, Sunrise staff attendance, Sunrise leave application, Valley parent notice (`dual.member` -> `Kabir Rao`), and 3 category-partitioned `handbook_entries`.
   - Added 41-assertion pgTAP suite [`04_phase3_attendance_leave_handbook_rls.test.sql`](../../supabase/tests/04_phase3_attendance_leave_handbook_rls.test.sql) and updated [`sql-migration-invariants.test.ts`](../../tests/unit/sql-migration-invariants.test.ts) to verify all **36** forced-RLS public tables.

---

## 2. Verification Summary

- **Local Static, Unit & Build Checks:**
  - `pnpm typecheck`: **Passed** (0 errors)
  - `pnpm lint`: **Passed** (0 errors, 0 warnings)
  - `pnpm test`: **Passed** (15 test files, **66/66** passed including `sql-migration-invariants.test.ts` verifying all 36 forced-RLS public tables)
  - `pnpm build`: **Passed** (clean Next.js 16 production bundle)
  - Documentation & repository hygiene: **Passed** (`DOC_HYGIENE_OK emptyDirs=0 mdFiles=44 checkedLinks=150`)
- **Live pgTAP CI Execution:** Pending host Git push and workflow completion.

---

## 3. Next Recommended Action

Proceed to **`P3-M02`** — Attendance, Leave & Parent Notices Server DAL + UI (`/t/[slug]/attendance`) once CI verifies `P3-M01` live pgTAP green.
