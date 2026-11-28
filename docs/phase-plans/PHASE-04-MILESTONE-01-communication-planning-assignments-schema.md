# Phase 4 — Milestone 01: Structured Communication, Academic Planning & Hybrid Assignments Core Schema, Forced RLS & pgTAP Suite

```text
MILESTONE ID: P4-M01
PHASE: Phase 4 — Structured communication and academic planning
TITLE: Phase 4 ADRs, Structured Communication, Academic Planning & Hybrid Assignments Core Schema, Forced RLS & pgTAP Suite
OBJECTIVE: Record accepted ADR-0007 and ADR-0008, implement the Phase 4 multi-tenant PostgreSQL schema across Academic Planning, Hybrid Assignments, Official Notices, Parent Enquiries, and Record-Bound Contextual Comments with composite tenant FKs and forced RLS (45 forced-RLS public tables across 16 migrations, upgrading existing academic_terms with lifecycle status), expand supabase/seed.sql, and verify all security boundaries with pgTAP + static SQL invariants.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.5, §4.1-§4.3, §5.1-§5.4, §6.6-§6.7, §11.4, §12.5, §15 Phase 4; Part D6; Part E.
PRECONDITIONS: Phase 3 closed Complete (P3-M05, CI Run 46105679125 / 46109385779 green with 95/95 Vitest + 131/131 pgTAP + 20/20 Playwright across 36 forced-RLS public tables).
IN SCOPE:
  - Accepted ADRs: ADR-0007 (record-bound contextual communication, scoped notices, formal parent enquiry cases, zero unlinked chat rooms) and ADR-0008 (unified hybrid assignments supporting online/offline/MCQ + normalized syllabus hierarchy + Handbook Phase 4 seam).
  - Migration 14 (202611280005_academic_planning_and_assignments.sql): extend existing forced-RLS academic_terms with status column + create 5 tables (syllabus_items, lesson_plans, learning_resources, assignments, assignment_submissions) with composite tenant FKs, triggers, and indexes.
  - Migration 15 (202611280006_communication_and_contextual_comments.sql): official_notices, notice_acknowledgements, parent_enquiries, record_comments (strict mutually exclusive parent CHECK enforcing zero unlinked comments).
  - Migration 16 (202611280007_phase4_rls_and_helpers.sql): FORCE ROW LEVEL SECURITY across all 9 newly created tables (45 total forced-RLS public tables), private app_auth oversight/contextual-visibility helpers, Subject Teacher independent TG execution vs Class Teacher/HOD oversight, student grade-column protection, and Monitor board-only / zero internal-note boundaries.
  - Synthetic seed expansion (supabase/seed.sql), 44-assertion pgTAP suite (05_phase4_communication_planning_assignments_rls.test.sql), and updated sql-migration-invariants.test.ts (45 tables).
OUT OF SCOPE:
  - Phase 4 server DAL services, Server Actions, or App Router UI for Communication, Academic Planning, Hybrid Assignments, or Handbook live integration (scheduled next in P4-M02-P4-M04).
  - Open chat rooms, direct messages, or modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md.
EXPECTED FILES / DOMAINS: docs/decisions/{ADR-0007,ADR-0008}*, supabase/migrations/202611280005..0007*, supabase/seed.sql, supabase/tests/05_phase4_communication_planning_assignments_rls.test.sql, tests/unit/sql-migration-invariants.test.ts, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Unlinked messaging or chat-clone sprawl: prevented structurally via mutually exclusive record_comments parent CHECK.
  - Staff internal notes or peer assignment submissions leaking to students/guardians/monitors: prevented in app_auth.can_read_record_comment and assignment_submissions_select/update policies.
  - Monitor access overreach: restricted strictly to published board assignments and published institution/section notices (0 drafts, 0 submissions, 0 enquiries, 0 lesson plans, 0 internal notes, 42501 on writes).
NEXT MILESTONE: P4-M02 — Official Notices, Acknowledgements, Formal Parent Enquiries & Record-Bound Comments DAL + UI.
```
