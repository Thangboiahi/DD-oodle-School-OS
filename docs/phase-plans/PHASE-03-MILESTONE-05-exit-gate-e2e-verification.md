# Phase 3 — Milestone 05: Exit Gate Live School-Day Reconstruction, Offline Replay, Privacy Boundaries, Responsive/WCAG AA Audit & Phase 3 Closure

```text
MILESTONE ID: P3-M05
PHASE: Phase 3 — Attendance, Leave & Digital Handbook
TITLE: Phase 3 Exit Gate: Live Full School-Day E2E Reconstruction, Offline Queue Replay, Role Privacy Boundaries, Responsive/WCAG AA Audit & Phase 3 Closure
OBJECTIVE: Verify the complete Phase 3 Exit Gate live against Supabase Auth + PostgREST + Next.js in GitHub Actions CI, fix any genuine access-boundary or UI defect surfaced without weakening security or RLS, and formally mark Phase 3 Complete in docs/ROADMAP.md after all 3 CI jobs pass green.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.5, §4.1-§4.3, §5.2, §6.4-§6.5, §10.2-§10.3, §11.4-§11.6, §12.1-§12.5, §15 Phase 3 exit gate & Phase 4 overview; Part B10-B13; Part D; Part E; ADR-0005; ADR-0006.
PRECONDITIONS: P3-M01 through P3-M04 live-verified on main (through bff9076 / CI Run 46101572764) with 36 forced-RLS public tables across 13 SQL migrations, Attendance & Offline Sync, Leave & Parent Notices, Daily Class Summary, and Digital Student Handbook operational.
IN SCOPE:
  - Genuine access-boundary defect fix in server/leave/service.ts: ensure monitor.11a.sunrise@example.test (who holds both student ownStudentProfileId and section monitor XI-A) receives isMonitorRestricted = true and renders strict StateNotice permission-denied screens on /t/[slug]/leave and /t/[slug]/leave/notices instead of an empty student self-view.
  - Live Phase 3 Exit-Gate E2E suite (tests/e2e/phase3-school-day-and-handbook.spec.ts) with E2E_REQUIRE_SUPABASE=true fail-fast guard covering 5 scenarios:
    1. Full school-day execution & ledger reconstruction: Class Teacher XI-A marks and verifies 2026-11-28 daily roll -> Principal signs off, silent edits lock, submits audited post-sign-off correction with mandatory reason -> records and signs off EMP-SR-001 staff attendance -> Event Ledger reconstructs day_roll, correction (reason visible), and staff events with biometric disabled by default.
    2. Idempotent offline-queue sync replay & API authorization: POST /api/t/sunrise-cbse/attendance/sync rejects unauthenticated callers (401), accepts first offline_queue payload (200, Cache-Control: no-store, accepted >= 1), deduplicates replay (200, accepted === 0, deduplicated >= 1), and rejects cross-tenant Sunrise staff on /t/valley-cbse (403) and unauthorized monitor role (403).
    3. Leave workflows, guardian parent notice & Monitor daily summary: dual.member in valley-cbse sees ONLY Kabir Rao and submits parent notice; Principal in sunrise-cbse approves seeded Aarav Verma leave and verifies summary operational panels; monitor.11a.sunrise views verified XI-A summary only (zero Rohan Sen / XI-B draft rows, zero edit buttons, zero leave/notice panels) and receives strict permission-denied states on /attendance/staff, /attendance/ledger, /leave, and /leave/notices.
    4. Digital Student Handbook category/visibility privacy & guardian ack: Principal sees all 3 seeded categories + live attendance/leave summaries + Phase 4/6 seams; Class Teacher XI-A sees academic_observation + student_support without leadership_only disciplinary records or leadership_only option; dual.member in Sunrise sees ONLY TG students (Aarav, Rohan), sees ONLY academic_observation on Aarav, and authors a TG-XI-APPMATH-1 entry; Principal Valley creates a student_and_guardian entry on Kabir Rao and dual.member in Valley acknowledges it as guardian; monitor.11a sees ONLY own Diya Nair handbook and receives strict access denial on Aarav Verma's detail route.
    5. 4-viewport (1280x800, 768x1024, 390x844, 844x390) horizontal overflow audit and WCAG 2.0/2.1 AA axe-core scan across all 9 Phase 3 routes.
  - Formal Phase 3 Closure across docs/ROADMAP.md, docs/PROJECT_STATUS.md, docs/testing/TEST_STRATEGY.md, docs/progress/MILESTONE-REPORT-P3-M04.md, docs/progress/MILESTONE-REPORT-P3-M05.md, docs/README.md, CHANGELOG.md, and README.md after Stage A CI passes all 3 jobs green.
OUT OF SCOPE:
  - Phase 4 Structured Communication & Academic Planning schema or UI implementation (awaits Product Owner kick-off).
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or weakening any RLS policy, pgTAP check, or Playwright security/a11y assertion.
EXPECTED FILES / DOMAINS: server/leave/service.ts, tests/e2e/phase3-school-day-and-handbook.spec.ts, docs/phase-plans/PHASE-03-MILESTONE-05-exit-gate-e2e-verification.md, docs/progress/MILESTONE-REPORT-P3-M04.md, docs/progress/MILESTONE-REPORT-P3-M05.md, docs/ROADMAP.md, docs/PROJECT_STATUS.md, docs/testing/TEST_STRATEGY.md, docs/README.md, CHANGELOG.md, README.md.
SECURITY / PRIVACY / DATA RISKS:
  - Student+Monitor hybrid account bypassing Monitor-restricted permission-denied guards on /leave and /leave/notices via ownStudentProfileId: resolved in server/leave/service.ts without loosening RLS.
  - Leakage of sensitive handbook categories (disciplinary, student_support) or draft attendance rolls to unauthorized roles or cross-tenant callers: live-verified blocked at both PostgreSQL RLS and Next.js SSR/UI layers.
CANDIDATE NEXT MILESTONE: P4-M01 — Phase 4 Structured Communication, Classwork/Homework Assignments & Subject Progress Updates (awaiting Product Owner kick-off).
```
