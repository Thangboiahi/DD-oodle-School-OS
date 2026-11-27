# DD-oodle Project Status

- **Last Updated:** 2026-11-27
- **Current Phase:** Phase 2 — Institutional Registry and Academic Structure (**In Progress**; Phase 1 **Complete**)
- **Current Milestone:** `P2-M02` — People Registry, Guardian Links, Admissions Basics & Custom Fields (Server DAL & UI) (**In Progress — awaiting live CI green confirmation**)
- **Overall Repository State:** Phase 1 complete (`45951599452`); `P2-M01` schema & pgTAP verified green (`45989069548`). `P2-M02` adds `lib/registry/{schemas,masking}.ts`, server-only `server/audit/log.ts` & `server/registry/service.ts`, and compact responsive `/t/[slug]/people` UI (Students, Student Detail + Guardians + Custom Fields, Staff Directory, Admissions Pipeline, Custom Field Definitions) with unit tests.

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
| `P2-M02` — People Registry, Guardian Links, Admissions & Custom Fields DAL/UI | **In Progress** | `lib/registry/{schemas,masking}.ts`, `server/{audit/log,registry/service}.ts`, `/t/[slug]/people/*` routes & Server Actions, unit tests awaiting CI |

## 3. Latest Verification (`P2-M02` Pre-CI Baseline)

- **Previous Green CI Run (`P2-M01`):** [`45989069548`](https://github.com/Thangboiahi/DD-oodle-School-OS/actions/runs/45989069548) on `bd7a534`.
- **Local Verification (`P2-M02`):** `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` verified cleanly prior to live CI run.

## 4. Open Blockers / Dependencies

- **None.**

## 5. Next Bounded Milestone

**`P2-M03`** — Academic Structure & CBSE Senior Secondary XI–XII Allocation Server Services & UI (`/t/[slug]/academics`).
