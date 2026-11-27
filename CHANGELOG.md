# Changelog

All notable changes to the DD-oodle School OS repository are documented in this file.

The format follows dated, grouped entries (`Added`, `Changed`, `Fixed`, `Security`, `Documentation`, `Removed`) per `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` (Part D3).

## [Unreleased]

### Added
- `.gitignore` to exclude `.env*` secrets, Node/Next.js build artefacts, logs, OS/IDE files and local data exports.
- `.env.example` with placeholder variable names only for future Next.js and Supabase setup.

### Documentation
- `PROJECT_INSTRUCTIONS.md` — concise permanent operating rules derived from Part B of the master blueprint.
- `README.md` — project overview, planned prerequisites, environment variable index and canonical documentation links.
- `docs/README.md` — documentation index linking active governance, requirements, architecture, compliance, phase-plan and progress records.
- `docs/PROJECT_STATUS.md` — audited repository baseline, Phase 0 status, blockers/open decisions and `P1-M01` candidate next milestone.
- `docs/ROADMAP.md` — Phases 0–10 and future roadmap possibilities mapped to explicit status.
- `docs/requirements/REQUIREMENTS_INDEX_AND_REGISTERS.md` — Part A requirement index, Open Decisions Register (`OD-01`–`OD-05`) and Initial Risk Register.
- `docs/architecture/ARCHITECTURE_OVERVIEW.md` — separation of confirmed repository facts vs. approved baseline design.
- `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` — official reference register seeded from Part F URLs.
- `docs/phase-plans/PHASE-00-MILESTONE-01-governance-bootstrap.md` — Part E milestone plan for `P0-M01` and candidate definition for `P1-M01`.
- `docs/progress/MILESTONE-REPORT-P0-M01.md` — audit findings, files created, verification summary and open decisions.

### Security
- Enforced secret hygiene baseline via `.gitignore` and key-free `.env.example` before any application code or credentials exist.

## [0.0.1] - 2026-11-27

### Added
- `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` (v1.0.0) committed as the canonical product and technical handover baseline (`d7e0dc7`).
- Initial `README.md` placeholder (`# DD-oodle-School-OS`).
