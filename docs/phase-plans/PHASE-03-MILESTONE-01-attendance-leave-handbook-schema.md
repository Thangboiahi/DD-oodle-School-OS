# Phase 3 — Milestone 01: Attendance, Leave & Digital Student Handbook Core Schema, Forced RLS & pgTAP Suite

```text
MILESTONE ID: P3-M01
PHASE: Phase 3 — Attendance, leave and digital handbook
TITLE: Phase 3 ADRs, Attendance, Leave & Digital Student Handbook Core Schema, Forced RLS & pgTAP Suite
OBJECTIVE: Record accepted ADR-0005 and ADR-0006, implement 8 forced-RLS multi-tenant PostgreSQL tables for Attendance, Leave, Parent Notices, and Digital Student Handbook with composite tenant FKs, append-only immutability triggers, and category/relationship RLS helpers, expand supabase/seed.sql, and verify every boundary with pgTAP + static SQL invariants.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.5, §4.1-§4.3, §6.4-§6.5, §10.2-§10.3, §11.4, §11.6, §12.5, §15 Phase 3; Part D6.
PRECONDITIONS: Phase 2 closed Complete (P2-M05, CI Run 46087393787 green with 66/66 Vitest + 88/88 pgTAP + 15/15 Playwright) and Product Owner Phase 3 kick-off issued.
IN SCOPE:
  - Accepted ADRs (ADR-0005 two-layer append-only attendance ledger + sign-off workflow & disabled-by-default biometric posture; ADR-0006 category-partitioned Digital Student Handbook with live Phase 3 assembly + Phase 4/6 extension seams).
  - Migration 10 (202611280001_attendance_and_leave_schema.sql): attendance_policies, append-only attendance_events (with BEFORE UPDATE OR DELETE trigger), student_daily_attendance, student_period_attendance, staff_daily_attendance, leave_applications, parent_attendance_notices.
  - Migration 11 (202611280002_digital_student_handbook.sql): handbook_entries partitioned by category and visibility_scope.
  - Migration 12 (202611280003_phase3_rls_and_helpers.sql): FORCE ROW LEVEL SECURITY across all 8 new tables (36 total forced-RLS public tables), private app_auth helpers (is_section_class_teacher_or_hod, is_section_monitor, is_teaching_group_teacher, can_read_handbook_entry), and role/relationship/scope RLS policies.
  - Synthetic two-institution seed expansion (supabase/seed.sql) and 41-assertion pgTAP security suite (supabase/tests/04_phase3_attendance_leave_handbook_rls.test.sql) + updated sql-migration-invariants.test.ts (36 tables).
OUT OF SCOPE:
  - Phase 3 server DAL services, Server Actions, or App Router UI for Attendance, Leave, Notices, and Handbook (scheduled next in P3-M02 / P3-M03).
  - Weakening any RLS policy or modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md.
EXPECTED FILES / DOMAINS: docs/decisions/{ADR-0005,ADR-0006}*, supabase/migrations/202611280001..0003*, supabase/seed.sql, supabase/tests/04_phase3_attendance_leave_handbook_rls.test.sql, tests/unit/sql-migration-invariants.test.ts, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Peer monitor access to draft attendance, leave, or disciplinary/support diary notes: blocked via verification_status IN ('class_teacher_verified','signed_off') filter and handbook/leave RLS exclusions.
  - Silent mutation or double-ingestion on attendance events: blocked via BEFORE UPDATE OR DELETE trigger and UNIQUE (institution_id, idempotency_key).
  - Biometric privacy exposure: attendance_policies.biometric_enabled defaults to false and zero biometric templates exist in cloud schema.
NEXT MILESTONE: P3-M02 — Attendance, Leave & Parent Notices Server DAL + UI (/t/[slug]/attendance & offline queue foundation).
```
