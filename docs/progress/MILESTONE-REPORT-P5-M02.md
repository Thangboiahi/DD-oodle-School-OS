# Milestone Completion Report — `P5-M02`

- **Milestone:** `P5-M02` — Weekly Timetables, Venue/Teacher Conflict Prevention, Daily Substitutions & Academic Calendar (Server DAL + UI)
- **Date:** `2026-11-28`
- **Phase:** Phase 5 — Timetable, Examinations & Results (**In Progress**)
- **Status:** **Local Verified — Pending GitHub Actions Live CI Verification**
- **Plan Reference:** [`PHASE-05-MILESTONE-02-weekly-timetables-substitutions-and-calendar-ui.md`](../phase-plans/PHASE-05-MILESTONE-02-weekly-timetables-substitutions-and-calendar-ui.md)

---

## 1. Delivered Changes

- **Pure Schemas & Domain Rules ([`schemas.ts`](../../lib/timetable/schemas.ts), [`rules.ts`](../../lib/timetable/rules.ts)):**
  - Implemented Zod input schemas with ISO date/24h time validation and strict refinements (`endTime > startTime`, `effectiveTo >= effectiveFrom`, slot `teachingGroupId || sectionId`, and calendar `scopeType` target integrity).
  - Implemented pure rules: `detectTimetableSlotConflicts` (teacher, venue, teaching group, and instructional/activity section overlaps), `computeTeacherWorkloadSummary`, `filterAvailableSubstituteStaff`, `canTransitionTimetableStatus` (`draft -> published | archived`, `published -> archived`), `canTransitionCalendarEventStatus`, and bounded `buildOfflineTimetableSnapshot` (`status === 'published' && isOfflineCacheable === true` only).
- **Caller-RLS Server-Only Timetable & Calendar DAL ([`service.ts`](../../server/timetable/service.ts)):**
  - Enforced `import "server-only"`, caller's RLS-enforced `createSupabaseServerClient()`, zero admin client usage, batched `fetchPersonNameMap()`, zero ambiguous PostgREST `persons(...)` embeds, PostgreSQL `42501`/`23505`/`23503` friendly error mapping, non-mutating date-scoped substitution assignments verified against weekday and teacher availability, and metadata-only `audit_events`.
  - Strict Monitor/Student/Guardian read-only isolation (`isReadOnlyBoard = true`): zero draft timetables, zero substitution rows, zero workload tables, and zero write forms.
- **Server Actions, Controlled Offline Cache, Nav & Responsive Routes:**
  - Created [`actions.ts`](../../app/t/[slug]/timetable/actions.ts) covering venues, periods, timetables, status transitions, slots, substitutions, and calendar events.
  - Created [`OfflineTimetableCachePanel.tsx`](../../components/timetable/OfflineTimetableCachePanel.tsx) persisting bounded published snapshots under `dd-oodle:offline-timetable:${slug}` with clear/sync controls.
  - Added `Timetable` (`/t/[slug]/timetable`) and `Calendar` (`/t/[slug]/calendar`) to [`nav-config.ts`](../../components/shell/nav-config.ts), [`AppShell.tsx`](../../components/shell/AppShell.tsx), and [`navigation.ts`](../../lib/auth/navigation.ts).
  - Built compact WCAG AA responsive routes at [`app/t/[slug]/timetable/page.tsx`](../../app/t/[slug]/timetable/page.tsx) and [`app/t/[slug]/calendar/page.tsx`](../../app/t/[slug]/calendar/page.tsx).
- **Unit Tests:** Added [`timetable-rules.test.ts`](../../tests/unit/timetable-rules.test.ts) and updated [`safe-redirect-and-nav.test.ts`](../../tests/unit/safe-redirect-and-nav.test.ts).

---

## 2. Verification Summary

- Local `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and repository hygiene checks passed prior to `origin/main` push; live GitHub Actions CI verification pending.

---

## 3. Recommended Next Action

Proceed to **`P5-M03`** — Assessment Schemes, Exam Cycles/Schedules & Staged Marks Entry/Moderation Server DAL + UI once CI verifies `P5-M02` green.
