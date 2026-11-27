# ADR-0002: Global Person Identity, Concurrent Memberships & Three-Layer Session Enrolment

- **ID & Title:** `ADR-0002` — Global Person Identity, Concurrent Memberships & Three-Layer Session Enrolment
- **Status:** Accepted
- **Date:** 2026-11-27
- **Decision Owner:** Product Owner (DD-oodle)

---

## Context / Problem

In traditional school ERPs, accounts are fragmented by role (`teacher_users`, `parent_users`, `student_users`) and duplicated or overwritten each academic year when students are promoted or staff change responsibilities. In DD-oodle's target environment (including Indian CBSE Senior Secondary schools), one individual may simultaneously be a teacher, class teacher, HOD, parent at another school and alumni, while students in the same section frequently take different elective combinations and cross-section teaching groups.

## Options Considered

1. **Role-specific user tables & mutable current-class fields on student rows:** Simple initially, but fails multi-role users, breaks historical reporting after promotion and cannot represent cross-section teaching groups.
2. **Three-layer model with Global Person Identity, Institution Memberships, Academic Session Enrolments/Teaching Groups and Time-Bound Assignments:** Clean separation of human identity, institutional affiliation, annual academic placement and operational history.

## Decision & Rationale

Adopt **Option 2** across all Phase 1+ schema and domain design:

1. **One Global Person Identity:** Each human has a single `person` identity linked to authentication (`Supabase Auth`). Personal profile attributes remain independent of institution memberships.
2. **Concurrent Institution Memberships:** A person holds one or more `membership` records per institution (e.g., Teacher + Parent in different or same institutions). Revoking one membership preserves the global identity and all other memberships.
3. **Three-Layer Academic & Operational Data Model:**
   - **Layer 1 — Permanent Identity:** `person` record, stable internal ID, guardian relationships and verified external identifiers (e.g., PEN/APAAR stored as attributes with verification metadata, never as primary keys).
   - **Layer 2 — Session-Based Placement & Allocation:** Per-`academic_session` records for student enrolment, `class`/`grade`, `section` (administrative cohort), `subject_offering`, optional `stream`, `teaching_group` and individual `student_subject_enrolment`. Sections and teaching groups are strictly decoupled so mixed Senior Secondary XI/XII electives and cross-section classes work natively.
   - **Layer 3 — Historical Transactions:** Attendance, leave, marks, assignments, fees, discipline, documents and approvals link to the applicable person, institution, session enrolment/assignment and effective period.
4. **Time-Bound Staff & Student Leader Assignments:** Subject teachers, class teachers, HODs, coordinators, acting/substitute covers and student monitors/monitresses are represented as scoped, dated assignment records (`start_date`, `end_date`, `session_id`, `scope`, `status`), never as permanent user-type columns.

## Security / Privacy / Data Implications

- Prevents unintended privilege carry-over across sessions or after role/institution revocation (e.g., graduated alumni retain restricted historical/certificate views only, never active class access).
- Guardian relationships and role-assignment scopes enable least-privilege ABAC/relationship-based RLS policies (e.g., a subject teacher accesses students in their active teaching groups, not unrelated fee/medical records).
- Monitors/monitresses remain strictly read/coordination-scoped and cannot alter official attendance, marks or protected records.

## Cost / Maintenance Implications

- Slightly higher initial schema complexity (join paths across identity, membership, session enrolment and assignments) compared to flat student/staff tables.
- Eliminates costly annual data-duplication bugs, promotion corruption and multi-account support tickets.

## Migration / Rollback Implications

- Must be established from the very first Phase 1 identity/tenancy migration (`P1-M03`) and Phase 2 academic migrations. Retrofitting a flat schema into a 3-layer session model after live attendance/marks data exists is high-risk and invasive.

## Consequences & Revisit Conditions

- **Consequences:** All queries for "current students" or "assigned teachers" must filter by active `academic_session` and active time-bound `assignment` / `enrolment` state. Year-end progression must follow the Session Transition workflow (dry-run + immutable historical archive + corrective transactions).
- **Revisit conditions:** Only if an institutional board/regulatory model introduces non-session continuous competency structures that require extending Layer 2 alongside `academic_session`.

## Links to Requirements & Implementation Milestones

- Master Blueprint: Part A §1.3 (#1, #4, #5), §2.2, §3.2–§3.5, §4.1–§4.2, §7.1–§7.4, §18 (#7, #9, #10, #11, #14).
- Milestones: `P1-M03` (global identity & membership schema), `P2` (academic structure, teaching groups & assignments).
