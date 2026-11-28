# ADR-0007: Record-Bound Contextual Communication, Scoped Official Notices & Formal Enquiry Cases

- **ID & Title:** `ADR-0007` — Record-Bound Contextual Communication, Scoped Official Notices & Formal Enquiry Cases
- **Status:** Accepted
- **Date:** 2026-11-28
- **Decision Owner:** Product Owner (DD-oodle)

---

## Context / Problem

Schools frequently ask for communication inside their school ERP, yet unlinked messaging channels quickly degrade into noisy, unmoderated chat clones that duplicate informal parent/staff conversations already happening on WhatsApp and create severe privacy leakage and moderation overhead. At the same time, official school circulars, parent enquiries, and assignment clarifications require structured targeting, formal case resolution, staff-only internal coordination notes, and PostgreSQL RLS enforcement tied directly to institutional relationships.

## Options Considered

1. **Strictly record-bound contextual comments (`public.record_comments`) paired with scoped `public.official_notices`, `public.notice_acknowledgements`, and formal case-managed `public.parent_enquiries`:** Enforce mutually exclusive parent foreign keys at the database constraint level (`parent_kind IN ('notice', 'parent_enquiry', 'assignment')`), inherit parent RLS visibility in `app_auth.can_read_record_comment(...)`, partition staff-only internal coordination via `is_internal_staff_note`, and track official circular acknowledgements and enquiry resolution states cleanly.
2. **Free-form multi-participant chat rooms / direct-message threads:** Build generic conversation threads decoupled from academic or administrative records.
3. **Unstructured plain-text comment column or JSON array on parent tables:** Store replies directly inside mutable JSON columns without per-comment authorship or internal-staff isolation.

## Decision & Rationale

Adopt **Option 1** with a non-negotiable architectural boundary: **casual chatting stays outside DD-oodle; every message inside DD-oodle binds to an authoritative operational record**:

1. **Scoped Official Notices (`public.official_notices` & `public.notice_acknowledgements`):**
   - Supports explicit targeting via `scope_type` (`institution` | `department` | `section` | `teaching_group`) verified by a strict mutual-exclusion `CHECK` constraint so exactly the matching foreign key (`department_id`, `section_id`, or `teaching_group_id` — or none for `'institution'`) is populated.
   - Enables subject teachers to publish notices independently to their assigned teaching groups (`TG-*`) while reserving institution-wide, department-wide, and section-wide notices for authorized leadership, HODs, and Class Teachers.
   - Carries `requires_acknowledgement` and `is_offline_cacheable` flags aligned with `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` Part A §12.5 (only explicitly designated public/notice items may be cached offline, never sensitive records), plus idempotent per-person/ward acknowledgement records in `notice_acknowledgements`.
2. **Formal Parent Enquiry Cases (`public.parent_enquiries`):**
   - Models guardian-initiated enquiries as formal auditable cases (`open` -> `in_review` -> `resolved` -> `closed`) linked strictly to a `student_profile_id`, `guardian_person_id`, optional `section_id`, and optional `teaching_group_id`.
   - Visible exclusively to the initiating linked guardian, assigned staff handler, relevant Class Teacher / HOD / Subject Teacher (if group-scoped), and institutional leadership — never peers or section monitors.
3. **Mutually Exclusive Record-Bound Comments (`public.record_comments`):**
   - Enforces at the SQL `CHECK` constraint level that `record_comments` ALWAYS references **exact one** authoritative parent (`notice_id`, `parent_enquiry_id`, or `assignment_id` matching `parent_kind`). Unlinked or multi-parent rows fail with PostgreSQL `23514`.
   - `app_auth.can_read_record_comment(...)` derives visibility dynamically from the parent record and strictly suppresses `is_internal_staff_note = true` comments from students, guardians, and monitors.

## Security / Privacy / Data Implications

- **Zero Unlinked Messaging Surface:** No `chat_rooms`, `direct_messages`, or arbitrary inbox tables exist in PostgreSQL.
- **Staff-Only Internal Notes:** Teachers, Class Teachers, HODs, and leadership can collaborate privately (`is_internal_staff_note = true`) on a notice, assignment, or parent enquiry without risking exposure to parents, students, or section monitors.
- **Monitor Isolation:** Classroom Monitors can read published board-relevant institution/section notices for class coordination but see **0** `draft` notices, **0** `parent_enquiries`, **0** `is_internal_staff_note` comments, and **0** writes (`42501`).

## Cost / Maintenance Implications

- Consolidates cross-module structured communication into 4 forced-RLS tables with composite `(institution_id, id)` tenant foreign keys and B-tree indexes matching RLS predicates.
- Reuses `app_auth` session/assignment helpers without duplicating membership or classroom hierarchy state.

## Migration / Rollback Implications

- Applied forward-only via `supabase/migrations/202611280006_communication_and_contextual_comments.sql` and `202611280007_phase4_rls_and_helpers.sql`.
- Future phases (e.g., Phase 5 Exam Appeals or Phase 6 Fee Inquiries) can extend `parent_kind` forward-only by adding nullable parent FK columns without breaking existing `record_comments` rows.

## Consequences & Revisit Conditions

- **Consequences:** All Phase 4 server DAL services and UI routes (`P4-M02`–`P4-M04`) must anchor discussions to notices, enquiries, or assignments and execute purely through caller-RLS queries.
- **Revisit conditions:** Re-evaluate `is_offline_cacheable` policy only if Phase 9 push/WhatsApp gateway notifications add additional delivery metadata.

## Links to Requirements & Implementation Milestones

- Master Blueprint: Part A §3.5, §4.1–§4.3, §5.1–§5.4, §6.6, §11.4, §12.5, §15 Phase 4.
- Related ADRs: [`ADR-0001`](ADR-0001-multi-tenant-database-strategy.md), [`ADR-0003`](ADR-0003-academic-structure-and-typed-assignments.md), [`ADR-0006`](ADR-0006-category-partitioned-digital-student-handbook.md), [`ADR-0008`](ADR-0008-unified-hybrid-assignments-and-handbook-seam.md).
- Milestones: `P4-M01` (`202611280006`, `202611280007`, `05_phase4_communication_planning_assignments_rls.test.sql`), `P4-M02` (Communication UI), `P4-M04` (Exit Gate).
