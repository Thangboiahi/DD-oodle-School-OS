# DD-oodle Documentation Index

This directory contains the living operational, architectural, governance, compliance and progress records for DD-oodle.

> **Canonical Product & Architecture Baseline:** [`../DD-oodle_MASTER_PROJECT_BLUEPRINT.md`](../DD-oodle_MASTER_PROJECT_BLUEPRINT.md) (v1.0.0).  
> All documents here supplement—never duplicate—the master blueprint.

## Root Governance & Overview Files

- [`../DD-oodle_MASTER_PROJECT_BLUEPRINT.md`](../DD-oodle_MASTER_PROJECT_BLUEPRINT.md) — Authoritative product handover, architecture baseline, roadmap, Part B instructions and Part F reference links.
- [`../PROJECT_INSTRUCTIONS.md`](../PROJECT_INSTRUCTIONS.md) — Concise permanent operating rules for Gemini and coding agents.
- [`../README.md`](../README.md) — Repository overview, prerequisites, environment variable index, scripts and links.
- [`../CHANGELOG.md`](../CHANGELOG.md) — Dated changelog grouped by category.

## Active `docs/` Records

- [`PROJECT_STATUS.md`](PROJECT_STATUS.md) — Current audited repository state, phase/milestone status, verification results, blockers and next bounded milestone.
- [`ROADMAP.md`](ROADMAP.md) — Phase-by-phase status mapping (Phases 0–10 and Future Roadmap Possibilities).
- [`requirements/REQUIREMENTS_INDEX_AND_REGISTERS.md`](requirements/REQUIREMENTS_INDEX_AND_REGISTERS.md) — Part A requirements index, Approved Decisions (`OD-01`–`OD-05`) and Initial Risk Register.
- [`requirements/DOMAIN_GLOSSARY.md`](requirements/DOMAIN_GLOSSARY.md) — Canonical definitions for core DD-oodle domain entities and boundaries.
- [`decisions/ADR-0001-multi-tenant-database-strategy.md`](decisions/ADR-0001-multi-tenant-database-strategy.md) — Accepted ADR: shared Supabase PostgreSQL, RLS, Mumbai region & routing hint boundary.
- [`decisions/ADR-0002-person-identity-and-session-enrolment.md`](decisions/ADR-0002-person-identity-and-session-enrolment.md) — Accepted ADR: global person identity, concurrent memberships & 3-layer session enrolment.
- [`decisions/ADR-0003-academic-structure-and-typed-assignments.md`](decisions/ADR-0003-academic-structure-and-typed-assignments.md) — Accepted ADR: separated CBSE Senior Secondary academic structure, cross-section teaching groups & typed `academic_assignments`.
- [`decisions/ADR-0004-normalized-custom-field-engine.md`](decisions/ADR-0004-normalized-custom-field-engine.md) — Accepted ADR: normalized core registries paired with sensitivity-enforced custom field definitions/values.
- [`architecture/ARCHITECTURE_OVERVIEW.md`](architecture/ARCHITECTURE_OVERVIEW.md) — Confirmed repository facts separated from approved baseline / proposed system design.
- [`testing/TEST_STRATEGY.md`](testing/TEST_STRATEGY.md) — Testing pyramid, RLS cross-tenant denial gates and verification standards.
- [`security/MULTI_TENANT_RLS_BASELINE.md`](security/MULTI_TENANT_RLS_BASELINE.md) — Private `app_auth` helpers, forced RLS policies, composite tenant FKs, audit immutability, private Storage isolation, server-only auth DAL & permission engine.
- [`ui-ux/DESIGN_SYSTEM_AND_PWA.md`](ui-ux/DESIGN_SYSTEM_AND_PWA.md) — Design system tokens (`Clarity`, `Calm`, `Focus`), density, 4-mode responsive shell, accessibility rules and PWA boundaries.
- [`compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md`](compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md) — Official source & regulatory research register seeded from Part F.
- [`phase-plans/PHASE-00-MILESTONE-01-governance-bootstrap.md`](phase-plans/PHASE-00-MILESTONE-01-governance-bootstrap.md) — Part E milestone plan for `P0-M01`.
- [`phase-plans/PHASE-01-MILESTONE-01-foundation-and-core-adrs.md`](phase-plans/PHASE-01-MILESTONE-01-foundation-and-core-adrs.md) — Part E milestone plan for `P1-M01`.
- [`phase-plans/PHASE-01-MILESTONE-02-design-system-shell-pwa.md`](phase-plans/PHASE-01-MILESTONE-02-design-system-shell-pwa.md) — Part E milestone plan for `P1-M02`.
- [`phase-plans/PHASE-01-MILESTONE-03-supabase-schema-rls-storage.md`](phase-plans/PHASE-01-MILESTONE-03-supabase-schema-rls-storage.md) — Part E milestone plan for `P1-M03`.
- [`phase-plans/PHASE-01-MILESTONE-03B-ci-and-live-pgtap-gate.md`](phase-plans/PHASE-01-MILESTONE-03B-ci-and-live-pgtap-gate.md) — Part E milestone plan for `P1-M03b` (GitHub Actions CI & live pgTAP gate).
- [`phase-plans/PHASE-01-MILESTONE-04-auth-workspace-tenancy.md`](phase-plans/PHASE-01-MILESTONE-04-auth-workspace-tenancy.md) — Part E milestone plan for `P1-M04`.
- [`phase-plans/PHASE-01-MILESTONE-05-exit-gate-e2e-verification.md`](phase-plans/PHASE-01-MILESTONE-05-exit-gate-e2e-verification.md) — Part E milestone plan for `P1-M05` (Phase 1 exit gate E2E & Phase 1 closure) and candidate `P2-M01` overview.
- [`phase-plans/PHASE-02-MILESTONE-01-registry-academics-schema.md`](phase-plans/PHASE-02-MILESTONE-01-registry-academics-schema.md) — Part E milestone plan for `P2-M01` (Phase 2 ADRs, 19-table registry & CBSE XI–XII schema, relationship/sensitivity RLS & pgTAP suite).
- [`phase-plans/PHASE-02-MILESTONE-02-people-registry-and-custom-fields.md`](phase-plans/PHASE-02-MILESTONE-02-people-registry-and-custom-fields.md) — Part E milestone plan for `P2-M02` (People Registry, Guardian Links, Admissions Basics & Custom Fields DAL + UI).
- [`progress/MILESTONE-REPORT-P0-M01.md`](progress/MILESTONE-REPORT-P0-M01.md) — Audited completion report for Milestone `P0-M01`.
- [`progress/MILESTONE-REPORT-P1-M01.md`](progress/MILESTONE-REPORT-P1-M01.md) — Audited completion report for Milestone `P1-M01`.
- [`progress/MILESTONE-REPORT-P1-M02.md`](progress/MILESTONE-REPORT-P1-M02.md) — Audited completion report for Milestone `P1-M02`.
- [`progress/MILESTONE-REPORT-P1-M03.md`](progress/MILESTONE-REPORT-P1-M03.md) — Audited completion report for Milestone `P1-M03`.
- [`progress/MILESTONE-REPORT-P1-M03B.md`](progress/MILESTONE-REPORT-P1-M03B.md) — Audited completion report for Milestone `P1-M03b`.
- [`progress/MILESTONE-REPORT-P1-M04.md`](progress/MILESTONE-REPORT-P1-M04.md) — Audited completion report for Milestone `P1-M04`.
- [`progress/MILESTONE-REPORT-P1-M05.md`](progress/MILESTONE-REPORT-P1-M05.md) — Audited completion report & CI evidence for Milestone `P1-M05` (Phase 1 Complete).
- [`progress/MILESTONE-REPORT-P2-M01.md`](progress/MILESTONE-REPORT-P2-M01.md) — Completion report & CI verification evidence for Milestone `P2-M01`.
- [`progress/MILESTONE-REPORT-P2-M02.md`](progress/MILESTONE-REPORT-P2-M02.md) — Completion report & CI verification evidence for Milestone `P2-M02`.

## Deferred `docs/` Folders (Per Blueprint Part D1)

To avoid empty placeholder directories, the following Part D1 folders are **not created yet** and will be added when their first real artefact is produced:

- `docs/integrations/` — External provider contracts (Study Buddy, WhatsApp Business, campus device gateway, UDISE+/APAAR).
- `docs/operations/` — Deployment, backup/recovery, monitoring and support runbooks.
