# ADR-0006: Category-Partitioned Digital Student Handbook & Visibility RLS

- **ID & Title:** `ADR-0006` — Category-Partitioned Digital Student Handbook & Visibility RLS
- **Status:** Accepted
- **Date:** 2026-11-28
- **Decision Owner:** Product Owner (DD-oodle)

---

## Context / Problem

DD-oodle's Digital Student Handbook replaces paper school diaries with a structured, auditable record covering teacher observations, notice acknowledgements, parent communication references, disciplinary notes, and confidential student support notes. Mixing these notes into one unpartitioned chat stream or flat notes table risks leaking sensitive disciplinary or pastoral records to peers, monitors, unrelated subject teachers, or unauthorized guardians, while failing to reflect real-time attendance and leave status reliably.

## Options Considered

1. **Authoritative live operational views paired with category- and scope-partitioned `public.handbook_entries` enforced in PostgreSQL RLS (`visibility_scope` + `category`):** Assemble attendance and leave summaries dynamically from Phase 3 tables while persisting structured `handbook_entries` guarded by `app_auth.can_read_handbook_entry(...)` inside forced RLS policies, leaving explicit extension seams for Phase 4 academic planning/assignments and Phase 6 fees.
2. **Free-form student timeline / chat stream without `visibility_scope` RLS partitioning:** Rely purely on frontend role filters to hide sensitive disciplinary or counseling entries.
3. **Duplicate attendance, leave, and fee snapshots inside handbook JSON blobs:** Copy attendance and leave state into unstructured handbook entries on every update.

## Decision & Rationale

Adopt **Option 1**:

1. **Derived Live Summaries (Zero Stale Snapshots):** Student Handbook views read authoritative attendance (`student_daily_attendance`), leave (`leave_applications`), and notices (`parent_attendance_notices`) directly under PostgreSQL RLS, reserving clean integration points for Phase 4 assignments and Phase 6 fee summaries.
2. **Category & Visibility Partitioning (`public.handbook_entries`):** Every persisted entry carries both `category` (`academic_observation` | `notice_ack` | `parent_comm_ref` | `disciplinary` | `student_support`) and `visibility_scope` (`student_and_guardian` | `staff_academic` | `class_teacher_and_leadership` | `leadership_only`), plus optional composite FK `teaching_group_id` for cross-section subject-teacher observations.
3. **Database-Enforced Visibility Predicates (`app_auth.can_read_handbook_entry`):** PostgreSQL RLS enforces partitioning regardless of caller path:
   - `leadership_only`: exclusively `handbook.sensitive.read` or `institution.*`.
   - `class_teacher_and_leadership`: sensitive leadership readers OR active `class_teacher` / `hod` of the student's active section/department (never subject teacher, monitor, student, or guardian).
   - `staff_academic`: leadership/HOD/class teacher of student's section, entry author, or active `subject_teacher` of `teaching_group_id`.
   - `student_and_guardian`: leadership/HOD/class teacher of student's section, author/teaching-group teacher (strictly restricted to `academic_observation`), student self, or active linked guardian.

## Security / Privacy / Data Implications

- Guarantees `monitor`/`monitress` accounts see **zero** classmates' handbook entries (never reading or writing peer diary records).
- Prevents `subject_teacher` accounts from authoring or viewing `disciplinary` or `student_support` notes; Subject Teachers may insert `academic_observation` entries strictly scoped to their active `teaching_group_id`.
- Preserves guardian acknowledgement capability (`acknowledged_by_guardian_at`, `acknowledged_by_guardian_person_id`) without granting edit rights over school-authored content.

## Cost / Maintenance Implications

- Consolidates 5 handbook note categories into one forced-RLS table (`202611280002_digital_student_handbook.sql`) indexed by `(institution_id, student_profile_id, category, status)` and `(institution_id, session_id, visibility_scope)`.
- Eliminates cross-phase duplication by linking Phase 4/6 modules at query/composition time.

## Migration / Rollback Implications

- Applied forward via `supabase/migrations/202611280002_digital_student_handbook.sql` and `202611280003_phase3_rls_and_helpers.sql`.
- Future phases can extend read-only handbook projections cleanly without altering `handbook_entries` constraints or weakening `visibility_scope` predicates.

## Consequences & Revisit Conditions

- **Consequences:** All handbook CRUD endpoints (`P3-M03`) must pass `category` and `visibility_scope` explicitly and execute under the caller's RLS-enforced client.
- **Revisit conditions:** Phase 4 (`Structured Communication & Academic Planning`) and Phase 6 (`Finance & Fees`) will compose alongside `handbook_entries` when those modules begin.

## Links to Requirements & Implementation Milestones

- Master Blueprint: Part A §6.5, §7.5, §10.3, §11.4, §15 Phase 3, §18.
- Related ADRs: [`ADR-0001`](ADR-0001-multi-tenant-database-strategy.md), [`ADR-0004`](ADR-0004-normalized-custom-field-engine.md), [`ADR-0005`](ADR-0005-two-layer-attendance-ledger-and-signoff.md).
- Milestones: `P3-M01` (`202611280002`, `202611280003`, `supabase/seed.sql`, `04_phase3_attendance_leave_handbook_rls.test.sql`).
