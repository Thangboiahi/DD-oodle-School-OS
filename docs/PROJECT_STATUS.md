# DD-oodle Project Status

- **Last Updated:** 2026-11-28
- **Current Phase:** Phase 4 — Structured Communication & Academic Planning (**In Progress**; Phases 0–3 **Complete**)
- **Current Milestone:** `P4-M04` — Unified Hybrid Assignments, MCQ Quizzes, Offline Completion, Monitor Board & Live Handbook Phase 4 Wiring DAL + UI (**Local Verified — Pushing for Live CI**)
- **Overall Repository State:** Phases 0–3 **Complete** (`P3-M05` CI Runs `46105679125` & `46109385779`); `P4-M01` **Complete** (`6314e80`, CI Run `46114613893`); `P4-M02` **Complete** (`4a46d8f`, CI Run `46116183736`); `P4-M03` **Complete** (`314875f`, CI Run `46118712061`: `108/108` Vitest, `178/178` pgTAP + `db lint`, `20/20` Playwright); `P4-M04` adds `lib/assignments/{schemas,rules}.ts`, caller-RLS `server/assignments/service.ts`, `/t/[slug]/assignments*`, `OfflineDraftBox`, and live Digital Student Handbook Phase 4 wiring.

---

## 1. Audited Repository Condition & Toolchain

- **Git Branch & Remote:** `main` tracking `origin/main` (`https://github.com/Thangboiahi/DD-oodle-School-OS.git`).
- **Recovery & CI Baseline Commits:**
  - `88afd32` — `feat(supabase): add multi-tenant core schema, rls policies, private storage and ssr proxy`
  - `068cf60` — accidental external rollback (`chore: rollback project milestone to P1-M02`), cleanly reverted without history rewrite in `ef53895`
  - `c599486` — `ci(supabase): add github actions app quality and live pgtap rls pipeline` (verified green in GitHub Actions)
- **Active Runtime & Packages:**
  - Node.js `v26.13.0` (`engines: >=22.0.0`; CI runs Node `22`), `pnpm@12.23.0`
  - `next@16.4.6`, `react@19.3.1`, `react-dom@19.3.1`, `zod@4.6.7`
  - `@supabase/supabase-js@2.119.2`, `@supabase/ssr@0.12.7`, `server-only@0.0.1`
  - `typescript@5.9.3`, `tailwindcss@4.3.5`, `@tailwindcss/postcss@4.3.5`, `postcss@8.5.33`, `eslint@9.39.5`, `eslint-config-next@16.4.6`, `vitest@5.1.2`, `@playwright/test@1.65.1`, `@axe-core/playwright@4.14.1`

## 2. Milestone Summary

| Item | Status | Notes |
|---|---|---|
| Phase 0 — Repository Governance & Discovery | **Complete** | `P0-M01` (`a007526`) + Phase 0 closure (`DOMAIN_GLOSSARY.md`, approved `OD-01`–`OD-05`) |
| `P1-M01` — Core ADRs & Next.js Foundation | **Complete** (`da5bf9c`) | `ADR-0001`, `ADR-0002`, `TEST_STRATEGY.md`, `/api/health`, `resolveTenantHint` (`OD-03`) |
| `P1-M02` — Design System, Responsive Shell & PWA Skeleton | **Complete** (`5e699cf`) | 3 theme families (Light/Dark) + density, 4-mode `AppShell`, `/shell-preview`, landing & `/sign-in` placeholder, native PWA + headers |
| `P1-M03` — Supabase Core Schema, RLS, Storage & SSR Proxy | **Complete** (`88afd32`, restored `ef53895`, CI-verified via `P1-M03b`) | 7 forced-RLS tables, `app_auth` helpers, `institution-private` bucket, synthetic seed, 26-assertion pgTAP suite, `@supabase/ssr` + `proxy.ts` |
| `P1-M03b` — GitHub Actions CI & Live pgTAP Verification Gate | **Complete** (`c599486`) | Live GitHub Actions Run `45946043527` passed (`App Quality & Hygiene` + `Supabase RLS & pgTAP Verification`: 26/26 pgTAP assertions PASS, `No schema errors found`) |
| `P1-M04` — Global Sign-In, Workspace Switcher, Tenant Resolver & Platform Boundary | **Complete** (`30a537d`) | Server-only `getClaims()` DAL, `evaluatePermission()`, `sanitizeNextPath()`, `/sign-in`, `/auth/sign-out`, `/workspace`, `/t/[slug]`, `/platform`, `WorkspaceSwitcher` (`clearPwaCaches`), and 40/40 Vitest unit checks (CI Run `45948606180`) |
| `P1-M05` — Phase 1 Exit Gate & Live Auth/Tenancy/Responsive/A11y E2E Verification | **Complete** (`eb6ed69` / `d8fa409`) | Seeded synthetic GoTrue credentials, added Playwright + axe-core E2E suites + CI `e2e-live-auth` job; CI Run `45951599452` passed all 3 jobs (`app-quality`, `supabase-rls-pgtap` 26/26, `e2e-live-auth` 10/10) |
| `P2-M01` — Phase 2 ADRs, 19-Table Registry & CBSE XI–XII Academic Schema, RLS & pgTAP | **Complete** (`bd7a534`) | Accepted `ADR-0003`/`ADR-0004`, migrations `202611270004`–`202611270006` (19 forced-RLS tables), CBSE XI–XII seed, and CI Run `45989069548` passing all 3 jobs (`app-quality` 40/40 unit, `supabase-rls-pgtap` 58/58 pgTAP + `db lint`, `e2e-live-auth` 10/10 Playwright) |
| `P2-M02` — People Registry, Guardian Links, Admissions & Custom Fields DAL/UI | **Complete** (`cf4916f`) | `lib/registry/{schemas,masking}.ts`, `server/{audit/log,registry/service}.ts`, `/t/[slug]/people/*` routes & Server Actions; CI Run `45991352879` passed all 3 jobs (`49/49` unit, `58/58` pgTAP, `10/10` Playwright) |
| `P2-M03` — Academic Structure, CBSE Electives, Cross-Section Teaching Groups & Allocations | **Complete** (`61e36d5`) | `lib/academics/{schemas,conflicts}.ts`, caller-RLS `server/academics/service.ts`, `/t/[slug]/academics/*` routes & Server Actions; CI Run `45993903529` passed all 3 jobs (`59/59` unit, `58/58` pgTAP, `10/10` Playwright) |
| `P2-M04` — Bulk Import Staging, CSV/XLSX Validation, Dry-Run Preview & Idempotent Commit | **Complete** (`aa09764`) | Migration 7 (`import_batches`/`import_rows`), `read-excel-file@9.3.20` + RFC-4180 CSV & formula neutralization, `server/imports/service.ts`, `/t/[slug]/imports*`; CI Run `45997372362` passed all 3 jobs (`65/65` unit, `80/80` pgTAP, `10/10` Playwright) |
| `P2-M05` — Phase 2 Exit Gate & Phase 2 Closure | **Complete** (`31494ad`, `4fbbc61`, `beab9d2`) | `tests/e2e/phase2-registry-and-cbse-academics.spec.ts`, Migrations `0008`/`0009` (`can_read_person_profile`), batch `fetchPersonNameMap()` fix, WCAG AA token alignment, `supabase/setup-cli@v3`; CI Run `46087393787` passed all 3 jobs (`66/66` unit, `88/88` pgTAP, `15/15` Playwright) |
| `P3-M01` — Phase 3 ADRs, Attendance, Leave & Digital Handbook Schema, RLS & pgTAP | **Complete** (`95bbda0`) | `ADR-0005` & `ADR-0006`, Migrations `202611280001`–`202611280004` (8 forced-RLS tables, 36 total + statement-level immutable `attendance_events`), synthetic seed, 43-assertion pgTAP (`04_phase3_attendance_leave_handbook_rls.test.sql`); CI Run `46095870562` passed all 3 jobs (`66/66` unit, `131/131` pgTAP + `db lint`, `15/15` Playwright) |
| `P3-M02` — Attendance, Verification, Sign-Off, Audited Correction Ledger & Offline Sync | **Complete** (`7efa07a`) | `lib/attendance/{schemas,rules}.ts`, caller-RLS `server/attendance/service.ts`, `POST /api/t/[slug]/attendance/sync`, `/t/[slug]/attendance/*` Server Actions & UI, `tests/unit/attendance-rules.test.ts`; CI Run `46097947497` passed all 3 jobs (`78/78` unit, `131/131` pgTAP + `db lint`, `15/15` Playwright) |
| `P3-M03` — Student & Staff Leave Workflows, Parent Notices & Verified Class Summary | **Complete** (`9b69e75`) | `lib/leave/{schemas,rules}.ts`, caller-RLS `server/leave/service.ts`, `/t/[slug]/leave*` & `/t/[slug]/attendance/summary` Server Actions & UI, `tests/unit/leave-and-summary-rules.test.ts`; CI Run `46099916419` passed all 3 jobs (`88/88` unit, `131/131` pgTAP + `db lint`, `15/15` Playwright) |
| `P3-M04` — Digital Student Handbook with Strict Category & Visibility Privacy Controls | **Complete** (`bff9076`) | `lib/handbook/{schemas,rules}.ts`, caller-RLS `server/handbook/service.ts`, `/t/[slug]/handbook*` Server Actions & UI, and `tests/unit/handbook-rules.test.ts`; CI Run `46101572764` passed all 3 jobs (`95/95` unit, `131/131` pgTAP + `db lint`, `15/15` Playwright) |
| `P3-M05` — Phase 3 Exit Gate & Phase 3 Closure | **Complete** (`efccad9`, `0aedd64`) | `tests/e2e/phase3-school-day-and-handbook.spec.ts`, `server/leave/service.ts` Monitor guard fix, and Phase 3 closure docs; CI Runs `46105679125` & `46109385779` passed all 3 jobs (`95/95` unit, `131/131` pgTAP + `db lint`, `20/20` Playwright) |
| `P4-M01` — Phase 4 ADRs, Communication, Academic Planning & Hybrid Assignments Core Schema, RLS & pgTAP | **Complete** (`6314e80`) | `ADR-0007` & `ADR-0008`, Migrations `202611280005`–`202611280007` (`academic_terms.status` + 9 forced-RLS tables = 45 total), synthetic seed, 47-assertion pgTAP suite (`05_phase4_communication_planning_assignments_rls.test.sql`), and `sql-migration-invariants.test.ts` (45 tables); CI Run `46114613893` passed all 3 jobs (`95/95` unit, `178/178` pgTAP + `db lint`, `20/20` Playwright) |
| `P4-M02` — Scoped Official Notices, Acknowledgements, Formal Parent Enquiries & Record-Bound Comments | **Complete** (`4a46d8f`) | `lib/communication/{schemas,rules}.ts`, caller-RLS `server/communication/service.ts`, `/t/[slug]/communication*`, `OfflineNoticesCachePanel`, and `tests/unit/communication-rules.test.ts`; CI Run `46116183736` passed all 3 jobs (`101/101` unit, `178/178` pgTAP + `db lint`, `20/20` Playwright) |
| `P4-M03` — Academic Planning, Syllabus Hierarchy, Lesson Plans, Resources & Oversight | **Complete** (`314875f`) | `lib/planning/{schemas,rules}.ts`, caller-RLS `server/planning/service.ts`, `/t/[slug]/planning*` (`Syllabus`, `Lessons`, `Resources`, `Oversight`) & actions, and `tests/unit/planning-rules.test.ts`; CI Run `46118712061` passed all 3 jobs (`108/108` unit, `178/178` pgTAP + `db lint`, `20/20` Playwright) |
| `P4-M04` — Unified Hybrid Assignments, MCQ Quizzes, Offline Completion, Monitor Board & Live Handbook Wiring | **In Progress (Local Verified)** | `lib/assignments/{schemas,rules}.ts`, caller-RLS `server/assignments/service.ts`, `/t/[slug]/assignments*`, `OfflineDraftBox`, live Phase 4 wiring in `server/handbook/service.ts`, and `tests/unit/assignments-rules.test.ts` |

## 3. Latest Verification (`P4-M04` Local Verification + Baseline `P4-M03` CI Run `46118712061`)

- **Local Verification (`P4-M04`):** `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and docs hygiene checks verified prior to `origin/main` push.
- **Live GitHub Actions CI Baseline (`P4-M03`):** [`46118712061`](https://github.com/Thangboiahi/DD-oodle-School-OS/actions/runs/46118712061) on `314875f` (`App Quality & Hygiene` `140898217514` PASS `108/108` unit + `Supabase RLS & pgTAP Verification` `140898217515` PASS `178/178` pgTAP + `db lint` + `Live Multi-Tenant Auth & A11y E2E` `140898217394` PASS `20/20` Playwright).

## 4. Open Blockers / Dependencies

- **None.**

## 5. Next Bounded Milestone

**`P4-M05`** — Phase 4 Exit Gate: Live Cross-Role Communication, Planning, Assignments & Handbook E2E Verification and Phase 4 Closure.
