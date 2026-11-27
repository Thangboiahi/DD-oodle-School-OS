# Phase 2 — Milestone 04: Bulk Import Staging, CSV/XLSX Validation, Dry-Run Preview & Idempotent Commit Engine

```text
MILESTONE ID: P2-M04
PHASE: Phase 2 — Institutional registry and academic structure
TITLE: Bulk Import Staging, CSV/XLSX Validation, Dry-Run Preview & Idempotent Commit Engine
OBJECTIVE: Implement DD-oodle's staged Bulk Import Centre (Upload -> Data Type -> Map Columns -> Validate -> Detect Duplicates -> Dry-Run Preview -> Authorize -> Idempotent Commit -> Downloadable Report) for students, staff, and subject_enrolments, ensuring zero unreviewed direct spreadsheet overwrites.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §7.6, §8, §10.4, §11.4, §11.6, §15 Phase 2; Part B10-B13.
PRECONDITIONS: P2-M03 merged on main with CI Run 45993903529 green (59/59 Vitest unit + 58/58 pgTAP + 10/10 Playwright).
IN SCOPE:
  - Staging SQL migration (supabase/migrations/202611270007_bulk_import_staging.sql) & pgTAP RLS test (supabase/tests/03_import_staging_rls.test.sql): import_batches and import_rows with forced RLS, composite tenant FK, per-institution idempotency_key uniqueness, and updated sql-migration-invariants.test.ts (28 forced-RLS public tables).
  - Secure spreadsheet parsing & validation (lib/imports/{csv,spreadsheet,validators}.ts): RFC-4180 CSV parser + read-excel-file/node XLSX parser with 5 MB / 5,000-row / 60-col caps, CSV formula injection neutralization, Aadhaar rejection, and in-file/DB duplicate detection.
  - Server-only staging & commit DAL (server/imports/service.ts): imports.manage / people.manage checks, staged -> validated -> idempotent committed workflow (skipping errors/duplicates without overwrites), audit events, and formula-safe CSV reports.
  - Navigation, Server Actions, authenticated CSV download route, and compact UI under /t/[slug]/imports*.
  - Unit tests: tests/unit/imports-csv-and-validation.test.ts.
OUT OF SCOPE:
  - Phase 2 E2E exit-gate suite (P2-M05) or Phase 3 attendance/handbook tables.
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or weakening any RLS policy.
EXPECTED FILES / DOMAINS: supabase/{migrations,tests}/*, lib/imports/*, server/{imports,registry}/*, app/t/[slug]/imports/*, components/shell/*, lib/auth/navigation.ts, next.config.ts, package.json, tests/unit/*, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Spreadsheet CVE & formula injection: mitigated by read-excel-file (instead of vulnerable xlsx) and neutralizeCsvFormula() quoting leading =/+/-/@/\t/\r cells in exported CSV reports.
  - Direct overwrite or Aadhaar ingestion: mitigated by forced staging workflow committing only validation_status === "valid" rows, 23505 skip handling, and Aadhaar column/header rejection.
NEXT MILESTONE: P2-M05 — Phase 2 E2E Exit Gate Verification & Phase 2 Closure.
```
