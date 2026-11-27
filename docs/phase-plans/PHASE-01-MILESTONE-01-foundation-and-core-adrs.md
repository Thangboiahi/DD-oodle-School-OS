# Phase 1 — Milestone 01: Phase 0 Closure, Core ADRs & Next.js Foundation

```text
MILESTONE ID: P1-M01
PHASE: Phase 1 — Foundation and multi-tenant platform (plus Phase 0 Closure)
TITLE: Phase 0 Closure, Core ADRs & Next.js App Router Foundation
OBJECTIVE: Record approved Open Decisions OD-01..OD-05, add the canonical Domain Glossary and Test Strategy, author accepted ADR-0001 and ADR-0002, and scaffold a clean Next.js App Router + strict TypeScript + Tailwind CSS + ESLint + Vitest foundation with pnpm, /api/health, and a tested OD-03 tenant-hint parser.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §2, §7, §11, §15 (Phase 0–1), §17.5, §18; Part D1–D6; Part E.
PRECONDITIONS: P0-M01 complete (a007526 on main); Product Owner approved OD-01..OD-05 on 2026-11-27.
IN SCOPE:
  - Phase 0 closure: DOMAIN_GLOSSARY.md, OD-01..OD-05 marked Approved in REQUIREMENTS_INDEX_AND_REGISTERS.md, TEST_STRATEGY.md.
  - Core ADRs: ADR-0001-multi-tenant-database-strategy.md, ADR-0002-person-identity-and-session-enrolment.md.
  - App Foundation: package.json, pnpm-lock.yaml, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs, vitest.config.ts, app/layout.tsx, app/globals.css, app/page.tsx, app/api/health/route.ts, lib/tenancy/resolve-tenant-hint.ts, tests/unit/resolve-tenant-hint.test.ts, tests/unit/health-route.test.ts.
  - Governance updates: README.md, docs/README.md, docs/architecture/ARCHITECTURE_OVERVIEW.md, docs/ROADMAP.md (Phase 0 Complete, Phase 1 In Progress), docs/PROJECT_STATUS.md, CHANGELOG.md, docs/progress/MILESTONE-REPORT-P1-M01.md.
OUT OF SCOPE:
  - 3 theme families (Clarity/Calm/Focus), responsive nav shell, public landing page design, PWA manifest/SW (P1-M02).
  - Supabase schema, SQL migrations, RLS policies, auth flows (P1-M03).
  - Empty placeholder folders (components/, features/, server/, workers/, supabase/).
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md.
EXPECTED FILES / DOMAINS: Governance docs, Core ADRs, Next.js App Router foundation, pure tenancy hint utility, unit tests.
IMPLEMENTATION STEPS:
  1. Activate pnpm toolchain and install Next.js, React, Zod, TypeScript, Tailwind CSS v4, ESLint and Vitest with pnpm-lock.yaml.
  2. Configure strict TypeScript, Next.js, Tailwind PostCSS, ESLint flat config and Vitest.
  3. Implement app shell placeholder, /api/health, pure Zod-validated resolveTenantHint parser (OD-03) and unit tests.
  4. Author Domain Glossary, ADR-0001, ADR-0002, Test Strategy and update governance/status/roadmap/architecture docs.
  5. Run pnpm typecheck, pnpm lint, pnpm test, pnpm build, link/empty-dir verification and secret scan; commit and push to origin/main.
SECURITY / PRIVACY / DATA RISKS:
  - Tenant routing hints (subdomain or /t/<slug>) could be mistaken for verified auth/membership; mitigated by explicit isTrustedMembership: false contract, Zod slug/reserved-word validation and ADR-0001 server-side enforcement rule.
  - Zero secrets or env values exposed in /api/health or tracked files.
ACCEPTANCE CRITERIA:
  - pnpm typecheck, pnpm lint, pnpm test and pnpm build pass with zero errors.
  - Unit tests cover valid/invalid subdomains, preview paths, reserved/malformed slugs and /api/health.
  - ADR-0001 and ADR-0002 include all Part D6 sections.
  - Phase 0 marked Complete and Phase 1 In Progress in docs/ROADMAP.md.
  - Zero empty folders under docs/ or repo root; all relative links in README.md and docs/README.md resolve; pnpm-lock.yaml committed.
TESTS AND VERIFICATION: pnpm typecheck, pnpm lint, pnpm test, pnpm build, directory/link checks, git diff --cached secret check.
DOCUMENTATION TO UPDATE: README.md, CHANGELOG.md, docs/README.md, docs/ROADMAP.md, docs/PROJECT_STATUS.md, docs/architecture/ARCHITECTURE_OVERVIEW.md, docs/requirements/*, docs/decisions/*, docs/testing/*, docs/progress/MILESTONE-REPORT-P1-M01.md.
GIT COMMIT MESSAGE: feat(foundation): scaffold nextjs app router toolchain and record core adrs
PUSH TARGET: origin main
ROLLBACK / RECOVERY NOTES: Revert commit on main; no database migrations or external deployments exist yet.
DEPENDENCIES: Product Owner decisions OD-01..OD-05 (Approved 2026-11-27).
NEXT MILESTONE: P1-M02
```

---

## Candidate Next Bounded Milestone (Proposed — Not Started)

```text
MILESTONE ID: P1-M02
PHASE: Phase 1 — Foundation and multi-tenant platform
TITLE: Design System Tokens, Responsive App Shell, Public Landing Shell & PWA Skeleton
OBJECTIVE: Implement the 3 theme families (Clarity, Calm, Focus) with Light/Dark modes, responsive layout shell (mobile portrait/landscape, tablet, desktop), accessible baseline UI primitives, minimal public landing shell and Next.js PWA manifest/metadata skeleton with responsive/a11y verification.
PRECONDITIONS: P1-M01 complete and pushed to origin/main.
```
