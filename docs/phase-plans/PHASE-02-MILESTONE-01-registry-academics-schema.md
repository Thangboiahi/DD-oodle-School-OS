# Phase 2 — Milestone 01: Phase 2 ADRs, Registry & CBSE XI–XII Academic Schema, Relationship RLS & pgTAP Suite

```text
MILESTONE ID: P2-M01
PHASE: Phase 2 — Institutional registry and academic structure
TITLE: Phase 2 ADRs, Registry & CBSE XI-XII Academic Schema, Relationship RLS & pgTAP Suite
OBJECTIVE: Record accepted ADR-0003 and ADR-0004, implement Phase 2's 19-table multi-tenant PostgreSQL schema with composite tenant FKs and relationship/sensitivity RLS, expand supabase/seed.sql with the reference CBSE XI-XII model, and verify all constraints and access rules via live pgTAP CI.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3-§4, §6.1-§6.3, §7.1-§7.3, §10.4, §15 Phase 2, §18; Part D6; ADR-0001; ADR-0002; ADR-0003; ADR-0004.
PRECONDITIONS: Phase 1 Exit Gate complete (CI Run 45951599452 green on eb6ed69, Phase 1 closed in docs/ROADMAP.md).
IN SCOPE:
  - Accepted ADRs: docs/decisions/ADR-0003-academic-structure-and-typed-assignments.md and docs/decisions/ADR-0004-normalized-custom-field-engine.md.
  - Migration 4 (supabase/migrations/202611270004_people_registry_and_custom_fields.sql): 6 registry & custom-field tables with composite tenant FKs, no Aadhaar column, updated_at triggers, and indexes.
  - Migration 5 (supabase/migrations/202611270005_academic_structure_and_assignments.sql): 13 academic structure, mixed-elective enrolment, cross-section teaching group, and typed time-bound academic_assignments tables.
  - Migration 6 (supabase/migrations/202611270006_phase2_rls_and_helpers.sql): Private app_auth helpers and ENABLE + FORCE ROW LEVEL SECURITY policies across all 19 tables.
  - Synthetic Seed (supabase/seed.sql): Preserve Phase 1 users/roles/audit and seed CBSE XI-XII Sunrise & Valley institutions, mixed electives, cross-section TG-XI-APPMATH-1 & TG-XI-CS-1, HOD/Class Teacher/Monitor/Student test accounts, and standard/confidential custom fields.
  - Verification: Update tests/unit/sql-migration-invariants.test.ts (26 public tables) and add supabase/tests/02_phase2_registry_and_academics_rls.test.sql (30 pgTAP assertions).
  - Docs: Update ROADMAP.md (Phase 2 In Progress), PROJECT_STATUS.md, docs/README.md, MULTI_TENANT_RLS_BASELINE.md, ARCHITECTURE_OVERVIEW.md, CHANGELOG.md, PHASE-02-MILESTONE-01-registry-academics-schema.md, MILESTONE-REPORT-P2-M01.md.
OUT OF SCOPE:
  - Phase 2 UI screens, Server Actions, CSV/XLSX bulk import tooling, or Phase 3+ attendance/leave modules.
  - Altering Phase 1 tables/policies or weakening RLS rules.
EXPECTED FILES / DOMAINS: docs/decisions/*, supabase/migrations/*, supabase/seed.sql, supabase/tests/*, tests/unit/*, docs/*, CHANGELOG.md.
IMPLEMENTATION STEPS:
  1. Write accepted ADR-0003 and ADR-0004 under docs/decisions/.
  2. Write migrations 202611270004 (people registry + custom fields), 202611270005 (academic structure + assignments), and 202611270006 (app_auth helpers + forced RLS policies).
  3. Expand supabase/seed.sql with CBSE XI-XII synthetic model, custom fields, and GoTrue accounts.
  4. Write supabase/tests/02_phase2_registry_and_academics_rls.test.sql and update tests/unit/sql-migration-invariants.test.ts.
  5. Verify local static checks, commit & push, watch live CI (app-quality, supabase-rls-pgtap, e2e-live-auth), fix any failure cleanly, and record CI run ID in docs.
SECURITY / PRIVACY / DATA RISKS:
  - Overly broad teacher/monitor visibility or custom field leakage: mitigated via relationship-scoped app_auth helpers, sensitivity-checked custom_field_values RLS, zero confidential access for teachers/monitors, and read-only enforcement for monitors.
  - Cross-tenant joins or duplicate active sessions/rolls: mitigated via composite (institution_id, id) FKs and partial unique indexes.
ACCEPTANCE CRITERIA:
  - All 26 public tables enforce ENABLE + FORCE ROW LEVEL SECURITY.
  - All 56+ live pgTAP assertions (26 Phase 1 + 30 Phase 2), supabase db lint, 40/40 Vitest unit checks, Next.js build, and 10/10 Playwright E2E checks pass green in CI.
TESTS AND VERIFICATION: pnpm typecheck, pnpm lint, pnpm test, pnpm build, and GitHub Actions CI.
DOCUMENTATION TO UPDATE: docs/decisions/ADR-0003..0004, docs/ROADMAP.md, docs/PROJECT_STATUS.md, docs/README.md, docs/security/MULTI_TENANT_RLS_BASELINE.md, docs/architecture/ARCHITECTURE_OVERVIEW.md, CHANGELOG.md, docs/phase-plans/PHASE-02-MILESTONE-01-registry-academics-schema.md, docs/progress/MILESTONE-REPORT-P2-M01.md.
GIT COMMIT MESSAGE: feat(schema): add phase 2 registry, cbse academic structure, relationship rls and pgtap tests
PUSH TARGET: origin main
ROLLBACK / RECOVERY NOTES: Revert migration/doc commits cleanly prior to production usage; never rewrite published history.
DEPENDENCIES: Phase 1 Exit Gate complete.
NEXT MILESTONE: P2-M02 — Server-Only Phase 2 Registry & Academic Domain Services + School Workspace Directories & CBSE XI-XII Structure UI.
```

---

## Candidate Next Bounded Milestone (Proposed — Not Started)

```text
MILESTONE ID: P2-M02
PHASE: Phase 2 — Institutional registry and academic structure
TITLE: Phase 2 Server-Only Domain Services, People Directories & CBSE XI-XII Academic Structure UI
OBJECTIVE: Build server-only DTO services and RLS-verified Next.js institutional views under /t/[slug] for browsing and managing academic sessions, Senior Secondary classes/sections/streams/teaching groups, student/staff directories, guardian links, and sensitivity-respecting custom fields.
PRECONDITIONS: P2-M01 merged and live CI green across all 3 jobs.
```
