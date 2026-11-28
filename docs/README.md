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
- [`decisions/ADR-0005-two-layer-attendance-ledger-and-signoff.md`](decisions/ADR-0005-two-layer-attendance-ledger-and-signoff.md) — Accepted ADR: two-layer append-only attendance ledger, verification/sign-off states & disabled-by-default biometric posture.
- [`decisions/ADR-0006-category-partitioned-digital-student-handbook.md`](decisions/ADR-0006-category-partitioned-digital-student-handbook.md) — Accepted ADR: category- and visibility-scope-partitioned Digital Student Handbook enforced in PostgreSQL RLS.
- [`decisions/ADR-0007-record-bound-contextual-communication.md`](decisions/ADR-0007-record-bound-contextual-communication.md) — Accepted ADR: strictly record-bound contextual comments, scoped official notices, and formal parent enquiry cases.
- [`decisions/ADR-0008-unified-hybrid-assignments-and-handbook-seam.md`](decisions/ADR-0008-unified-hybrid-assignments-and-handbook-seam.md) — Accepted ADR: unified online/offline/MCQ assignments, normalized syllabus hierarchy, and Digital Handbook Phase 4 seam.
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
- [`phase-plans/PHASE-02-MILESTONE-03-academic-structure-and-allocations.md`](phase-plans/PHASE-02-MILESTONE-03-academic-structure-and-allocations.md) — Part E milestone plan for `P2-M03` (Academic Structure, CBSE Electives, Cross-Section Teaching Groups & Time-Bound Allocations).
- [`phase-plans/PHASE-02-MILESTONE-04-bulk-import-staging.md`](phase-plans/PHASE-02-MILESTONE-04-bulk-import-staging.md) — Part E milestone plan for `P2-M04` (Bulk Import Staging, CSV/XLSX Validation, Dry-Run Preview & Idempotent Commit Engine).
- [`phase-plans/PHASE-02-MILESTONE-05-exit-gate-e2e-verification.md`](phase-plans/PHASE-02-MILESTONE-05-exit-gate-e2e-verification.md) — Part E milestone plan for `P2-M05` (Phase 2 Exit Gate E2E, Relationship Privacy & Phase 2 Closure).
- [`phase-plans/PHASE-03-MILESTONE-01-attendance-leave-handbook-schema.md`](phase-plans/PHASE-03-MILESTONE-01-attendance-leave-handbook-schema.md) — Part E milestone plan for `P3-M01` (Phase 3 ADRs, Attendance, Leave & Digital Handbook Schema, Forced RLS & pgTAP Suite).
- [`phase-plans/PHASE-03-MILESTONE-02-attendance-verification-and-ledger-ui.md`](phase-plans/PHASE-03-MILESTONE-02-attendance-verification-and-ledger-ui.md) — Part E milestone plan for `P3-M02` (Student & Staff Attendance, Verification, Sign-Off, Audited Correction Ledger & Offline-Queue Sync).
- [`phase-plans/PHASE-03-MILESTONE-03-leave-notices-and-daily-summary.md`](phase-plans/PHASE-03-MILESTONE-03-leave-notices-and-daily-summary.md) — Part E milestone plan for `P3-M03` (Student & Staff Leave Workflows, Parent Attendance Notices & Verified Daily Class / Monitor Summary).
- [`phase-plans/PHASE-03-MILESTONE-04-digital-student-handbook-ui.md`](phase-plans/PHASE-03-MILESTONE-04-digital-student-handbook-ui.md) — Part E milestone plan for `P3-M04` (Digital Student Handbook with Strict Category & Visibility Privacy Controls).
- [`phase-plans/PHASE-03-MILESTONE-05-exit-gate-e2e-verification.md`](phase-plans/PHASE-03-MILESTONE-05-exit-gate-e2e-verification.md) — Part E milestone plan for `P3-M05` (Phase 3 Exit Gate E2E Verification & Phase 3 Closure).
- [`phase-plans/PHASE-04-MILESTONE-01-communication-planning-assignments-schema.md`](phase-plans/PHASE-04-MILESTONE-01-communication-planning-assignments-schema.md) — Part E milestone plan for `P4-M01` (Phase 4 ADRs, Communication, Academic Planning & Hybrid Assignments Core Schema, Forced RLS & pgTAP Suite).
- [`progress/MILESTONE-REPORT-P0-M01.md`](progress/MILESTONE-REPORT-P0-M01.md) — Audited completion report for Milestone `P0-M01`.
- [`progress/MILESTONE-REPORT-P1-M01.md`](progress/MILESTONE-REPORT-P1-M01.md) — Audited completion report for Milestone `P1-M01`.
- [`progress/MILESTONE-REPORT-P1-M02.md`](progress/MILESTONE-REPORT-P1-M02.md) — Audited completion report for Milestone `P1-M02`.
- [`progress/MILESTONE-REPORT-P1-M03.md`](progress/MILESTONE-REPORT-P1-M03.md) — Audited completion report for Milestone `P1-M03`.
- [`progress/MILESTONE-REPORT-P1-M03B.md`](progress/MILESTONE-REPORT-P1-M03B.md) — Audited completion report for Milestone `P1-M03b`.
- [`progress/MILESTONE-REPORT-P1-M04.md`](progress/MILESTONE-REPORT-P1-M04.md) — Audited completion report for Milestone `P1-M04`.
- [`progress/MILESTONE-REPORT-P1-M05.md`](progress/MILESTONE-REPORT-P1-M05.md) — Audited completion report & CI evidence for Milestone `P1-M05` (Phase 1 Complete).
- [`progress/MILESTONE-REPORT-P2-M01.md`](progress/MILESTONE-REPORT-P2-M01.md) — Completion report & CI verification evidence for Milestone `P2-M01`.
- [`progress/MILESTONE-REPORT-P2-M02.md`](progress/MILESTONE-REPORT-P2-M02.md) — Completion report & CI verification evidence for Milestone `P2-M02`.
- [`progress/MILESTONE-REPORT-P2-M03.md`](progress/MILESTONE-REPORT-P2-M03.md) — Completion report & verification record for Milestone `P2-M03`.
- [`progress/MILESTONE-REPORT-P2-M04.md`](progress/MILESTONE-REPORT-P2-M04.md) — Completion report & verification record for Milestone `P2-M04`.
- [`progress/MILESTONE-REPORT-P2-M05.md`](progress/MILESTONE-REPORT-P2-M05.md) — Audited completion report & CI Run `46087393787` evidence for Milestone `P2-M05` (Phase 2 Complete).
- [`progress/MILESTONE-REPORT-P3-M01.md`](progress/MILESTONE-REPORT-P3-M01.md) — Audited completion report & CI Run `46095870562` evidence for Milestone `P3-M01`.
- [`progress/MILESTONE-REPORT-P3-M02.md`](progress/MILESTONE-REPORT-P3-M02.md) — Audited completion report & CI Run `46097947497` evidence for Milestone `P3-M02`.
- [`progress/MILESTONE-REPORT-P3-M03.md`](progress/MILESTONE-REPORT-P3-M03.md) — Audited completion report & CI Run `46099916419` evidence for Milestone `P3-M03`.
- [`progress/MILESTONE-REPORT-P3-M04.md`](progress/MILESTONE-REPORT-P3-M04.md) — Audited completion report & CI Run `46101572764` evidence for Milestone `P3-M04`.
- [`progress/MILESTONE-REPORT-P3-M05.md`](progress/MILESTONE-REPORT-P3-M05.md) — Audited completion report & CI Run `46105679125` evidence for Milestone `P3-M05` (Phase 3 Complete).
- [`progress/MILESTONE-REPORT-P4-M01.md`](progress/MILESTONE-REPORT-P4-M01.md) — Completion report & verification record for Milestone `P4-M01`.

## Deferred `docs/` Folders (Per Blueprint Part D1)

To avoid empty placeholder directories, the following Part D1 folders are **not created yet** and will be added when their first real artefact is produced:

- `docs/integrations/` — External provider contracts (Study Buddy, WhatsApp Business, campus device gateway, UDISE+/APAAR).
- `docs/operations/` — Deployment, backup/recovery, monitoring and support runbooks.
