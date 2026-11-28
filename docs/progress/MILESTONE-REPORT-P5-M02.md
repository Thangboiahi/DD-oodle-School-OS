# Milestone Completion Report — `P5-M02`

- **Milestone:** `P5-M02` — Weekly Timetables, Venue/Teacher Conflict Prevention, Daily Substitutions & Academic Calendar (Server DAL + UI)
- **Date:** `2026-11-28`
- **Phase:** Phase 5 — Timetable, Examinations & Results (**In Progress**)
- **Status:** **Complete — Live GitHub Actions CI Verified**
- **Plan Reference:** [`PHASE-05-MILESTONE-02-weekly-timetables-substitutions-and-calendar-ui.md`](../phase-plans/PHASE-05-MILESTONE-02-weekly-timetables-substitutions-and-calendar-ui.md)
- **Live CI Run:** [`46131036818`](https://github.com/Thangboiahi/DD-oodle-School-OS/actions/runs/46131036818) (`aacd72b`)

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

- **Local Verification:** `pnpm typecheck`, `pnpm lint`, `pnpm test` (`22` files / `124/124` Vitest), `pnpm build`, and repository hygiene checks passed.
- **Live GitHub Actions CI Verification ([Run `46131036818`](https://github.com/Thangboiahi/DD-oodle-School-OS/actions/runs/46131036818), commit `aacd72b`):**
  - `App Quality & Hygiene` (`140935999808`): **124/124** Vitest unit/invariant assertions across 22 files PASS, `typecheck` + `lint` + `build` + docs links PASS.
  - `Supabase RLS & pgTAP Verification` (`140935999816`): `supabase db reset`, **228/228** pgTAP assertions across 6 suites PASS (`Files=6, Tests=228`), and `supabase db lint` (`No schema errors found`) PASS.
  - `Live Multi-Tenant Auth & A11y E2E` (`140935999555`): **25/25** Playwright E2E tests across 5 specs (`1.2m`) PASS.

---

## 3. Recommended Next Action

Proceed to **`P5-M03`** — Assessment Schemes, Exam Cycles/Schedules & Staged Marks Entry/Moderation Server DAL + UI.
