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
| **Database & RLS Tests** | Supabase local CLI + SQL/integration tests *(starting `P1-M03`)* | Positive access + **explicit cross-tenant & privilege-escalation denial tests** on all tables and Storage buckets | Every schema/auth/module milestone |
| **E2E, Responsive & Accessibility** | Browser / Playwright + Lighthouse / axe checks *(starting `P1-M02`+)* | Critical user flows, phone/tablet/desktop portrait & landscape viewports, keyboard navigation, contrast and theme modes | UI-facing milestones |

---

## 2. Mandatory Milestone Exit Gates

1. **No failing checks hidden:** Never delete, skip or weaken security/RLS tests to make a build pass.
2. **Synthetic test data only:** Never use real student, parent or staff PII in unit/integration fixtures or seeds.
3. **Cross-tenant denial gate (Phase 1 exit):** Automated tests must prove that Institution A's users cannot read, mutate or upload/download Institution B's records or private Storage objects.
4. **Evidence recording:** Actual commands run and observed pass/fail outputs must be recorded in the milestone completion report (`docs/progress/`).
