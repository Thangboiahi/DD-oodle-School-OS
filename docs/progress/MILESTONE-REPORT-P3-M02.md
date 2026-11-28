# Milestone Report: P3-M02 — Student & Staff Attendance, Verification, Sign-Off, Audited Correction Ledger & Idempotent Offline-Queue Sync

- **Date:** 2026-11-28
- **Phase:** Phase 3 — Attendance, Leave & Digital Handbook (**In Progress**)
- **Milestone:** `P3-M02`
- **Status:** **Local Verified — Pending GitHub Actions Live CI Verification**

---

## 1. Summary of Changes

1. **Pure Domain Schemas & Rules (`lib/attendance/`):**
   - Added [`schemas.ts`](../../lib/attendance/schemas.ts) with strict Zod v4 schemas covering daily student roll, verification & sign-off, post-sign-off student/staff corrections (trimmed `correctionReason` >= 5 chars), teaching-group period roll, staff daily attendance, configurable `attendance_policies` (strictly rejecting `warning < minimum` and unexpected `biometricEnabled`), and `offlineSyncBatchSchema` (1–100 events).
   - Added [`rules.ts`](../../lib/attendance/rules.ts) with one-way verification transitions (`canTransitionStudentVerification`, `canTransitionStaffVerification`), `requiresCorrectionReason()`, `mapStaffStatusToEventStatus()` (`on_leave` -> `excused_leave`), policy-driven `computeAttendanceShortage()`, deterministic `buildAttendanceIdempotencyKey()`, and `normalizeAttendanceTimestamp()`.
2. **Caller-RLS Server-Only Attendance DAL (`server/attendance/service.ts`):**
   - Implemented [`service.ts`](../../server/attendance/service.ts) with `import "server-only"`, strictly using `createSupabaseServerClient()` (zero admin/service-role imports) and batched `fetchPersonNameMap()` lookups (zero ambiguous PostgREST `persons(...)` embeds).
   - Built daily roll marking/verification/sign-off/audited correction workflows, teaching-group period roll, staff daily check-in/out/sign-off/correction, chronological ledger & policy management (keeping `biometric_enabled = false`), and `syncOfflineAttendanceQueue()` deduplicating cleanly on `(institution_id, idempotency_key)` without overwriting signed-off rows.
3. **Offline Sync Endpoint, Server Actions & Compact Responsive UI (`app/`, `components/`):**
   - Added `POST` [`route.ts`](../../app/api/t/[slug]/attendance/sync/route.ts) (`Cache-Control: no-store`) and [`actions.ts`](../../app/t/[slug]/attendance/actions.ts).
   - Added `"attendance"` workspace navigation ([`navigation.ts`](../../lib/auth/navigation.ts), [`nav-config.ts`](../../components/shell/nav-config.ts), [`AppShell.tsx`](../../components/shell/AppShell.tsx)) plus [`AttendanceSubNav.tsx`](../../components/attendance/AttendanceSubNav.tsx) and [`offline-queue-panel.tsx`](../../components/attendance/offline-queue-panel.tsx).
   - Added `/t/[slug]/attendance` ([`page.tsx`](../../app/t/[slug]/attendance/page.tsx), [`periods/page.tsx`](../../app/t/[slug]/attendance/periods/page.tsx), [`staff/page.tsx`](../../app/t/[slug]/attendance/staff/page.tsx), [`ledger/page.tsx`](../../app/t/[slug]/attendance/ledger/page.tsx)), enforcing the strict read-only verified Monitor view and server-side access denials.
4. **Unit & Navigation Verification (`tests/unit/`):**
   - Added [`attendance-rules.test.ts`](../../tests/unit/attendance-rules.test.ts) (12 tests) and updated [`safe-redirect-and-nav.test.ts`](../../tests/unit/safe-redirect-and-nav.test.ts) (`78/78` total unit tests across 16 files).

---

## 2. Verification Summary

- `pnpm typecheck`: **Passed** (0 errors)
- `pnpm lint`: **Passed** (0 errors, 0 warnings)
- `pnpm test`: **Passed** (16 files, **78/78** passed)
- `pnpm build`: Production build verification executed alongside final commit checks.

---

## 3. Next Recommended Action

Proceed to **`P3-M03`** — Student & Staff Leave Applications and Parent Attendance Notices (Server DAL + UI under `/t/[slug]/leave`) once CI verifies `P3-M02` green.
