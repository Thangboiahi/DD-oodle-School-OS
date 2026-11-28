# Phase 2 — Milestone 05: Exit Gate Live CBSE XI–XII E2E, Relationship Privacy, Staged Import, Responsive/WCAG AA Audit & Phase 2 Closure

```text
MILESTONE ID: P2-M05
PHASE: Phase 2 — Institutional registry and academic structure
TITLE: Phase 2 Exit Gate: Live CBSE XI-XII E2E, Relationship Privacy, Staged Import E2E, Responsive/WCAG AA Audit & Phase 2 Closure
OBJECTIVE: Verify the complete Phase 2 Exit Gate live against Supabase Auth + PostgREST + Next.js in GitHub Actions CI, fix any genuine UI/RLS/a11y/overflow defect surfaced without weakening security or RLS, harden CI Supabase CLI provisioning, and formally mark Phase 2 Complete in docs/ROADMAP.md after all 3 CI jobs pass green.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3, §6-§8, §11.4-§11.6, §12.3-§12.4, §15 Phase 2 exit gate & Phase 3 overview, §17.3, §17.5; Part B10-B13; Part D; Part E; ADR-0003; ADR-0004.
PRECONDITIONS: P2-M01 through P2-M04 committed on main (through 5efdd79) with 28 forced-RLS public tables, People Registry, CBSE Senior Secondary Academics, and Staged Bulk Import engine operational.
IN SCOPE:
  - Live Phase 2 E2E exit-gate suite (tests/e2e/phase2-registry-and-cbse-academics.spec.ts) with E2E_REQUIRE_SUPABASE=true fail-fast guard covering 5 scenarios:
    1. Principal CBSE XI-XII reference model, cross-section TG-XI-APPMATH-1, allocations, Sunrise-only roster, and confidential counseling_note visibility.
    2. Staged 3-row CSV bulk import (1 valid ADM-E2E-9001, 1 duplicate ADM-SR-2026-001, 1 invalid missing name) -> dry-run preview -> valid-only commit -> authenticated 200 text/csv Cache-Control: no-store report -> roster check.
    3. Dual Member relationship-scoped TG-XI-APPMATH-1 isolation, confidential custom-field redaction, /t/sunrise-cbse/imports denial, and WorkspaceSwitcher transition to Valley guardian ward Kabir Rao.
    4. Monitor XI-A read-only coordination view, zero management/edit forms, confidential redaction, and /t/sunrise-cbse/imports denial.
    5. 4-viewport (1280x800, 820x1180, 390x844, 844x390) horizontal overflow audit and WCAG 2.0/2.1 AA axe-core scan across /people, /academics, /academics/teaching-groups, and /imports.
  - Real defects surfaced by live CI and fixed cleanly without weakening security:
    1. Relationship-scoped public.persons SELECT RLS (Migrations 0008 + 0009: app_auth.can_read_person_profile(uuid) with rule (c) strictly limited to staff 'hod'/'class_teacher'/'subject_teacher' assignments).
    2. PostgREST PGRST201 ambiguous embed on academic_assignments -> persons (replaced in server/academics/service.ts with direct academic_assignments queries, explicit error surfacing, caller-RLS fetchPersonNameMap() batch lookup, and pure resolveSectionRoleAssignments()).
    3. Canonical WCAG AA CSS token alignment on app/t/[slug]/imports* and test/selector alignment in phase2-registry-and-cbse-academics.spec.ts.
  - CI rate-limit hardening (.github/workflows/ci.yml): upgrade supabase/setup-cli@v1 (latest) -> supabase/setup-cli@v3 (version: ^2) across supabase-rls-pgtap and e2e-live-auth.
  - Formal Phase 2 Closure across docs/ROADMAP.md, docs/PROJECT_STATUS.md, docs/security/MULTI_TENANT_RLS_BASELINE.md, docs/testing/TEST_STRATEGY.md, docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md, docs/README.md, CHANGELOG.md, and README.md.
OUT OF SCOPE:
  - Phase 3 Attendance, Leave & Digital Student Handbook schema or UI implementation (awaits Product Owner kick-off).
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or weakening any RLS policy.
EXPECTED FILES / DOMAINS: tests/e2e/phase2-registry-and-cbse-academics.spec.ts, playwright.config.ts, app/t/[slug]/imports/*, supabase/migrations/202611270008..202611270009, supabase/tests/02_phase2_registry_and_academics_rls.test.sql, lib/academics/conflicts.ts, server/academics/service.ts, tests/unit/academics-conflicts.test.ts, .github/workflows/ci.yml, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Over-broad persons directory exposure via monitor rows in academic_assignments: resolved in Migration 0009 restricting rule (c) strictly to staff ('hod', 'class_teacher', 'subject_teacher') and keeping monitor visibility scoped via can_access_student_profile.
  - Silent failure of PostgREST ambiguous joins masking missing assignments: eliminated via batch fetchPersonNameMap() and explicit error throwing.
CANDIDATE NEXT MILESTONE: P3-M01 — Phase 3 Attendance, Leave & Digital Student Handbook Core Schema, Forced RLS & pgTAP Suite (awaiting Product Owner kick-off).
```
