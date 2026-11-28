# ADR-0009: Versioned Weekly Timetables, Conflict Constraints & Date-Scoped Substitutions

- **ID & Title:** `ADR-0009` — Versioned Weekly Timetables, Conflict Constraints & Date-Scoped Substitutions
- **Status:** Accepted
- **Date:** 2026-11-28
- **Decision Owner:** Product Owner (DD-oodle)

---

## Context / Problem

Senior secondary schools—especially those running CBSE XI–XII mixed elective combinations and cross-section teaching groups (`TG-*`)—experience frequent mid-term schedule adjustments alongside daily teacher absences. If a master timetable allows silent overlapping teacher, room/venue, or teaching-group bookings, or if daily substitute teacher coverage mutates the base weekly template, historical attendance, examination scheduling, and teacher workload views drift silently and break auditability.

## Options Considered

1. **Versioned Weekly `timetables` + Conflict-Guarded `timetable_slots` + Separate Date-Scoped `timetable_substitutions`:** Model institutional rooms (`venues`) and bell schedules (`timetable_periods`) separately; store weekly templates as versioned `timetables` (`draft` -> `published` -> `archived`, `is_offline_cacheable`); prevent double-booking inside each timetable version via partial unique indexes; and record daily teacher cover in a separate `timetable_substitutions` table.
2. **Mutable Global Slot Grid:** Overwrite teacher and room assignments directly in place when teachers are absent or term transitions occur, losing version history and conflating temporary cover with permanent allocation.
3. **Application-Only Conflict Checking:** Rely on React/TypeScript conflict warnings without PostgreSQL unique constraints, leaving concurrent edits or direct API writes vulnerable to double-booking.

## Decision & Rationale

Adopt **Option 1**:

1. **Normalized Venue & Bell-Schedule Foundations (`public.venues`, `public.timetable_periods`):**
   - Each institution manages typed physical/academic spaces (`classroom`, `lab`, `hall`, `library`, `sports`, `other`) with unique per-tenant codes, and ordered time blocks (`instructional`, `break`, `assembly`, `activity`) enforcing `end_time > start_time`.
2. **Versioned Weekly Templates (`public.timetables`) & Slot Conflict Guarantees (`public.timetable_slots`):**
   - `timetables` versions weekly schedules cleanly per `session_id` and optional `term_id` via `(institution_id, session_id, code, version_no)` with explicit lifecycle states (`draft` -> `published` -> `archived`) and a controlled offline-caching flag (`is_offline_cacheable`, §12.5).
   - Non-staff institution members (students, guardians, classroom monitors) see **only** `published` timetables under PostgreSQL RLS; staff and academic leadership read `draft`, `published`, and `archived` versions.
   - `timetable_slots` attaches each weekly period (`day_of_week` 1–7, `period_id`) to a `teaching_group_id` or `section_id` (`CHECK (teaching_group_id IS NOT NULL OR section_id IS NOT NULL)`) plus optional teacher and venue, backed by three partial unique indexes inside `(institution_id, timetable_id, day_of_week, period_id)` preventing double-booking of:
     - `teacher_person_id` (`WHERE teacher_person_id IS NOT NULL`)
     - `venue_id` (`WHERE venue_id IS NOT NULL`)
     - `teaching_group_id` (`WHERE teaching_group_id IS NOT NULL`)
3. **Non-Mutating Daily Cover (`public.timetable_substitutions`) & Academic Calendar (`public.academic_calendar_events`):**
   - Daily teacher cover (`timetable_slot_id`, `substitution_date`, `substitute_teacher_person_id`, `reason`, `assigned` | `completed` | `cancelled`) never alters published `timetable_slots` and remains strictly visible to active staff/leadership only (hidden from students, guardians, and monitors).
   - `academic_calendar_events` unifies institutional, department, and section holidays, working days, exam windows, parent meetings, and deadlines with strict `scope_type` target integrity (`CHECK`) and non-instructional flags.

## Security / Privacy / Data Implications

- **Zero Cross-Tenant Schedule/Cover Leakage:** Composite `(institution_id, id)` foreign keys across `venues`, `timetable_periods`, `timetables`, `timetable_slots`, `timetable_substitutions`, and `academic_calendar_events` enforce tenant integrity at SQL constraint level alongside `FORCE ROW LEVEL SECURITY`.
- **Draft & Staff Cover Privacy:** Unpublished `draft` timetables, `draft` calendar events, and internal `timetable_substitutions` remain invisible to `anon`, `platform_operators`, students, guardians, and section monitors.

## Cost / Maintenance Implications

- Separating `venues`, `timetable_periods`, `timetables`, `timetable_slots`, and `timetable_substitutions` avoids sparse denormalized rows and gives both Phase 5 Timetable UI (`P5-M02`) and Exam Scheduling (`P5-M03`) shared canonical venue definitions.

## Migration / Rollback Implications

- Applied forward-only in `supabase/migrations/202611280008_timetable_and_calendar_schema.sql` and `supabase/migrations/202611280010_phase5_rls_and_helpers.sql`, leaving all Phase 1–4 tables untouched.

## Consequences & Revisit Conditions

- **Consequences:** All upcoming Timetable UI and Substitution Server Actions (`P5-M02`) must handle `23505` unique-constraint conflicts cleanly into structured validation feedback and respect `is_offline_cacheable` strictly for `published` schedules.
- **Revisit conditions:** Revisit partial index scoping only if future co-teaching rules require multiple concurrent teachers assigned to the exact same `teaching_group_id` slot.

## Links to Requirements & Implementation Milestones

- Master Blueprint: Part A §3.5, §4.1–§4.3, §6.8, §10.3, §12.5, §15 Phase 5.
- Related ADRs: [`ADR-0001`](ADR-0001-multi-tenant-database-strategy.md), [`ADR-0003`](ADR-0003-academic-structure-and-typed-assignments.md).
- Milestones: `P5-M01` (Core Schema, Forced RLS & pgTAP), `P5-M02` (Timetable, Calendar & Substitutions DAL/UI).
