# Milestone Report: P4-M01 — Phase 4 ADRs, Communication, Academic Planning & Hybrid Assignments Core Schema, Forced RLS & pgTAP Suite

- **Date:** 2026-11-28
- **Phase:** Phase 4 — Structured Communication & Academic Planning (**In Progress**)
- **Milestone:** `P4-M01`
- **Status:** **Local Verified — Pending GitHub Actions Live CI Verification**

---

## 1. Summary of Changes

1. **Accepted Architecture Decision Records (`docs/decisions/`):**
   - [`ADR-0007-record-bound-contextual-communication.md`](../decisions/ADR-0007-record-bound-contextual-communication.md): Establishes strict non-chat, record-bound communication anchored exclusively to `official_notices`, `parent_enquiries`, or `assignments` via `record_comments`, with parent RLS inheritance and `is_internal_staff_note` staff-only partitioning.
   - [`ADR-0008-unified-hybrid-assignments-and-handbook-seam.md`](../decisions/ADR-0008-unified-hybrid-assignments-and-handbook-seam.md): Establishes the unified hybrid `assignments` + `assignment_submissions` model (`submission_mode`: `online` | `offline` | `both`; `evaluation_mode`: `manual` | `auto_mcq` | `rubric`), normalized `Session -> Term -> Subject Offering -> Syllabus Items -> Lesson Plans & Learning Resources` hierarchy, and live Handbook Phase 4 seam integration plan.
2. **Forward-Only Migrations (`supabase/migrations/`):**
   - `202611280005_academic_planning_and_assignments.sql`: Extends existing forced-RLS `public.academic_terms` (created in Migration 5) with lifecycle `status` (`planned` | `active` | `completed`) and creates **5** new forced-RLS tables (`syllabus_items`, `lesson_plans`, `learning_resources`, `assignments`, `assignment_submissions`) with composite `(institution_id, id)` tenant FKs, `delayed` reason guard, `updated_at` triggers, and B-tree indexes.
   - `202611280006_communication_and_contextual_comments.sql`: Creates **4** new forced-RLS tables (`official_notices`, `notice_acknowledgements`, `parent_enquiries`, `record_comments`) with strict `scope_type` target exclusion and mutually exclusive `record_comments` parent foreign-key `CHECK` constraints (zero unlinked chat rooms).
   - `202611280007_phase4_rls_and_helpers.sql`: Enables + forces RLS on all 9 new tables (**45** total forced-RLS `public.*` tables across 16 migrations, including existing `academic_terms`), defines 11 `STABLE SECURITY DEFINER SET search_path = ''` `app_auth` helpers (`is_active_staff_or_leadership`, `is_department_hod`, `is_teaching_group_oversight`, `is_student_or_guardian_in_teaching_group`, `is_monitor_for_teaching_group`, `can_manage_subject_offering_planning`, `can_read_subject_offering_planning`, `can_read_official_notice`, `can_read_parent_enquiry`, `can_read_assignment`, `can_read_record_comment`), and configures explicit `TO authenticated` RLS policies.
3. **Synthetic Seed, pgTAP Suite & Static SQL Invariants:**
   - Expanded [`seed.sql`](../../supabase/seed.sql) (preserving all Phase 1–3 rows) with Sunrise & Valley `TERM-2` rows, Sunrise `APP-MATH` `syllabus_items` (`in_progress` + `delayed`), `lesson_plans`, `learning_resources`, published & draft hybrid `assignments`, `online` + `completed_offline` submissions, scoped `official_notices`, Sunrise & Valley `parent_enquiries`, and public + internal-staff `record_comments`.
   - Added 44-assertion pgTAP suite [`05_phase4_communication_planning_assignments_rls.test.sql`](../../supabase/tests/05_phase4_communication_planning_assignments_rls.test.sql) and updated [`sql-migration-invariants.test.ts`](../../tests/unit/sql-migration-invariants.test.ts) to enforce all **45** forced-RLS `public.*` tables.

---

## 2. Verification Summary

- Local TypeScript, ESLint, Vitest (asserting 45 forced-RLS public tables), Next.js production build, and docs hygiene checks verified cleanly prior to `origin/main` push; live PostgreSQL `supabase db reset`, `supabase test db` (175 total pgTAP assertions across 5 suites), `supabase db lint`, and Playwright CI results pending GitHub Actions verification.

---

## 3. Next Recommended Action

Proceed to **`P4-M02`** — Scoped Official Notices, Acknowledgements, Formal Parent Enquiries & Record-Bound Comments Server DAL + UI once CI verifies `P4-M01` green.
