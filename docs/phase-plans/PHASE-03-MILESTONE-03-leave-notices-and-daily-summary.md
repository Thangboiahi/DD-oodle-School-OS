# Phase 3 — Milestone 03: Leave Workflows, Parent Attendance Notices & Verified Daily Class Summary

```text
MILESTONE ID: P3-M03
PHASE: Phase 3 — Attendance, leave and digital handbook
TITLE: Student & Staff Leave Workflows, Parent Attendance Notices & Verified Daily Class / Monitor Summary (Server DAL + UI)
OBJECTIVE: Build pure domain schemas/rules, caller-RLS server-only DAL, Server Actions, and compact responsive UI for Student & Staff Leave Applications (/t/[slug]/leave), Parent Attendance Notices (/t/[slug]/leave/notices), and Verified Daily Class & Monitor Board Summary (/t/[slug]/attendance/summary), recording P3-M02 CI Run 46097947497 evidence.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.5, §4.1-§4.3, §5.2, §6.4, §12.1-§12.4, §15 Phase 3; ADR-0005.
PRECONDITIONS: P3-M02 live CI Run 46097947497 (commit 7efa07a) passed all 3 jobs (78/78 Vitest, 131/131 pgTAP + clean db lint, 15/15 Playwright).
IN SCOPE:
  - Pure leave & summary domain rules (lib/leave/{schemas,rules}.ts): calculateInclusiveLeaveDays, one-way leave transitions (submitted -> approved | rejected for reviewer; submitted -> cancelled for applicant; terminal locks), self-approval prohibition without override, mandatory >=3-char rejection decisionNote, parent notice acknowledgement, and verified-only daily summary filter.
  - Caller-RLS server-only DAL (server/leave/service.ts): zero service-role client, zero ambiguous PostgREST persons(...) embeds, audited submit/review/cancel workflows for student & staff leaves, guardian-scoped parent notices + acknowledgement, and verified-only board summary with Class Teacher/HOD operational overlays.
  - Server Actions (app/t/[slug]/leave/actions.ts), workspace "Leave & Notices" nav link, LeaveSubNav, AttendanceSubNav "Daily Summary" tab, and pages (/t/[slug]/leave, /t/[slug]/leave/notices, /t/[slug]/attendance/summary).
  - Unit tests (tests/unit/leave-and-summary-rules.test.ts, updated safe-redirect-and-nav.test.ts) & docs.
OUT OF SCOPE:
  - Digital Student Handbook UI/DAL and Phase 3 live E2E exit-gate suite (scheduled in P3-M04 / P3-M05).
EXPECTED FILES / DOMAINS: lib/leave/*, server/leave/service.ts, server/attendance/service.ts, app/t/[slug]/leave/*, app/t/[slug]/attendance/summary/page.tsx, components/{leave,attendance,shell}/*, lib/auth/navigation.ts, tests/unit/*, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Self-approval prevention: staff cannot approve own leave without institutional override permission.
  - Monitor / Monitress isolation: omitted Leave & Notices nav, permission-denied state if directly visited by monitor-only users, and verified-only board summary with zero draft rows, leave reasons, or parent notices.
  - Cross-tenant ward protection: guardian submissions scoped strictly to active guardian links inside active tenant.
NEXT MILESTONE: P3-M04 — Digital Student Handbook Assembly, Category/Visibility-Scoped Notes & Guardianship Timeline (Server DAL + UI under /t/[slug]/handbook).
```
