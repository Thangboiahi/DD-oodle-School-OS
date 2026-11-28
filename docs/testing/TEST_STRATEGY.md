# DD-oodle Test Strategy & Quality Gates

> **Canonical Reference:** [`../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md`](../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md) (Part A §17.5 & Part B13)

---

## 1. Testing Pyramid & Layers

| Layer | Tooling | Scope & Purpose | Required Cadence |
|---|---|---|---|
| **Static Type Safety** | `tsc --noEmit` (`pnpm typecheck`) | Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`) across app, lib and tests | Every milestone |
| **Lint & Code Hygiene** | ESLint (`pnpm lint`) | Next.js Core Web Vitals, TypeScript rules and hook/a11y conventions | Every milestone |
| **Unit Tests** | Vitest (`pnpm test`) | Pure domain logic, Zod schemas, tenant-hint parsing, permission evaluators, API route handlers | Every milestone |
| **Production Build** | Next.js (`pnpm build`) | Route compilation, App Router server/client boundary verification and bundle build | Every milestone |
| **Database & RLS Tests** | Supabase local CLI + SQL/pgTAP tests *(starting `P1-M03` / CI in `P1-M03b`)* | Positive access + **explicit cross-tenant & privilege-escalation denial tests** on all tables and Storage buckets (`supabase start`, `supabase db reset`, `supabase test db`, `supabase db lint`) | Every schema/auth/module milestone & automated CI |
| **E2E, Responsive & Accessibility** | Playwright (`@playwright/test`) + `@axe-core/playwright` (`pnpm test:e2e`, `pnpm test:e2e:public`) | Public zero-leakage landing, PWA/SW headers, theme persistence, 4-viewport overflow & navigation checks, WCAG 2.0/2.1 AA `axe-core` scans, and live multi-tenant GoTrue/PostgREST auth & cross-tenant/platform denial E2E *(live CI starting `P1-M05`)* | Every UI & auth milestone & automated CI |

---

## 2. Automated CI Quality Gates (`.github/workflows/ci.yml`)

Every push and pull request targeting `main` runs three parallel GitHub Actions jobs:

1. **`app-quality`:** Node.js 22 (`pnpm --frozen-lockfile`), `pnpm typecheck`, `pnpm lint`, `pnpm test` (**115/115** across 21 files), `pnpm build`, and documentation link/empty-directory hygiene verification.
2. **`supabase-rls-pgtap`:** Official Supabase CLI (`supabase/setup-cli@v3` with npm-backed `version: ^2`), local Docker stack (`supabase start`), clean idempotent schema + synthetic seed replay (`supabase db reset`), live pgTAP cross-tenant/relationship/sensitivity/attendance/handbook/communication/planning/assignments RLS verification (**178/178** assertions across 5 suites via `supabase test db`), schema lint (`supabase db lint`), and teardown (`supabase stop --no-backup`).
3. **`e2e-live-auth`:** Starts local Supabase stack + synthetic seed (`supabase start`, `supabase db reset`), exports local runtime environment variables from `supabase status -o env` (with `E2E_REQUIRE_SUPABASE=true` so missing Supabase env fails loudly rather than silently skipping), runs production `pnpm build`, executes all **25/25** Playwright checks across `tests/e2e/public-and-responsive.spec.ts`, `tests/e2e/multi-tenant-auth.spec.ts`, `tests/e2e/phase2-registry-and-cbse-academics.spec.ts`, `tests/e2e/phase3-school-day-and-handbook.spec.ts`, and `tests/e2e/phase4-communication-planning-assignments.spec.ts` (including WCAG AA `axe-core` and 4-viewport overflow audits across Phase 1, Phase 2, Phase 3, and Phase 4 routes), uploads artifacts on failure, and stops Supabase (`supabase stop --no-backup`).

*(Verified Phase 4 Exit Gate Baseline on `1e66f83` / CI Run `46122793847`: **115/115** Vitest unit & SQL static checks across 21 files and 45 forced-RLS public tables, **178/178** pgTAP assertions across 5 suites, and **25/25** Playwright E2E checks across 5 specs.)*

---

## 3. Mandatory Milestone Exit Gates

1. **No failing checks hidden:** Never delete, skip or weaken security/RLS tests to make a build pass.
2. **Synthetic test data only:** Never use real student, parent or staff PII in unit/integration fixtures or seeds.
3. **Cross-tenant denial gate (Phase 1 exit):** Automated tests must prove that Institution A's users cannot read, mutate or upload/download Institution B's records or private Storage objects.
4. **Evidence recording:** Actual commands run and observed pass/fail outputs must be recorded in the milestone completion report (`docs/progress/`).
