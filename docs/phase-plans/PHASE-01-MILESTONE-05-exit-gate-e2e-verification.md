# Phase 1 — Milestone 05: Phase 1 Exit Gate: Live Multi-Tenant Auth E2E, Responsive & Accessibility Verification, and Phase 1 Closure

```text
MILESTONE ID: P1-M05
PHASE: Phase 1 — Foundation and multi-tenant platform (Exit Gate & Closure)
TITLE: Phase 1 Exit Gate: Live Multi-Tenant Auth E2E, Responsive & Accessibility Verification, and Phase 1 Closure
OBJECTIVE: Exercise and verify the complete Phase 1 Exit Gate end-to-end against a real running Supabase Auth + PostgREST + Next.js stack in CI (plus responsive 4-viewport overflow and WCAG AA accessibility audits), fix any genuine auth/UI/a11y defect surfaced without weakening security or RLS, and close Phase 1 as Complete once all 3 CI jobs pass green.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §12.3–§12.5, §15 Phase 1 exit gate, §17.3, §17.5; Part B10–B13; ADR-0001; ADR-0002.
PRECONDITIONS: P1-M04 merged on main (30a537d) and CI Run 45948606180 green.
IN SCOPE:
  - Synthetic GoTrue password & auth.identities seeding in supabase/seed.sql (DdOodleTest#2026! local/CI fixture only).
  - Playwright & @axe-core/playwright test harness (playwright.config.ts, package.json scripts, .gitignore, eslint.config.mjs).
  - E2E Suite 1 (tests/e2e/public-and-responsive.spec.ts): landing zero-leakage check, PWA/health HTTP headers, theme/density persistence, 4-viewport responsive & horizontal-overflow audit, and WCAG 2.0/2.1 AA axe-core checks across Light/Dark modes.
  - E2E Suite 2 (tests/e2e/multi-tenant-auth.spec.ts): CI fail-fast Supabase guard, unauthenticated redirect checks, invalid-credential error check, Sunrise Principal isolation & non-enumerating slug denial, Dual-Member single-identity switching across Sunrise CBSE (Teacher) and Valley CBSE (Parent) via WorkspaceSwitcher, and Platform Operator strict isolation.
  - Parallel CI job e2e-live-auth in .github/workflows/ci.yml wiring supabase start, supabase db reset, secret-safe supabase status -o env export, production next build, pnpm test:e2e, failure artifact upload, and supabase stop --no-backup.
  - Phase 1 closure documentation across docs/ and root governance files after all 3 CI jobs pass green.
OUT OF SCOPE:
  - Phase 2 database tables, migrations, or registry/academic UI (students, guardians, classes, sections, subjects, teaching groups).
  - Production deployment workflows or real secrets.
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or weakening RLS/security/a11y rules.
EXPECTED FILES / DOMAINS: supabase/seed.sql, playwright.config.ts, tests/e2e/*, .github/workflows/ci.yml, package.json, .gitignore, eslint.config.mjs, docs/*, CHANGELOG.md, README.md.
IMPLEMENTATION STEPS:
  1. Seed synthetic local/CI GoTrue password and email auth.identities rows in supabase/seed.sql while preserving all deterministic UUIDs and pgTAP assertions.
  2. Install @playwright/test and @axe-core/playwright, configure playwright.config.ts, add test:e2e scripts to package.json, and ignore Playwright report artifacts.
  3. Implement Suite 1 (tests/e2e/public-and-responsive.spec.ts) and verify locally with Chromium across 4 viewports and WCAG AA axe-core scans.
  4. Implement Suite 2 (tests/e2e/multi-tenant-auth.spec.ts) with strict CI fail-fast guard and full multi-tenant/platform verification flows.
  5. Add e2e-live-auth job to .github/workflows/ci.yml, push to origin/main, inspect live CI failures/strict-mode locators, verify all 3 CI jobs pass green, and publish Phase 1 closure docs.
SECURITY / PRIVACY / DATA RISKS:
  - Local/CI fixture password exposure in production: clearly labeled synthetic local/CI only in seed.sql and never used outside local/CI Docker stacks.
  - Accidental silent skip of live auth E2E in CI: mitigated by E2E_REQUIRE_SUPABASE=true hard-fail guard in tests/e2e/multi-tenant-auth.spec.ts and secret-safe env export from supabase status -o env.
ACCEPTANCE CRITERIA:
  - Local checks pass: pnpm typecheck, pnpm lint, pnpm test (40/40), pnpm build, pnpm test:e2e:public (5/5).
  - GitHub Actions CI passes all 3 parallel jobs green: app-quality, supabase-rls-pgtap (26/26 pgTAP), and e2e-live-auth (10/10 Playwright).
  - Zero empty directories, zero broken relative links, clean secret check, and Phase 1 marked Complete in docs/ROADMAP.md.
TESTS AND VERIFICATION: pnpm typecheck, pnpm lint, pnpm test, pnpm build, pnpm test:e2e:public, and GitHub Actions CI Run 45951599452.
DOCUMENTATION TO UPDATE: docs/phase-plans/PHASE-01-MILESTONE-05-exit-gate-e2e-verification.md, docs/progress/MILESTONE-REPORT-P1-M05.md, docs/ROADMAP.md, docs/PROJECT_STATUS.md, docs/testing/TEST_STRATEGY.md, docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md, docs/README.md, CHANGELOG.md, README.md.
GIT COMMIT MESSAGE: test(e2e): add live multi-tenant auth, responsive and accessibility phase 1 exit gate (plus fix(e2e) & docs(progress))
PUSH TARGET: origin main
ROLLBACK / RECOVERY NOTES: Revert milestone commits cleanly on main without rewriting published history.
DEPENDENCIES: P1-M04 complete.
NEXT MILESTONE: P2-M01 — Phase 2 Institutional Registry & CBSE Senior Secondary Academic Schema (Persons/Student/Staff/Guardian Registry, Academic Sessions, Classes, Sections, Subjects & Subject Enrolments — awaiting Product Owner kick-off).
```

---

## Candidate Next Bounded Milestone (Proposed — Not Started)

```text
MILESTONE ID: P2-M01
PHASE: Phase 2 — Institutional registry and academic structure
TITLE: Core Registry & CBSE Senior Secondary Academic Structure Schema (Migrations, RLS & pgTAP)
OBJECTIVE: Design and verify Supabase PostgreSQL migrations, strict multi-tenant RLS policies, and pgTAP isolation tests for DD-oodle's 3-layer session-enrolment model: institution staff/student profiles, guardian links, academic sessions, classes, sections, streams, subjects, offerings, individual subject enrolments, teaching groups, time-bound staff assignments, and monitor/monitress allocations (modeling Senior Secondary XI/XII mixed subject combinations without schema exceptions).
PRECONDITIONS: Phase 1 marked Complete (CI Run 45951599452 green) and Product Owner approval to open Phase 2.
```
