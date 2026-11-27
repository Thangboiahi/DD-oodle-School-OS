# Phase 1 — Milestone 03b: GitHub Actions CI Pipeline & Live Supabase pgTAP Verification Gate

```text
MILESTONE ID: P1-M03b
PHASE: Phase 1 — Foundation and multi-tenant platform
TITLE: GitHub Actions CI Pipeline & Live Supabase pgTAP Verification Gate
OBJECTIVE: Establish automated GitHub Actions CI running app quality checks (typecheck, lint, test, build, repo hygiene) and live Supabase Docker stack pgTAP tests (supabase start, supabase db reset, supabase test db, supabase db lint), fix any runtime SQL/seed/pgTAP compatibility defects surfaced without weakening RLS, and close P1-M03 once live CI passes.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §15 (Phase 1 exit gate), §17.5; Part B10–B13.
PRECONDITIONS: P1-M03 static baseline pushed (88afd32 on main); gh CLI authenticated locally or GitHub Actions enabled on repository.
IN SCOPE:
  - .github/workflows/ci.yml (app-quality + supabase-rls-pgtap jobs).
  - Pre-push SQL/seed/pgTAP runtime hardening (202611270003_private_storage_baseline.sql, seed.sql, 01_multi_tenant_rls.test.sql) and any live CI fixes without weakening RLS.
  - Governance & verification docs: docs/phase-plans/PHASE-01-MILESTONE-03B-ci-and-live-pgtap-gate.md, docs/progress/MILESTONE-REPORT-P1-M03B.md, docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md, docs/testing/TEST_STRATEGY.md, docs/README.md, docs/PROJECT_STATUS.md, CHANGELOG.md, README.md.
OUT OF SCOPE:
  - Sign-in UI, auth forms, workspace switcher, or server actions (P1-M04).
  - Phase 2 schema/features, production deploy workflows, or CI secrets.
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or creating empty folders.
EXPECTED FILES / DOMAINS: .github/workflows/ci.yml, SQL hardening fixes if required, CI/test strategy/status/compliance/progress docs.
IMPLEMENTATION STEPS:
  1. Audit supabase/ migrations, seed, and pgTAP tests for GoTrue/Storage/search_path traps and apply safe hardening.
  2. Author .github/workflows/ci.yml with app-quality and supabase-rls-pgtap jobs.
  3. Update docs (phase plan, progress report, compliance register, test strategy, README, CHANGELOG, PROJECT_STATUS).
  4. Validate locally (pnpm typecheck, pnpm lint, pnpm test, pnpm build, YAML parse, hygiene, secret scan), commit, and push to origin/main.
  5. Watch live GitHub Actions workflow via gh CLI, repair any surfaced runtime defect without weakening RLS, and record final run ID/URL and pgTAP pass count.
SECURITY / PRIVACY / DATA RISKS:
  - Storage non-UUID folder cast in RLS helper could raise 22P02 instead of clean RLS denial; mitigated with CASE guard in can_write_institution_storage().
  - Weakening RLS or skipping assertions in CI repair loop is strictly prohibited.
ACCEPTANCE CRITERIA:
  - Both GitHub Actions jobs (app-quality and supabase-rls-pgtap) pass green on main, including all 26 pgTAP assertions.
  - Documentation records exact verified GitHub Actions run ID/URL and pass counts.
TESTS AND VERIFICATION: pnpm typecheck, pnpm lint, pnpm test, pnpm build, gh run watch / gh run view live CI pass.
DOCUMENTATION TO UPDATE: docs/phase-plans/PHASE-01-MILESTONE-03B-ci-and-live-pgtap-gate.md, docs/progress/MILESTONE-REPORT-P1-M03B.md, docs/progress/MILESTONE-REPORT-P1-M03.md, docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md, docs/testing/TEST_STRATEGY.md, docs/README.md, docs/PROJECT_STATUS.md, CHANGELOG.md, README.md.
GIT COMMIT MESSAGE: ci(supabase): add github actions app quality and live pgtap rls pipeline
PUSH TARGET: origin main
ROLLBACK / RECOVERY NOTES: Revert CI workflow or migration fix commit on main.
DEPENDENCIES: P1-M03 (88afd32).
NEXT MILESTONE: P1-M04 — Global Sign-In Flow, Workspace Selector & Verified Server Tenant Context.
```
