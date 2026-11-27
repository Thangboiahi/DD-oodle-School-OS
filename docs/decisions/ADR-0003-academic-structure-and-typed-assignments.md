# ADR-0003: Academic Structure Separation & Typed Time-Bound Assignments

- **ID & Title:** `ADR-0003` — Academic Structure Separation & Typed Time-Bound Assignments
- **Status:** Accepted
- **Date:** 2026-11-27
- **Decision Owner:** Product Owner (DD-oodle)

---

## Context / Problem

Indian CBSE Senior Secondary institutions (especially Classes XI and XII) cannot be represented accurately by a flat "class + section" table or static string labels on user profiles. Students within the same administrative section (`XI-A`, `XI-B`) frequently enroll in different streams (`Science`, `Commerce`) and mixed elective combinations (`Applied Mathematics`, `Computer Science`), and attend cross-section teaching groups that combine learners from multiple sections. Staff responsibilities (`hod`, `class_teacher`, `subject_teacher`) and student classroom roles (`monitor`, `monitress`) are time-bound session assignments rather than permanent identity attributes. Furthermore, in a shared multi-tenant PostgreSQL database (`ADR-0001`), linking an enrolment or assignment from Institution A to a class, section, or teaching group in Institution B must be impossible structurally as well as under Row Level Security (RLS).

## Options Considered

1. **Separated academic structure tables with typed `academic_assignments` and composite `(institution_id, id)` tenant foreign keys:** Distinct tables for `academic_sessions`, `academic_terms`, `academic_departments` (including class-band departments), `grade_levels`, `sections`, `streams`, `subjects`, `subject_offerings`, `student_session_enrolments`, `student_subject_enrolments`, `teaching_groups`, `teaching_group_memberships`, and `academic_assignments`.
2. **Polymorphic single-table `role_assignments.scope_ref_id` without SQL foreign keys:** Reuse Phase 1 `role_assignments` alone for HOD/class teacher/subject teacher/monitor targeting without SQL FK enforcement to departments, sections, or teaching groups.
3. **Hardcoded section-to-subject coupling:** Require every subject and teaching group to belong exclusively to a single section, forbidding mixed XI–XII electives across sections.

## Decision & Rationale

Adopt **Option 1**:

1. **Separate Core Academic Concepts (Blueprint §18 #9):** Model `academic_sessions`, `academic_terms`, `academic_departments` (`class_band`, `subject_group`, `functional`), `grade_levels`, `sections`, `streams`, `subjects`, `subject_offerings`, `student_session_enrolments`, `student_subject_enrolments`, and `teaching_groups` (`is_cross_section boolean`) + `teaching_group_memberships` as independent normalized tables.
2. **Typed, Time-Bound `academic_assignments` (Blueprint §18 #10 & #14):** Represent `hod`, `class_teacher`, `subject_teacher`, `monitor`, and `monitress` allocations in `public.academic_assignments` with `starts_on`/`ends_on`, `status` (`active` | `delegated` | `completed` | `revoked`), and a strict `CHECK` constraint requiring the exact target column (`department_id` for `hod`, `section_id` for `class_teacher`/`monitor`/`monitress`, and `teaching_group_id` for `subject_teacher`).
3. **Composite Tenant Foreign Keys:** Every Phase 2 entity table carries `UNIQUE (institution_id, id)` and references parent records via `(institution_id, <fk_id>) ... ON DELETE RESTRICT`, making cross-tenant references impossible at the database constraint level.
4. **Relationship-Scoped Access Helpers:** Private `app_auth` `SECURITY DEFINER` helpers derive student access dynamically from active session enrolments, cross-section teaching group memberships, and valid `academic_assignments` rather than relying on unchecked client filters.

## Security / Privacy / Data Implications

- Prevents cross-tenant joins or assignment spoofing via SQL composite foreign keys alongside `ENABLE` + `FORCE ROW LEVEL SECURITY`.
- A `subject_teacher` sees only students actively enrolled in their assigned `teaching_groups`, even when those groups span multiple sections (`XI-A` and `XI-B`), rather than all students across a grade.
- `class_teacher` and `hod` visibility is bounded strictly to their active section or class-band department assignments.
- `monitor` and `monitress` allocations grant limited read-only visibility inside `app_auth` helpers and zero write permissions on official institutional/enrolment tables (`Blueprint §18 #14`).

## Cost / Maintenance Implications

- Adds 13 normalized tables (`202611270005_academic_structure_and_assignments.sql`) with deterministic B-tree indexes on `(institution_id, ...)` lookup paths used inside RLS predicates.
- Keeps future phases (Phase 3 attendance, Phase 4 academic planning, Phase 5 timetables & examinations) cleanly anchored to `student_session_enrolments` and `teaching_groups` without schema rewrites.

## Migration / Rollback Implications

- Applied cleanly forward via `supabase/migrations/202611270005_academic_structure_and_assignments.sql` and `202611270006_phase2_rls_and_helpers.sql` prior to Phase 2 UI routes.
- Because `academic_assignments` targets concrete FKs, Phase 1 `institution_roles` / `role_assignments` remain unchanged as RBAC capability bundles while operational academic scoping sits cleanly in `academic_assignments`.

## Consequences & Revisit Conditions

- **Consequences:** All future CBSE Senior Secondary UI screens, Year-End Academic Session Transition Wizards, attendance registers, and exam modules must reference `academic_sessions`, `student_session_enrolments`, `teaching_groups`, and `academic_assignments`.
- **Revisit conditions:** Multi-campus school trust administration (Phase 10 / Future Roadmap) may introduce campus-scoped qualifiers without altering core session/enrolment/group boundaries.

## Links to Requirements & Implementation Milestones

- Master Blueprint: Part A §3.4, §6.3, §7.1–§7.4, §15 Phase 2, §18 (#9, #10, #11, #14).
- Related ADRs: [`ADR-0001`](ADR-0001-multi-tenant-database-strategy.md), [`ADR-0002`](ADR-0002-person-identity-and-session-enrolment.md).
- Milestones: `P2-M01` (`202611270005`, `202611270006`, `supabase/seed.sql`, `02_phase2_registry_and_academics_rls.test.sql`).
