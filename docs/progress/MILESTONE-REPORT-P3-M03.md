# Milestone Report: P3-M03 — Student & Staff Leave Workflows, Parent Attendance Notices & Verified Daily Class / Monitor Summary

- **Date:** 2026-11-28
- **Phase:** Phase 3 — Attendance, Leave & Digital Handbook (**In Progress**)
- **Milestone:** `P3-M03`
- **Status:** **Local Verified — Pending GitHub Actions Live CI Verification**

---

## 1. Summary of Changes

1. **Pure Domain Schemas & Rules (`lib/leave/`):**
   - Added [`schemas.ts`](../../lib/leave/schemas.ts) with strict Zod schemas for student leave, staff leave, leave review (requiring trimmed `decisionNote` >= 3 chars when `decision === 'rejected'`), leave cancellation, parent attendance notices (`absence` | `late_arrival` | `early_pickup`), and notice acknowledgement.
   - Added [`rules.ts`](../../lib/leave/rules.ts) with `calculateInclusiveLeaveDays()`, `canTransitionLeaveStatus()` (locking terminal states), `canReviewLeaveRecord()` (self-approval block without institutional override), `canAcknowledgeParentNotice()`, and `summarizeDailyClassAttendance()` (`verifiedOnly: true` stripping all `draft` rows from counts & roster).
2. **Caller-RLS Server-Only DAL (`server/leave/service.ts`):**
   - Implemented [`service.ts`](../../server/leave/service.ts) with `import "server-only"`, strictly using `createSupabaseServerClient()` (zero admin/service-role client imports) and batched `fetchPersonNameMap()` lookups (zero ambiguous PostgREST `persons(...)` embeds).
   - Built `getLeaveWorkspace()`, `submitStudentLeaveApplication()`, `submitStaffLeaveApplication()`, `reviewLeaveApplication()`, `cancelLeaveApplication()`, `getParentNoticesWorkspace()`, `submitParentAttendanceNotice()`, `acknowledgeParentAttendanceNotice()`, and `getDailyClassSummary()` with `audit_events` emission on all mutations and strict zero-leak Monitor boundaries.
   - Updated [`service.ts`](../../server/attendance/service.ts) capabilities with `canAccessDailySummary`.
3. **Server Actions, Navigation & UI (`app/`, `components/`):**
   - Added Server Actions in [`actions.ts`](../../app/t/[slug]/leave/actions.ts) and compact WCAG AA routes at [`/t/[slug]/leave`](../../app/t/[slug]/leave/page.tsx), [`/t/[slug]/leave/notices`](../../app/t/[slug]/leave/notices/page.tsx), and [`/t/[slug]/attendance/summary`](../../app/t/[slug]/attendance/summary/page.tsx).
   - Added workspace `"Leave & Notices"` navigation link ([`nav-config.ts`](../../components/shell/nav-config.ts), [`AppShell.tsx`](../../components/shell/AppShell.tsx), [`navigation.ts`](../../lib/auth/navigation.ts) — omitted for Monitor-only roles), [`LeaveSubNav.tsx`](../../components/leave/LeaveSubNav.tsx), and `"Daily Summary"` tab in [`AttendanceSubNav.tsx`](../../components/attendance/AttendanceSubNav.tsx).
4. **Unit & Navigation Tests (`tests/unit/`):**
   - Added [`leave-and-summary-rules.test.ts`](../../tests/unit/leave-and-summary-rules.test.ts) (10 tests) and updated [`safe-redirect-and-nav.test.ts`](../../tests/unit/safe-redirect-and-nav.test.ts) (`88/88` Vitest tests passing across 17 files).

---

## 2. Verification Summary

- `pnpm typecheck`: **Passed** (0 errors)
- `pnpm lint`: **Passed** (0 errors, 0 warnings)
- `pnpm test`: **Passed** (17 files, **88/88** passed)
- `pnpm build` & docs hygiene checks executed cleanly prior to `origin/main` push.

---

## 3. Next Recommended Action

Proceed to **`P3-M04`** — Digital Student Handbook Assembly, Category/Visibility-Scoped Notes & Guardianship Timeline (`/t/[slug]/handbook`) once CI verifies `P3-M03` green.
