# DD-oodle Project Status

- **Last Updated:** 2026-11-28
- **Current Phase:** Phase 3 — Attendance, Leave & Digital Handbook (**In Progress**; Phase 1 & Phase 2 **Complete**)
- **Current Milestone:** `P3-M01` — Phase 3 ADRs, Attendance, Leave & Digital Student Handbook Core Schema, Forced RLS & pgTAP Suite (**Local Verified — Pending Live pgTAP CI**)
- **Overall Repository State:** Phase 2 **Complete** (`P2-M01`–`P2-M05`, CI Run `46087393787` on `beab9d2`); `P3-M01` adds `ADR-0005` & `ADR-0006`, Migrations `202611280001`–`202611280003` (8 new forced-RLS tables bringing total to **36** forced-RLS public tables across 12 SQL migrations), append-only `attendance_events`, category/scope-partitioned `handbook_entries`, expanded `supabase/seed.sql`, and 41-assertion pgTAP suite (`04_phase3_attendance_leave_handbook_rls.test.sql`).

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
| `P3-M01` — Phase 3 ADRs, Attendance, Leave & Digital Handbook Schema, RLS & pgTAP | **In Progress (Local Verified)** | `ADR-0005` & `ADR-0006`, Migrations `202611280001`–`202611280003` (8 forced-RLS tables, 36 total), synthetic seed expansion, `04_phase3_attendance_leave_handbook_rls.test.sql` (41 assertions), and updated `sql-migration-invariants.test.ts` |

## 3. Latest Verification (`P3-M01` Local Verification + Baseline `P2-M05` CI Run `46087393787`)

- **Local Verification (`P3-M01`):** `pnpm typecheck` (0 errors), `pnpm lint` (0 errors, 0 warnings), `pnpm test` (15 files, 66/66 passed across 36 forced-RLS tables), `pnpm build` (clean production bundle), `DOC_HYGIENE_OK` (`0` empty dirs, `44` Markdown docs, `150` valid links).
- **Live GitHub Actions CI Baseline (`P2-M05`):** [`46087393787`](https://github.com/Thangboiahi/DD-oodle-School-OS/actions/runs/46087393787) on `beab9d2` (`App Quality & Hygiene` `140803311016` PASS `54s`: 66/66 unit + `Supabase RLS & pgTAP Verification` `140803309054` PASS `2m0s`: 88/88 pgTAP + `Live Multi-Tenant Auth & A11y E2E` `140803310183` PASS `3m12s`: 15/15 Playwright checks).

## 4. Open Blockers / Dependencies

- **None.**

## 5. Next Bounded Milestone

**`P3-M02`** — Attendance, Leave & Parent Notices Server DAL + UI (`/t/[slug]/attendance` & offline queue foundation).
