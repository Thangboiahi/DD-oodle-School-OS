# Milestone Report: P2-M04 — Bulk Import Staging, CSV/XLSX Validation, Dry-Run Preview & Idempotent Commit Engine

- **Date:** 2026-11-27
- **Phase:** Phase 2 — Institutional Registry and Academic Structure (**In Progress**)
- **Milestone:** `P2-M04`
- **Status:** **Verification Pending CI**

---

## 1. Summary of Changes

1. **Staging Database Schema & pgTAP Security Tests (`supabase/`):**
   - Added Migration 7 ([`202611270007_bulk_import_staging.sql`](../../supabase/migrations/202611270007_bulk_import_staging.sql)) creating `public.import_batches` (unique `(institution_id, idempotency_key)`) and `public.import_rows` (composite FK `(institution_id, batch_id)`) with `ENABLE` + `FORCE ROW LEVEL SECURITY` and policies restricted to `imports.manage` or `people.manage`.
   - Added [`03_import_staging_rls.test.sql`](../../supabase/tests/03_import_staging_rls.test.sql) (22 pgTAP assertions verifying forced RLS, cross-tenant denial, composite FK isolation, idempotency key scoping, and denial for `anon`, `dual.member`, `monitor.11a`, and `platform.ops`), and updated [`sql-migration-invariants.test.ts`](../../tests/unit/sql-migration-invariants.test.ts) to enforce all **28** forced-RLS public tables.
2. **Secure Parsers, Validators & Formula-Safe Export (`lib/imports/`):**
   - Installed `read-excel-file@9.3.20` (avoiding legacy `xlsx` CVEs) and configured `experimental.serverActions.bodySizeLimit: "6mb"` in [`next.config.ts`](../../next.config.ts).
   - Added [`csv.ts`](../../lib/imports/csv.ts) (RFC-4180 parser with BOM strip, 5 MB / 5,000-row / 60-col caps, and `neutralizeCsvFormula()` / `serializeCsvSafely()`), [`spreadsheet.ts`](../../lib/imports/spreadsheet.ts) (unified CSV + `readSheet` from `read-excel-file/node`), and [`validators.ts`](../../lib/imports/validators.ts) (mapping, Aadhaar header/column rejection, and in-file + DB duplicate detection for `students`, `staff`, and `subject_enrolments`).
3. **Server-Only Staging & Idempotent Commit DAL (`server/imports/service.ts`):**
   - Implemented [`service.ts`](../../server/imports/service.ts) (`import "server-only"`) gating every call on `imports.manage` or `people.manage`, executing all tenant operations via caller RLS, committing ONLY `validation_status === "valid"` rows idempotently (reusing post-authorization `resolveOrCreateGlobalPerson()` from [`server/registry/service.ts`](../../server/registry/service.ts) only for newly created person rows), and appending audit events.
4. **Navigation, Actions, Report Download & UI (`lib/auth/navigation.ts`, `app/t/[slug]/imports/`):**
   - Exposed `"Bulk Imports"` (`/t/${slug}/imports`) strictly for `imports.manage` / `people.manage` operators (hidden from `dual.member`, `monitor.11a`, `parent_guardian`).
   - Added [`actions.ts`](../../app/t/[slug]/imports/actions.ts), authenticated CSV download handler [`report/route.ts`](../../app/t/[slug]/imports/[batchId]/report/route.ts), upload/batch page [`page.tsx`](../../app/t/[slug]/imports/page.tsx), and dry-run stepper [`[batchId]/page.tsx`](../../app/t/[slug]/imports/[batchId]/page.tsx).
5. **Unit Tests (`tests/unit/`):**
   - Added [`imports-csv-and-validation.test.ts`](../../tests/unit/imports-csv-and-validation.test.ts) and updated [`safe-redirect-and-nav.test.ts`](../../tests/unit/safe-redirect-and-nav.test.ts).

---

## 2. Verification & Live CI Evidence

- **Local Static, Unit & Build Checks:** Pending post-edit run.
- **Live GitHub Actions CI:** Pending push and workflow run verification.

---

## 3. Next Recommended Action

Proceed to **`P2-M05`** — Phase 2 E2E Exit Gate Verification & Phase 2 Closure.
