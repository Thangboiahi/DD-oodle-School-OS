# ADR-0005: Two-Layer Attendance Ledger, Sign-Off Workflow & Optional Biometric Boundary

- **ID & Title:** `ADR-0005` — Two-Layer Attendance Ledger, Sign-Off Workflow & Optional Biometric Boundary
- **Status:** Accepted
- **Date:** 2026-11-28
- **Decision Owner:** Product Owner (DD-oodle)

---

## Context / Problem

School attendance in Indian K-12 institutions (particularly CBSE schools tracking minimum attendance eligibility) requires simultaneous support for rapid classroom roll-call, offline or campus device gateway ingestion without duplicate writes, progressive teacher sign-off, and post-sign-off accountability. Storing a single mutable row per student date obscures who originally marked attendance, when an automated device gateway scan occurred, or why a record changed after the Class Teacher or office signed off. Additionally, biometric hardware must remain strictly optional, disabled by default (`OD-05` / DPDP Act privacy posture), and zero raw biometric templates may be stored in DD-oodle's cloud PostgreSQL tables.

## Options Considered

1. **Two-layer append-only ledger (`attendance_events`) paired with stateful daily/period records (`student_daily_attendance`, `student_period_attendance`, `staff_daily_attendance`) and institution policy defaults:** Record every arrival, roll-call, check-in/out, and post-sign-off correction as an immutable idempotent event row alongside explicit `draft` -> `class_teacher_verified` -> `signed_off` (or staff `verified`) operational tables, governed by per-institution `attendance_policies` (`biometric_enabled boolean NOT NULL DEFAULT false`).
2. **Single mutable attendance row per student date:** Overwrite one row in place on every edit or device sync without an append-only event ledger or explicit verification/sign-off states.
3. **Mandatory device/biometric ingestion table storing biometric hashes in PostgreSQL:** Coupled biometric identity templates stored directly inside the multi-tenant database.

## Decision & Rationale

Adopt **Option 1**:

1. **Append-Only Idempotent Event Ledger (`public.attendance_events`):** Captures `manual`, `offline_queue`, and `device_gateway` attendance signals keyed by `UNIQUE (institution_id, idempotency_key)`. Protected by a `BEFORE UPDATE OR DELETE` trigger raising an exception (`attendance_events is append-only`) plus zero `UPDATE`/`DELETE` RLS policies. Corrections require `event_type = 'correction'` with a non-blank `reason` and optional `correction_of_event_id`.
2. **Explicit Verification & Sign-Off States:** `public.student_daily_attendance` transitions through `draft` -> `class_teacher_verified` -> `signed_off` (and `public.staff_daily_attendance` through `draft` -> `verified` -> `signed_off`) tracking actor timestamps, `correction_count`, and `last_correction_reason`.
3. **Optional Period Attendance & Strict Biometric Exclusion:** `public.student_period_attendance` supports cross-section Senior Secondary `teaching_groups` roll-call when `attendance_policies.period_attendance_enabled` is enabled. `attendance_policies.biometric_enabled` defaults to `false`, and no cloud table stores raw biometric templates.
4. **Configurable Attendance Thresholds (`attendance_policies`):** Stores per-institution `minimum_attendance_percent` (default `75.00`) and `warning_threshold_percent` (default `80.00`), keeping board-specific percentages school-configurable pending formal CBSE circular verification.

## Security / Privacy / Data Implications

- Enforces `ENABLE` + `FORCE ROW LEVEL SECURITY` and composite `(institution_id, id)` tenant foreign keys on every attendance, leave, and parent notice table.
- Prevents `monitor`/`monitress` accounts from reading unverified `draft` daily attendance (`verification_status IN ('class_teacher_verified', 'signed_off')` only) and denies all attendance writes to monitors, guardians, and `platform_operators`.
- Eliminates biometric template breach exposure by keeping raw biometrics completely absent from DD-oodle cloud storage and disabled by default in policy configuration.

## Cost / Maintenance Implications

- Adds 7 normalized tables (`202611280001_attendance_and_leave_schema.sql`) with deterministic B-tree indexes on `(institution_id, attendance_date)` and section/group/enrolment RLS keys.
- Enables Phase 8 campus device gateways and Phase 3 offline sync queues to replay safely via `idempotency_key` deduplication.

## Migration / Rollback Implications

- Applied forward via `supabase/migrations/202611280001_attendance_and_leave_schema.sql` and `202611280003_phase3_rls_and_helpers.sql` prior to Phase 3 UI/service modules (`P3-M02`).
- Additive alongside Phase 1–2 identity, enrolment, and teaching-group schemas with `ON DELETE RESTRICT` tenant boundaries.

## Consequences & Revisit Conditions

- **Consequences:** Phase 3 attendance services must write append-only `attendance_events` alongside daily/period state updates, require non-blank reasons for post-sign-off corrections, and never accept biometric template blobs.
- **Revisit conditions:** Official CBSE Examination Bye-Laws circular review (tracked in `COMPLIANCE_AND_RESEARCH_REGISTER.md`) and Phase 8 dedicated campus device gateway contracts (`docs/integrations/`).

## Links to Requirements & Implementation Milestones

- Master Blueprint: Part A §3.5, §4.1–§4.3, §6.4, §10.2, §11.6, §15 Phase 3, §18.
- Related ADRs: [`ADR-0001`](ADR-0001-multi-tenant-database-strategy.md), [`ADR-0003`](ADR-0003-academic-structure-and-typed-assignments.md), [`ADR-0006`](ADR-0006-category-partitioned-digital-student-handbook.md).
- Milestones: `P3-M01` (`202611280001`, `202611280003`, `supabase/seed.sql`, `04_phase3_attendance_leave_handbook_rls.test.sql`).
