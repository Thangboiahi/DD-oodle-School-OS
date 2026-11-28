# Phase 5 — Milestone 01: Timetable, Academic Calendar, Examinations & Immutable Result Snapshots Core Schema, Forced RLS & pgTAP Suite

```text
MILESTONE ID: P5-M01
PHASE: Phase 5 — Timetable, Examinations & Results
TITLE: Phase 5 ADRs, Timetable, Academic Calendar, Examinations & Immutable Result Snapshots Core Schema, Forced RLS & pgTAP Suite
OBJECTIVE: Record accepted ADR-0009 and ADR-0010, implement 11 forced-RLS multi-tenant PostgreSQL tables across 3 forward-only migrations for weekly timetables, daily substitutions, academic calendar, configurable assessment schemes, exam cycles/schedules, staged marks entries, and statement-level immutable result snapshots, expand synthetic seed data, update SQL invariants to 56 forced-RLS public tables, and verify all isolation & immutability boundaries live via pgTAP in CI.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.5, §4.1-§4.3, §6.8-§6.10, §10.3, §11.4, §12.5, §15 Phase 5; Part D6; Part E; ADR-0009; ADR-0010.
PRECONDITIONS: Phases 0-4 Complete and live CI verified green on main (6d25a2d / CI Run 46123440912 with 115/115 Vitest, 178/178 pgTAP + db lint, and 25/25 Playwright across 45 forced-RLS public tables).
IN SCOPE:
  - Accepted ADRs: ADR-0009 (versioned weekly timetables & non-mutating daily substitutions) and ADR-0010 (configurable versioned assessment schemes & statement-level immutable result snapshots with reason-audited reissues).
  - Migration 17 (202611280008_timetable_and_calendar_schema.sql): 6 tables (venues, timetable_periods, timetables, timetable_slots with partial unique conflict indexes preventing teacher/venue/teaching_group double-booking, timetable_substitutions, academic_calendar_events with strict scope_type CHECK).
  - Migration 18 (202611280009_examinations_and_result_snapshots.sql): 5 tables (assessment_schemes, exam_cycles, exam_schedules, exam_marks_entries, immutable result_snapshots protected by statement-level BEFORE UPDATE OR DELETE trigger trg_result_snapshots_immutable raising SQLSTATE 42501 and enforcing non-empty reissue_reason when revision_no > 1).
  - Migration 19 (202611280010_phase5_rls_and_helpers.sql): ENABLE + FORCE ROW LEVEL SECURITY on all 11 new tables (56 total forced-RLS public tables), private app_auth helpers (can_manage_timetable, can_read_timetable, can_write_timetable_substitution, can_manage_exams, can_enter_exam_marks, can_moderate_exam_marks, can_read_result_snapshot), and explicit TO authenticated policies.
  - Expanded supabase/seed.sql (preserving all Phase 1-4 fixtures), 50-assertion pgTAP suite (supabase/tests/06_phase5_timetable_exams_results_rls.test.sql), and updated static SQL invariant check (tests/unit/sql-migration-invariants.test.ts -> 56 tables).
  - Documentation & compliance register updates (Phase 5 marked In Progress in docs/ROADMAP.md; configurable CBSE assessment scheme noted pending official circular verification in COMPLIANCE_AND_RESEARCH_REGISTER.md).
OUT OF SCOPE:
  - Server-only DAL, Zod domain rules, Server Actions, API endpoints, and UI routes under /t/[slug]/timetable, /t/[slug]/exams, or /t/[slug]/results (scheduled for P5-M02 through P5-M04).
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or weakening any RLS policy, pgTAP check, or Playwright assertion.
EXPECTED FILES / DOMAINS: docs/decisions/ADR-0009-*, docs/decisions/ADR-0010-*, supabase/migrations/202611280008..202611280010, supabase/seed.sql, supabase/tests/06_phase5_timetable_exams_results_rls.test.sql, tests/unit/sql-migration-invariants.test.ts, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Double-booking teachers/venues/teaching groups inside a weekly timetable version: prevented structurally via partial unique indexes on timetable_slots.
  - Pre-publication raw exam_marks_entries leakage or student/monitor tampering: students, guardians, and monitors have zero SELECT/INSERT/UPDATE/DELETE policies on exam_marks_entries; subject teachers cannot approve own entries or mutate unassigned groups.
  - Post-publication tampering with result_snapshots: prevented at statement level (trigger raising 42501 for both authenticated and RESET ROLE sessions); corrections require revision_no + 1 with non-empty reissue_reason and supersedes_snapshot_id.
NEXT MILESTONE: P5-M02 — Versioned Weekly Timetables, Conflict Prevention, Substitutions & Academic Calendar Server DAL + UI.
```
