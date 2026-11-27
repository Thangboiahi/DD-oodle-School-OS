# Milestone Report: P2-M04 — Bulk Import Staging, CSV/XLSX Validation, Dry-Run Preview & Idempotent Commit Engine

- **Date:** 2026-11-27
- **Phase:** Phase 2 — Institutional Registry and Academic Structure (**In Progress**)
- **Milestone:** `P2-M04`
- **Status:** **Complete**

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

- **Local Static, Unit & Build Checks (`aa09764`):**
  - `pnpm typecheck`: **Passed** (0 errors)
  - `pnpm lint`: **Passed** (0 errors, 0 warnings)
  - `pnpm test`: **Passed** (15 test files, **65/65** tests passed)
  - `pnpm build`: **Passed** (Next.js 16 production build including `/t/[slug]/imports`, `/t/[slug]/imports/[batchId]`, and `/t/[slug]/imports/[batchId]/report`)
  - Client boundary & docs hygiene: `0` `"use client"` imports of `@/server/*` or `SUPABASE_SECRET_KEY`, `xlsx` absent (`read-excel-file@9.3.20` installed), `0` empty dirs, `67` valid relative links.
- **Live GitHub Actions CI Run [`45997372362`](https://github.com/Thangboiahi/DD-oodle-School-OS/actions/runs/45997372362)** (commit `aa09764`):
  1. **Job 1 — `App Quality & Hygiene` (`140501808213`):** **PASS** (`47s` — typecheck, lint, **65/65** Vitest unit/SQL checks, Next.js build, docs hygiene)
  2. **Job 2 — `Supabase RLS & pgTAP Verification` (`140501806565`):** **PASS** (`1m41s` — `supabase start`, `supabase db reset`, **80/80** pgTAP assertions across 3 files, `supabase db lint`: `No schema errors found`)
  3. **Job 3 — `Live Multi-Tenant Auth & A11y E2E` (`140501808883`):** **PASS** (`2m54s` — **10/10** Playwright E2E/responsive/WCAG AA checks in `12.2s`)

---

## 3. Next Recommended Action

Proceed to **`P2-M05`** — Phase 2 E2E Exit Gate Verification & Phase 2 Closure.
