# ADR-0010: Configurable Assessment Schemes, Marks Moderation Workflow & Immutable Published Result Snapshots

- **ID & Title:** `ADR-0010` — Configurable Assessment Schemes, Marks Moderation Workflow & Immutable Published Result Snapshots
- **Status:** Accepted
- **Date:** 2026-11-28
- **Decision Owner:** Product Owner (DD-oodle)

---

## Context / Problem

School examination workflows require strict separation of duties and auditability: board assessment rules (CBSE / State / custom institutional rubrics) evolve across circulars, raw marks entry must remain confidential during moderation and approval, and once final report-card results are published to students and families they must never be silently edited or deleted in place. Hardcoding board calculation rules risks regulatory non-compliance, while exposing `exam_marks_entries` directly to students/guardians or allowing mutable published report cards breaks academic governance.

## Options Considered

1. **Configurable `assessment_schemes` + Staged `exam_marks_entries` + Statement-Immutable `result_snapshots` with Reason-Audited Reissues:** Store exam patterns as institution-configurable, versioned `assessment_schemes` carrying provenance metadata (`board_code`, `source_reference`, `scheme_version`, `compliance_verified_at`); enforce a staged marks workflow (`draft` -> `submitted` -> `moderated` -> `approved` -> `published`); block student/guardian/monitor RLS access to raw `exam_marks_entries` completely; publish results into append-only `result_snapshots` protected by a statement-level `BEFORE UPDATE OR DELETE` trigger raising `42501`; and handle post-publication corrections exclusively by inserting a reason-audited reissue snapshot (`revision_no + 1`, `supersedes_snapshot_id`, non-empty `reissue_reason`).
2. **Hardcoded CBSE Weightage Constants & Mutable Report Card Tables:** Embed static board calculation assumptions in SQL/app code and allow leadership `UPDATE`s on published result rows.
3. **Expose Raw Draft Marks Directly to Guardians After Exam Date:** Leak unmoderated draft/submitted entries or teacher moderation remarks to learners before institutional approval.

## Decision & Rationale

Adopt **Option 1**:

1. **Institution-Configurable Assessment Schemes (`public.assessment_schemes`):**
   - Stores versioned `components`, `grading_scale`, and `pass_criteria` JSONB structures alongside `board_code` (`'INSTITUTION_CUSTOM'` by default), `scheme_version`, `source_reference`, and nullable `compliance_verified_at`.
   - DD-oodle never hardcodes unverified CBSE board weightages or claims automatic statutory compliance; institutions record official circular verification explicitly via `compliance_verified_at`.
2. **Exam Cycles, Schedules & Staged Marks Governance (`public.exam_cycles`, `exam_schedules`, `exam_marks_entries`):**
   - `exam_cycles` coordinates examination windows (`draft` -> `scheduled` -> `marks_open` -> `moderation` -> `approved` -> `published` -> `archived`) tied to `session_id`, optional `term_id`, and `assessment_scheme_id`.
   - `exam_marks_entries` enforces one entry per `(institution_id, exam_schedule_id, student_enrolment_id)` and partitions authority strictly in PostgreSQL RLS:
     - **Students, Guardians & Monitors:** **Zero** `SELECT`/`INSERT`/`UPDATE`/`DELETE` policies on `exam_marks_entries`.
     - **Assigned Subject Teachers:** Enter/update marks strictly for their assigned teaching group/offering while `status IN ('draft', 'submitted')` and `approved_by_person_id IS NULL`.
     - **HODs & Class Teachers:** Read and moderate (`submitted` -> `moderated`) entries scoped to their department or section while unapproved.
     - **Examination Leadership (`academics.manage` / `institution.*`):** Approve and transition marks into `approved` / `published`.
3. **Immutable Published Result Snapshots & Audited Reissues (`public.result_snapshots`):**
   - Publishing freezes student results into `public.result_snapshots` (`snapshot_payload`, `overall_percentage`, `overall_grade`, `result_status IN ('pass','compartment','fail','withheld')`).
   - A statement-level trigger `trg_result_snapshots_immutable` (`BEFORE UPDATE OR DELETE ON public.result_snapshots FOR EACH STATEMENT`, invoking `public.prevent_result_snapshot_mutation()` with `SET search_path = ''` raising SQLSTATE `42501`) immediately blocks mutation or deletion under both `authenticated` and privileged/`RESET ROLE` sessions.
   - Any post-publication correction MUST create a new revision row (`revision_no > 1`) with non-null `supersedes_snapshot_id` (composite tenant FK to prior `result_snapshots`) and non-empty `reissue_reason` (`CHECK` enforced), preserving complete historical accountability.
   - Only leadership (`academics.manage`/`institution.*`), scoped HOD/Class Teacher, the student self, and active linked guardians (`student_guardians`) can `SELECT` published `result_snapshots`; classmate Monitors are strictly denied.

## Security / Privacy / Data Implications

- **Zero Pre-Publication Marks Leakage:** Raw `exam_marks_entries` rows are structurally unreadable to learners, parents, and classroom monitors at PostgreSQL RLS level even when exam schedules are published.
- **Tamper-Proof Result Ledger:** Mirrors `ADR-0005` (`attendance_events`) statement-level `42501` immutability so zero rows or published grades can be silently altered after publication.

## Cost / Maintenance Implications

- Keeping `snapshot_payload` self-contained JSONB alongside indexed summary columns (`overall_percentage`, `overall_grade`, `result_status`, `revision_no`) prepares `P5-M04` report cards and Phase 6/7 transcript generation without expensive multi-table historical joins or schema changes to prior phases.

## Migration / Rollback Implications

- Applied forward-only in `supabase/migrations/202611280009_examinations_and_result_snapshots.sql` and `supabase/migrations/202611280010_phase5_rls_and_helpers.sql`, keeping all Phase 1–4 tables untouched.

## Consequences & Revisit Conditions

- **Consequences:** `P5-M03` / `P5-M04` Examination & Results DAL must compute snapshot totals strictly on the server from `assessment_schemes` + approved `exam_marks_entries`, and require explicit reissue reason input whenever issuing `revision_no + 1`.
- **Revisit conditions:** Revisit when Phase 7 Document & Certificate Lifecycle adds cryptographic verification hashes or signed PDF transcript attachments referencing `result_snapshots.id`.

## Links to Requirements & Implementation Milestones

- Master Blueprint: Part A §3.5, §4.1–§4.3, §6.9–§6.10, §11.4, §15 Phase 5; Part F (`REF-10`, `REF-11`).
- Related ADRs: [`ADR-0005`](ADR-0005-two-layer-attendance-ledger-and-signoff.md), [`ADR-0006`](ADR-0006-category-partitioned-digital-student-handbook.md), [`ADR-0009`](ADR-0009-versioned-weekly-timetables-and-substitutions.md).
- Milestones: `P5-M01` (Core Schema, Forced RLS & pgTAP), `P5-M03` (Assessment Schemes, Exam Cycles & Marks Moderation), `P5-M04` (Immutable Result Snapshots & Reissues).
