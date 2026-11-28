# Milestone Completion Report — `P4-M04`

- **Milestone:** `P4-M04` — Unified Hybrid Assignments, MCQ Quizzes, Offline Completion Tracking, Student/Parent Workspace, Monitor Board & Live Digital Student Handbook Phase 4 Wiring (Server DAL + UI)
- **Date:** `2026-11-28`
- **Status:** **Local Verified — Pending GitHub Actions Live CI Verification**
- **Plan Reference:** [`PHASE-04-MILESTONE-04-hybrid-assignments-and-handbook-wiring.md`](../phase-plans/PHASE-04-MILESTONE-04-hybrid-assignments-and-handbook-wiring.md)

## 1. Delivered Changes

- **Pure Assignments Schemas & Rules ([`lib/assignments/schemas.ts`](../../lib/assignments/schemas.ts), [`lib/assignments/rules.ts`](../../lib/assignments/rules.ts)):**
  - Implemented Zod validation for `objectiveQuestionSchema`, `createAssignmentSchema` (enforcing `>= 1` unique objective question when `evaluationMode === "auto_mcq"`), `transitionAssignmentStatusSchema`, `submitStudentAssignmentSchema` (rejecting traversal/scheme `attachmentStoragePath`), `recordOfflineCompletionSchema`, and `evaluateSubmissionSchema`.
  - Implemented deterministic `scoreObjectiveQuiz()`, `determineSubmissionStatus()`, `canTransitionAssignmentStatus()`, `canStudentSubmitAssignment()`, `sanitizeObjectiveQuestionsForLearner()` (stripping `correctOptionIndex` before evaluation), `buildMonitorBoardAssignmentView()`, and `computeAssignmentCompletionMetrics()`.
- **Caller-RLS Assignments DAL, Actions & UI ([`server/assignments/service.ts`](../../server/assignments/service.ts), [`app/t/[slug]/assignments/actions.ts`](../../app/t/[slug]/assignments/actions.ts), `app/t/[slug]/assignments/*`):**
  - Built caller-RLS `getAssignmentsWorkspace`, `getAssignmentDetail`, `createAssignment`, `transitionAssignmentStatus`, `submitStudentAssignment` (preserving strict PostgreSQL student grade-column RLS locks while resetting grade fields on resubmission), `recordOfflineAssignmentCompletion`, and `evaluateAssignmentSubmission` (with server-computed `auto_mcq` confirmation).
  - Added `"Assignments"` workspace navigation (`components/shell/{nav-config,AppShell}.tsx`, `lib/auth/navigation.ts`), `OfflineDraftBox.tsx` (tenant+assignment scoped `localStorage` draft helper cleared on submit), Monitor read-only published assignment board, and contextual `record_comments` (`parent_kind = 'assignment'`) with staff-only internal notes.
- **Live Digital Student Handbook Phase 4 Wiring ([`server/handbook/service.ts`](../../server/handbook/service.ts), [`lib/handbook/rules.ts`](../../lib/handbook/rules.ts), [`app/t/[slug]/handbook/[studentProfileId]/page.tsx`](../../app/t/[slug]/handbook/[studentProfileId]/page.tsx)):**
  - Assembled live `liveAssignmentsSummary` directly from `assignments` and `assignment_submissions` under caller RLS (zero queries run for denied peers) and promoted Phase 4 out of upcoming seams, leaving Phase 6 (`Fee Receipts & Ledger`) as the remaining planned seam.
- **Unit Verification ([`tests/unit/assignments-rules.test.ts`](../../tests/unit/assignments-rules.test.ts), [`tests/unit/handbook-rules.test.ts`](../../tests/unit/handbook-rules.test.ts), [`tests/unit/safe-redirect-and-nav.test.ts`](../../tests/unit/safe-redirect-and-nav.test.ts)):**
  - Verified MCQ scoring, deadline checks, one-way transitions, learner submission gates, answer-key stripping, Monitor board filtering, completion metrics, Phase 6 remaining Handbook seam, and navigation link ordering.

## 2. Verification Summary

- Verified locally with `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and docs hygiene checks prior to pushing to `origin/main`; live GitHub Actions CI run pending.

## 3. Recommended Next Action

Proceed to **`P4-M05`** — Phase 4 Exit Gate Live E2E, Cross-Role Privacy & A11y Verification, and Phase 4 Closure once CI verifies `P4-M04` green.
