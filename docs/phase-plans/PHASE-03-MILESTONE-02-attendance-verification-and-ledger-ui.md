# Phase 3 — Milestone 02: Student & Staff Attendance, Verification, Sign-Off, Audited Correction Ledger & Offline-Queue Sync

```text
MILESTONE ID: P3-M02
PHASE: Phase 3 — Attendance, leave and digital handbook
TITLE: Student & Staff Attendance, Verification, Sign-Off, Audited Correction Ledger & Idempotent Offline-Queue Sync (Server DAL + UI)
OBJECTIVE: Build the server-only Attendance DAL, Zod schemas, state-machine/shortage helpers, idempotent offline-queue sync endpoint, and compact responsive routes under /t/[slug]/attendance for student daily roll, optional period roll, staff attendance, class-teacher verification, authorised sign-off, and audited post-sign-off corrections—strictly respecting Phase 3 RLS and zero admin-client bypass.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.5, §6.4, §10.3, §11.4, §11.6, §12.1-§12.5, §15 Phase 3; ADR-0005.
PRECONDITIONS: P3-M01 live CI Run 46095870562 (commit 95bbda0) passed all 3 jobs (66/66 Vitest, 131/131 pgTAP across 4 suites + clean db lint, 15/15 Playwright).
IN SCOPE:
  - Pure attendance domain schemas & helpers (lib/attendance/{schemas,rules}.ts): one-way student/staff verification state machines, requiresCorrectionReason(), mapStaffStatusToEventStatus(), configurable shortage math against attendance_policies, deterministic idempotency keys, strict Zod validation rejecting biometric_enabled injection and short correction reasons.
  - Caller-RLS server-only Attendance DAL (server/attendance/service.ts): zero service-role client, zero ambiguous PostgREST persons(...) embeds, daily/period/staff attendance workflows, verification/sign-off, audited post-sign-off corrections with append-only correction events + audit_events, policy management keeping biometric_enabled=false, and idempotent syncOfflineAttendanceQueue().
  - Authenticated POST /api/t/[slug]/attendance/sync endpoint (Cache-Control: no-store) and Server Actions (app/t/[slug]/attendance/actions.ts).
  - Compact WCAG AA App Router UI under /t/[slug]/attendance ({page,periods/page,staff/page,ledger/page}.tsx), AttendanceSubNav, OfflineQueuePanel, and workspace nav integration (components/shell/{nav-config,AppShell}.tsx, lib/auth/navigation.ts).
  - Unit verification (tests/unit/attendance-rules.test.ts, updated safe-redirect-and-nav.test.ts).
OUT OF SCOPE:
  - Leave applications and parent attendance notices UI/DAL (scheduled in P3-M03).
  - Digital Student Handbook UI/DAL and Phase 3 live E2E exit-gate tests (scheduled in P3-M04 / P3-M05).
EXPECTED FILES / DOMAINS: lib/attendance/*, server/attendance/service.ts, app/api/t/[slug]/attendance/sync/route.ts, app/t/[slug]/attendance/*, components/attendance/*, components/shell/*, lib/auth/navigation.ts, tests/unit/*, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Monitor / Monitress read-only boundary: strictly restricted to verified/signed-off daily rows, zero draft rows, zero edit controls, zero offline queue, zero staff/policy tabs.
  - Signed-off immutability: direct overwrites blocked; post-sign-off edits require >=5-char reason, append correction attendance_events, and emit audit_events.
  - Offline sync safety: localStorage stores only pending queue entries per tenant (no directory caching); replay deduplicates cleanly on (institution_id, idempotency_key).
NEXT MILESTONE: P3-M03 — Student & Staff Leave Applications and Parent Attendance Notices (Server DAL + UI under /t/[slug]/leave).
```
