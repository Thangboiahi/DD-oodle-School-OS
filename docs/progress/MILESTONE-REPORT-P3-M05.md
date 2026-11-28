# Milestone Report: P3-M05 — Phase 3 Exit Gate & Phase 3 Closure

- **Date:** 2026-11-28
- **Phase:** Phase 3 — Attendance, Leave & Digital Handbook (**Complete**)
- **Milestone:** `P3-M05`
- **Status:** **Complete**

---

## 1. Summary of Changes & Live Defect Resolution

1. **Monitor Leave & Parent Notices Access Guard Fix (`efccad9`):**
   - Tightened `isMonitorRestricted` inside `getLeaveWorkspace()` and `getParentNoticesWorkspace()` in [`server/leave/service.ts`](../../server/leave/service.ts) by removing `!scope.ownStudentProfileId` from the restriction bypass check. Accounts holding both student and monitor roles (`monitor.11a.sunrise@example.test` / `Diya Nair`) without leave submission, review, or `people.read` capabilities now deterministically receive explicit `StateNotice kind="permission-denied"` boundaries (`"Leave workflows restricted"` and `"Parent attendance notices restricted"`) on `/t/[slug]/leave` and `/t/[slug]/leave/notices`.
2. **Live Phase 3 Exit-Gate E2E Suite (`efccad9`):**
   - Added [`phase3-school-day-and-handbook.spec.ts`](../../tests/e2e/phase3-school-day-and-handbook.spec.ts) enforcing `E2E_REQUIRE_SUPABASE === "true"` fail-fast CI execution across 5 live end-to-end scenarios:
     1. **Full School-Day Roll & Ledger Reconstruction:** `classteacher.11a.sunrise@example.test` saves and verifies the `2026-11-28` `XI-A` daily roll -> `principal.sunrise@example.test` signs off (locking silent edits), submits a mandatory-reason post-sign-off correction (`"Late arrival verified by front desk"`), records & signs off `EMP-SR-001` staff attendance -> Event Ledger reconstructs `day_roll`, `correction` (exact reason), and `staff` events with biometric capture disabled by default.
     2. **Idempotent Offline-Queue Sync Replay & API Denial:** `POST /api/t/sunrise-cbse/attendance/sync` rejects unauthenticated callers (`401`), accepts first offline-queue batch (`200`, `Cache-Control: no-store`, `accepted >= 1`), deduplicates identical replay (`200`, `accepted === 0`, `deduplicated >= 1`), and returns `403` for cross-tenant Sunrise staff targeting `/t/valley-cbse` and unauthorized Monitor callers.
     3. **Leave Workflows, Guardian Parent Notices & Verified Monitor Summary:** `dual.member@example.test` in `valley-cbse` sees only linked ward `Kabir Rao` and submits a parent notice; `principal.sunrise@example.test` reviews/approves seeded `Aarav Verma` leave and verifies summary counts/operational panels; `monitor.11a.sunrise@example.test` sees strictly verified `XI-A` counts/roster (zero `XI-B` draft rows, zero edit buttons, zero leave/notice panels) and explicit permission-denied states on `/attendance/staff`, `/attendance/ledger`, `/leave`, and `/leave/notices`.
     4. **Digital Student Handbook Privacy & Guardian Acknowledgement:** Principal views all 3 seeded categories, live attendance/leave summaries, and Phase 4/6 extension seams; Class Teacher XI-A views `academic_observation` + `student_support` without `leadership_only` disciplinary records or `leadership_only` visibility option; `dual.member` in Sunrise sees only TG students (`Aarav Verma`, `Rohan Sen`) and `academic_observation` while authoring a `TG-XI-APPMATH-1` note; `principal.valley` creates and `dual.member` (as linked guardian in Valley) acknowledges a `Kabir Rao` handbook entry (`Guardian acknowledged` timestamp persisted); `monitor.11a` accesses self handbook (`Diya Nair`) only and receives explicit denial on `Aarav Verma`'s handbook route.
     5. **4-Viewport Responsive & WCAG 2.0/2.1 AA Audits:** Zero unintended horizontal overflow across desktop (`1280x800`), tablet (`768x1024`), mobile portrait (`390x844`), and mobile landscape (`844x390`), plus zero critical/serious `AxeBuilder` WCAG 2.0/2.1 AA violations across all 9 Phase 3 routes (`/attendance`, `/attendance/summary`, `/attendance/periods`, `/attendance/staff`, `/attendance/ledger`, `/leave`, `/leave/notices`, `/handbook`, and `/handbook/[studentProfileId]`).
3. **Formal Phase 3 Closure:**
   - Recorded `P3-M04` CI Run `46101572764` (`bff9076`) and Stage A `P3-M05` CI Run `46105679125` (`efccad9`), marked **Phase 3** `Complete` in [`ROADMAP.md`](../ROADMAP.md), and synced [`PROJECT_STATUS.md`](../PROJECT_STATUS.md), [`TEST_STRATEGY.md`](../testing/TEST_STRATEGY.md), [`README.md`](../README.md), [`CHANGELOG.md`](../../CHANGELOG.md), and root [`README.md`](../../README.md).

---

## 2. Live Verification & Phase 3 Exit Gate Evidence

- **Stage A Verified Live GitHub Actions CI Run [`46105679125`](https://github.com/Thangboiahi/DD-oodle-School-OS/actions/runs/46105679125)** (commit `efccad9` on `main`):
  1. **Job 1 — `App Quality & Hygiene` (`140857764989`):** **PASS** (`47s` — `pnpm typecheck`, `pnpm lint`, **18 files / 95/95** Vitest unit & SQL static invariant checks across 36 forced-RLS public tables, `pnpm build`, docs hygiene).
  2. **Job 2 — `Supabase RLS & pgTAP Verification` (`140857764772`):** **PASS** (`2m25s` — `supabase start`, `supabase db reset`, **131/131** pgTAP assertions (`Files=4, Tests=131, Result: PASS`: `01_multi_tenant_rls` 26/26, `02_phase2_registry_and_academics_rls` 40/40, `03_import_staging_rls` 22/22, `04_phase3_attendance_leave_handbook_rls` 43/43), plus `supabase db lint` -> `No schema errors found`).
  3. **Job 3 — `Live Multi-Tenant Auth & A11y E2E` (`140857764958`):** **PASS** (`3m50s` — **20/20** Playwright checks (`20 passed (44.4s)`): 10 Phase 1 + 5 Phase 2 + 5 Phase 3 full school-day reconstruction, offline sync replay, leave/notice/monitor summary, category/visibility handbook privacy & guardian ack, and 4-viewport + WCAG 2.0/2.1 AA axe-core checks).

---

## 3. Formal Phase 3 Exit Gate Sign-Off

All Phase 3 blueprint exit criteria (`DD-oodle_MASTER_PROJECT_BLUEPRINT.md` Part A §15) are live-verified green:
- A complete normal school day can be executed (student daily & period roll marking, Class Teacher verification, Principal sign-off, immutable post-sign-off lock & audited reason-backed correction, staff daily check-in/out & sign-off, leave submission/approval, guardian notices, and Digital Student Handbook entries/acknowledgement) and reconstructed chronologically from `attendance_events` + `audit_events` with zero silent overwrites and biometric capture disabled by default.
- Offline-queue sync (`POST /api/t/[slug]/attendance/sync`) handles duplicate retries idempotently (`idempotency_key`) while strictly enforcing `401`/`403` boundaries across tenants and roles.
- Role- and relationship-partitioned privacy boundaries (`monitor.11a` verified-only board view & classmate handbook denial, `dual.member` TG-only vs Valley ward isolation, Class Teacher `leadership_only` exclusion) hold at PostgreSQL RLS, server DAL, and browser UI layers.
- Zero critical/serious WCAG 2.0/2.1 AA violations and zero horizontal overflow across all 4 responsive viewports.

---

## 4. Next Recommended Action

Phase 3 is **Complete**. Next milestone awaits Product Owner kick-off: candidate **`P4-M01`** — Phase 4 Structured Communication, Classwork/Homework Assignments & Subject Progress Updates.
