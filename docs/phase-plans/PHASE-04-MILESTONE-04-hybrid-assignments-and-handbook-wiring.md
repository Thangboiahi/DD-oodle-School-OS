# Phase 4 — Milestone 04: Unified Hybrid Assignments, MCQ Quizzes, Offline Completion, Monitor Board & Live Handbook Phase 4 Wiring

```text
MILESTONE ID: P4-M04
PHASE: Phase 4 — Structured communication and academic planning
TITLE: Unified Hybrid Assignments, MCQ Quizzes, Offline Completion Tracking, Student/Parent Workspace, Monitor Board & Live Digital Student Handbook Phase 4 Wiring — Server DAL + UI
OBJECTIVE: Build the pure assignment schemas/rules, caller-RLS server-only Assignments DAL, Server Actions, controlled OfflineDraftBox, and compact WCAG AA routes under /t/[slug]/assignments* while wiring live Phase 4 assignment/submission summaries directly into Phase 3's Digital Student Handbook.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.5, §5.3, §6.5, §6.7, §12.1-§12.5, §15 Phase 4; ADR-0006, ADR-0008.
PRECONDITIONS: P4-M03 live-verified green on main (314875f, CI Run 46118712061 with 108/108 Vitest, 178/178 pgTAP + clean db lint, and 20/20 Playwright across 45 forced-RLS public tables).
IN SCOPE:
  - Pure schemas & rules (lib/assignments/{schemas,rules}.ts): objectiveQuestionSchema, createAssignmentSchema (auto_mcq >= 1 question refinement), transitionAssignmentStatusSchema, submitStudentAssignmentSchema (traversal-safe attachmentStoragePath), recordOfflineCompletionSchema, evaluateSubmissionSchema, deterministic scoreObjectiveQuiz(), determineSubmissionStatus(), canTransitionAssignmentStatus(), canStudentSubmitAssignment(), sanitizeObjectiveQuestionsForLearner(), buildMonitorBoardAssignmentView(), and computeAssignmentCompletionMetrics().
  - Caller-RLS server-only DAL (server/assignments/service.ts with import "server-only"): zero admin client imports, batched fetchPersonNameMap(), getAssignmentsWorkspace, getAssignmentDetail, createAssignment, transitionAssignmentStatus, submitStudentAssignment (strictly preserving PostgreSQL student grade-column RLS locks), recordOfflineAssignmentCompletion, and evaluateAssignmentSubmission (with server-computed auto_mcq score confirmation).
  - Live Handbook Phase 4 wiring (server/handbook/service.ts, lib/handbook/rules.ts, app/t/[slug]/handbook/[studentProfileId]/page.tsx): assemble liveAssignmentsSummary under caller RLS (preserving strict Monitor peer denial) and leave Phase 6 Fee Receipts as the sole planned seam.
  - Navigation, OfflineDraftBox, Server Actions & routes: Assignments workspace nav item, OfflineDraftBox (dd-oodle:assignment-draft:<slug>:<assignmentId>), /t/[slug]/assignments, and /t/[slug]/assignments/[assignmentId] with contextual record_comments.
  - Unit tests in tests/unit/assignments-rules.test.ts and updates to handbook-rules.test.ts and safe-redirect-and-nav.test.ts.
OUT OF SCOPE:
  - Live Phase 4 Playwright exit-gate E2E suite and Phase 4 closure (scheduled in P4-M05).
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or weakening PostgreSQL RLS / pgTAP checks.
EXPECTED FILES / DOMAINS: lib/assignments/*, server/assignments/service.ts, server/handbook/service.ts, lib/handbook/rules.ts, app/t/[slug]/handbook/[studentProfileId]/page.tsx, app/t/[slug]/assignments/*, components/assignments/OfflineDraftBox.tsx, components/shell/{nav-config,AppShell}.tsx, lib/auth/navigation.ts, tests/unit/{assignments-rules,handbook-rules,safe-redirect-and-nav}.test.ts, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Student tampering with marks or remarks: blocked by PostgreSQL assignment_submissions student grade-column RLS and explicit NULL resets on resubmission.
  - MCQ correctOptionIndex leaking to learners or monitors before evaluation: stripped by sanitizeObjectiveQuestionsForLearner({ revealAnswerKey: false }) in RSC DTOs.
  - Monitor seeing draft assignments, peer submissions, or classmate Handbook assignments: blocked by buildMonitorBoardAssignmentView() and Handbook early peer denial.
NEXT MILESTONE: P4-M05 — Phase 4 Exit Gate Live E2E, Cross-Role & Accessibility Verification, and Phase 4 Closure.
```
