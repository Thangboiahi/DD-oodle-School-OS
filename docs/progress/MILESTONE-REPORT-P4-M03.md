# Milestone Completion Report — `P4-M03`

- **Milestone:** `P4-M03` — Academic Planning, Syllabus Hierarchy & Progress Tracking, Lesson Plans, Subject Learning Resources & HOD/Class Teacher Oversight (Server DAL + UI)
- **Date:** `2026-11-28`
- **Status:** **Local Verified — Pending GitHub Actions Live CI Verification**
- **Plan Reference:** [`PHASE-04-MILESTONE-03-academic-planning-syllabus-lessons-resources-ui.md`](../phase-plans/PHASE-04-MILESTONE-03-academic-planning-syllabus-lessons-resources-ui.md)

## 1. Delivered Changes

- **Pure Planning Schemas & Rules ([`lib/planning/schemas.ts`](../../lib/planning/schemas.ts), [`lib/planning/rules.ts`](../../lib/planning/rules.ts)):**
  - Zod schemas for Academic Term lifecycle updates (`planned`/`active`/`completed`), Syllabus Items (`unit`/`chapter`/`topic` with mandatory `>= 5`-character `delayReason` when marked `delayed`), Lesson Plans (`planned`/`delivered`/`carried_forward`/`revised`), and Learning Resources (`link` requiring safe `http(s)` URL; `teaching_group` visibility requiring `teachingGroupId`).
  - Pure hierarchy validator (`validateSyllabusParentKind`), deterministic tree builder (`buildSyllabusTree`), progress summary calculator (`computeSyllabusProgressRollup`), role capability matrix (`resolvePlanningRoleAccess`), and one-way archival helper (`canTransitionResourceStatus`).
- **Caller-RLS Server-Only Academic Planning DAL & Actions ([`server/planning/service.ts`](../../server/planning/service.ts), [`app/t/[slug]/planning/actions.ts`](../../app/t/[slug]/planning/actions.ts)):**
  - Implemented `getSyllabusWorkspace`, `getLessonPlansWorkspace`, `getLearningResourcesWorkspace`, `getAcademicOversightWorkspace`, and all 7 mutation operations strictly using `createSupabaseServerClient()`, `resolveVerifiedTenantContext()`, batched `fetchPersonNameMap()`, metadata-only `recordAuditEvent()`, and zero admin-client bypasses.
  - Enforced strict distinction between read-only Class Teacher/HOD oversight and write authority assigned only to Leadership or scoped Subject Teachers (`writableTeachingGroupIds` / `manageableOfferingIds`).
- **Navigation & Compact Responsive WCAG AA Routes (`components/planning/PlanningSubNav.tsx`, `app/t/[slug]/planning/*`):**
  - Added `"Planning"` workspace nav item (`components/shell/{nav-config,AppShell}.tsx`, `lib/auth/navigation.ts`) and `PlanningSubNav`.
  - Built `/t/[slug]/planning` (Syllabus & Terms), `/t/[slug]/planning/lessons` (staff-internal lesson plans with `StateNotice kind="permission-denied"` for learners/guardians/monitors), `/t/[slug]/planning/resources` (offering/group scoped materials & signed private links), and `/t/[slug]/planning/oversight` (department/section progress rollups & delayed-item watchlist).
- **Unit Verification ([`tests/unit/planning-rules.test.ts`](../../tests/unit/planning-rules.test.ts), [`tests/unit/safe-redirect-and-nav.test.ts`](../../tests/unit/safe-redirect-and-nav.test.ts)):**
  - Verified hierarchy validation, deterministic tree sorting, progress rollups, URL protocol safety, delay-reason refinement, role-capability matrix, resource status transitions, and updated nav link ordering (`"planning"` after `"communication"`).

## 2. Verification Summary

- Verified locally with `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and docs hygiene checks prior to pushing to `origin/main`; live GitHub Actions CI run pending.

## 3. Recommended Next Action

Proceed to **`P4-M04`** — Unified Hybrid Assignments, MCQ/File Submissions, Grading & Digital Handbook Phase 4 Seam Wiring once CI verifies `P4-M03` green.
