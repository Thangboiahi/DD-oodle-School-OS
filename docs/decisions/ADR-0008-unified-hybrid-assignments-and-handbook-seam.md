# ADR-0008: Unified Hybrid Assignments, Syllabus Hierarchy & Digital Handbook Phase 4 Seam

- **ID & Title:** `ADR-0008` — Unified Hybrid Assignments, Syllabus Hierarchy & Digital Handbook Phase 4 Seam
- **Status:** Accepted
- **Date:** 2026-11-28
- **Decision Owner:** Product Owner (DD-oodle)

---

## Context / Problem

Indian CBSE and multi-board schools run blended workflows: many classrooms submit notebooks, practical files, and projects offline in class while teachers increasingly assign digital worksheets, homeworks, and objective auto-scored MCQ checks online — especially for cross-section elective teaching groups (`TG-*`). Splitting offline work, online submissions, and objective quizzes into disconnected tables fragments student work tracking, complicates teacher evaluation, and creates duplicate projections inside the Digital Student Handbook.

## Options Considered

1. **Unified `public.assignments` + `public.assignment_submissions` hybrid model paired with normalized `syllabus_items -> lesson_plans -> learning_resources` hierarchy and live Handbook integration:** Single authoritative assignment entity supporting `submission_mode` (`online` | `offline` | `both`) and `evaluation_mode` (`manual` | `auto_mcq` | `rubric`), unified per-enrolment submission/evaluation tracking (`submission_channel`: `online` | `offline_recorded`), hierarchical syllabus tracking with mandatory delay reasons, and live read composition into the Phase 3 Digital Student Handbook Phase 4 seam.
2. **Separate `offline_homework_logs`, `online_assignments`, and `mcq_quizzes` tables:** Duplicate due-date, teaching-group RLS, and evaluation logic across three parallel tables.
3. **Copy assignment summaries into `handbook_entries` rows on publish:** Introduce dual-write drift whenever deadlines, marks, or evaluation status change.

## Decision & Rationale

Adopt **Option 1**:

1. **Normalized Academic Planning Hierarchy (`Session -> Term -> Subject Offering -> Syllabus Items -> Lesson Plans & Learning Resources`):**
   - Extends `public.academic_terms` with explicit lifecycle `status` (`planned` | `active` | `completed`).
   - Models self-referencing `public.syllabus_items` (`unit` -> `chapter` -> `topic`) anchored to `subject_offering_id` and optional `term_id`, requiring a non-empty `delay_reason` whenever `progress_status = 'delayed'` and capturing `carry_forward_notes` for incomplete units.
   - Binds `public.lesson_plans` to `teaching_group_id` (and optional `syllabus_item_id`) with explicit `planned` | `delivered` | `revised` | `carried_forward` states, and partitions `public.learning_resources` (`teaching_group` | `subject_offering` | `staff_only`).
2. **Unified Hybrid Assignments & Submissions (`public.assignments` + `public.assignment_submissions`):**
   - `assignments` uses `submission_mode` (`'online' | 'offline' | 'both'`), `evaluation_mode` (`'manual' | 'auto_mcq' | 'rubric'`), and structured JSONB `objective_questions` so teachers can publish homework, classwork, objective quizzes, projects, or practicals from one table.
   - `assignment_submissions` tracks every student's `submission_channel` (`'online' | 'offline_recorded'`), lifecycle `status` (`assigned` -> `submitted` | `late_submitted` | `completed_offline` -> `evaluated` | `resubmit_requested`), online text/MCQ/attachment payload, and teacher marks/remarks.
   - PostgreSQL RLS permits students to update ONLY their own non-evaluated online submission (`marks_awarded`, `teacher_remarks`, and `evaluated_*` locked `NULL` under student RLS) while empowering assigned `subject_teacher`s to mark `completed_offline` and record evaluations cleanly.
3. **Subject Teacher Independence with Class Teacher & HOD Oversight:**
   - Subject teachers independently author and evaluate planning, resources, and assignments for their active `teaching_group_id` (and subject-offering syllabus items), while Class Teachers and HODs gain read oversight across sections/departments containing those students via `app_auth.is_teaching_group_oversight(...)`.
   - Section Monitors read `published` board assignments via `app_auth.is_monitor_for_teaching_group(...)` to display daily homework/classwork on physical classroom boards while seeing **0** classmates' submissions or marks.
4. **Live Digital Student Handbook Seam (`ADR-0006` Extension):**
   - In `P4-M04`, the Digital Student Handbook route (`/t/[slug]/handbook/[studentProfileId]`) queries `assignments` and `assignment_submissions` live under caller RLS to replace the `"Assignments & Subject Work"` planned seam without storing duplicate rows in `handbook_entries`.

## Security / Privacy / Data Implications

- **Zero Cross-Group / Peer Submission Leakage:** Students and guardians never see classmates' `assignment_submissions` or marks; monitors never see any peer submission or grade.
- **Anti-Grade-Tampering RLS:** Student `INSERT`/`UPDATE` policies enforce `status IN ('submitted', 'late_submitted')`, `submission_channel = 'online'`, and strictly require `marks_awarded IS NULL AND teacher_remarks IS NULL AND evaluated_by_person_id IS NULL`.

## Cost / Maintenance Implications

- One cohesive 5-table schema (`202611280005`) plus `academic_terms.status` handles offline notebooks, digital uploads, auto-scored MCQs, syllabus delay tracking, and lesson planning with zero redundant joins.

## Migration / Rollback Implications

- Applied forward-only in `supabase/migrations/202611280005_academic_planning_and_assignments.sql` and `202611280007_phase4_rls_and_helpers.sql`, keeping `academic_terms` backward-compatible with all Phase 2/3 tests.

## Consequences & Revisit Conditions

- **Consequences:** Phase 4 DAL (`P4-M03`) must perform objective MCQ auto-scoring and offline notebook recording through caller-RLS `assignment_submissions` mutations.
- **Revisit conditions:** Revisit objective question storage only if Phase 5 Examination & Question Bank modules introduce shared reusable question banks across sessions.

## Links to Requirements & Implementation Milestones

- Master Blueprint: Part A §3.5, §4.1–§4.3, §6.7, §11.4, §15 Phase 4.
- Related ADRs: [`ADR-0003`](ADR-0003-academic-structure-and-typed-assignments.md), [`ADR-0006`](ADR-0006-category-partitioned-digital-student-handbook.md), [`ADR-0007`](ADR-0007-record-bound-contextual-communication.md).
- Milestones: `P4-M01` (Schema, Forced RLS & pgTAP), `P4-M03` (Planning & Assignments DAL/UI), `P4-M04` (Handbook Integration & Phase 4 Exit Gate).
