# Phase 1 — Milestone 03: Supabase Core Multi-Tenant Schema, RLS Baseline, Private Storage & Next.js 16 SSR Foundation

```text
MILESTONE ID: P1-M03
PHASE: Phase 1 — Foundation and multi-tenant platform
TITLE: Supabase Core Multi-Tenant Schema, RLS Baseline, Private Storage, Synthetic Seed & Next.js 16 SSR Client Foundation
OBJECTIVE: Implement DD-oodle's foundational Supabase PostgreSQL multi-tenant schema, strict RLS & private Storage policies, pgTAP cross-tenant security tests, synthetic two-institution seed, and Next.js 16 @supabase/ssr client/proxy plumbing without building sign-in UI forms, workspace switcher UI, or institutional dashboards.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §2, §3.4, §4, §7.1, §11.3–§11.4; Part B10–B13; ADR-0001; ADR-0002.
PRECONDITIONS: P1-M02 complete (5e699cf on main).
IN SCOPE:
  - Supabase local config & versioned migrations: supabase/config.toml, supabase/migrations/202611270001_core_identity_and_tenancy.sql, 202611270002_rls_helpers_and_policies.sql, 202611270003_private_storage_baseline.sql.
  - Synthetic two-institution seed & pgTAP tests: supabase/seed.sql, supabase/tests/01_multi_tenant_rls.test.sql.
  - Next.js 16 SSR/client/admin/proxy plumbing: .env.example, lib/supabase/{env,browser,server,admin,proxy}.ts, proxy.ts.
  - Unit & static SQL invariant tests: tests/unit/{supabase-env,sql-migration-invariants}.test.ts.
  - Docs & compliance updates: docs/security/MULTI_TENANT_RLS_BASELINE.md, docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md, docs/phase-plans/PHASE-01-MILESTONE-03-supabase-schema-rls-storage.md, docs/progress/MILESTONE-REPORT-P1-M03.md, docs/README.md, docs/PROJECT_STATUS.md, docs/architecture/ARCHITECTURE_OVERVIEW.md, CHANGELOG.md, README.md.
OUT OF SCOPE:
  - Sign-in/sign-up forms, workspace switcher UI, or institutional dashboards (P1-M04).
  - Phase 2 academic/student/guardian tables.
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or creating empty folders.
EXPECTED FILES / DOMAINS: Supabase SQL migrations, pgTAP test suite, synthetic seed, Next.js 16 SSR/proxy plumbing, static SQL & env unit tests, security and progress docs.
IMPLEMENTATION STEPS:
  1. Install @supabase/supabase-js, @supabase/ssr, server-only and update .env.example.
  2. Author supabase/config.toml, 3 versioned migrations (core schema, app_auth RLS helpers/policies, private storage), synthetic seed, and pgTAP tests.
  3. Implement lib/supabase/{env,browser,server,admin,proxy}.ts and root proxy.ts.
  4. Add unit tests for Supabase env guards and static SQL migration/secret invariants.
  5. Update security docs, compliance register (Supabase Nov 2026 sources), README, changelog, and milestone/status reports.
  6. Run pnpm typecheck, pnpm lint, pnpm test, pnpm build, static link/dir/secret scans; run supabase test db if Docker + Supabase CLI are installed (otherwise report NOT RUN explicitly).
SECURITY / PRIVACY / DATA RISKS:
  - Cross-tenant leakage or privilege escalation via RLS bypass, search_path hijacking, or user_metadata reads; mitigated via private app_auth schema, SET search_path = '', FORCE ROW LEVEL SECURITY, composite FKs, and pgTAP denial suite.
  - Exposure of SUPABASE_SECRET_KEY to browser bundles; mitigated via server-only imports, window runtime check, and unit static scan.
  - Live database execution blocker on current host: local supabase CLI and docker are not installed yet, so supabase test db remains NOT RUN until executed in a Docker-enabled environment.
ACCEPTANCE CRITERIA:
  - pnpm typecheck, pnpm lint, pnpm test, and pnpm build pass with zero errors.
  - Live supabase db reset & supabase test db pass all 26 pgTAP assertions (open until run on Docker-enabled host).
  - Zero empty folders, zero broken doc links, zero secrets in staged diff.
TESTS AND VERIFICATION: pnpm typecheck, pnpm lint, pnpm test, pnpm build, empty-dir/link/secret checks, plus supabase db reset & supabase test db (requires local Docker + Supabase CLI).
DOCUMENTATION TO UPDATE: docs/security/MULTI_TENANT_RLS_BASELINE.md, docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md, docs/phase-plans/PHASE-01-MILESTONE-03-supabase-schema-rls-storage.md, docs/progress/MILESTONE-REPORT-P1-M03.md, docs/README.md, docs/PROJECT_STATUS.md, docs/architecture/ARCHITECTURE_OVERVIEW.md, CHANGELOG.md, README.md.
GIT COMMIT MESSAGE: feat(supabase): add multi-tenant core schema, rls policies, private storage and ssr proxy
PUSH TARGET: origin main
ROLLBACK / RECOVERY NOTES: Revert commit on main; no production Supabase database or live env vars have been provisioned yet.
DEPENDENCIES: P1-M02 complete; local Supabase CLI + Docker required to execute live pgTAP verification.
NEXT MILESTONE: Complete live pgTAP check on Docker-enabled host (supabase start && supabase db reset && supabase test db), then P1-M04 — Global Sign-In Flow, Workspace Selector & Verified Server Tenant Context.
```

---

## Candidate Next Bounded Milestone (Proposed — Not Started)

```text
MILESTONE ID: P1-M04
PHASE: Phase 1 — Foundation and multi-tenant platform
TITLE: Global Sign-In Flow, Workspace Selector & Verified Server Tenant Context
OBJECTIVE: Connect the global DD-oodle sign-in page, verified personal workspace & multi-institution membership selector, and server-side tenant context resolver (combining OD-03 untrusted routing hints with Supabase SSR auth.getClaims() and active PostgreSQL membership checks), gated behind live pgTAP pass on P1-M03.
PRECONDITIONS: P1-M03 live supabase test db execution passing (26/26 pgTAP assertions) on a Docker + Supabase CLI host.
```
