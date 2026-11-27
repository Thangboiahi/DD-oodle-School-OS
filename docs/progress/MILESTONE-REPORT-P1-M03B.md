# Milestone Report: P1-M03b — GitHub Actions CI Pipeline & Live Supabase pgTAP Verification Gate

**Date:** 2026-11-27  
**Phase:** Phase 1 — Foundation and Multi-Tenant Platform  
**Milestone:** `P1-M03b`  
**Status:** In Progress (CI workflow & pre-push SQL hardening committed; awaiting live GitHub Actions run confirmation)

---

## 1. Summary of Changes

1. **GitHub Actions CI Workflow (`.github/workflows/ci.yml`):**
   - Configured triggers for `push` (`main`), `pull_request` (`main`), and `workflow_dispatch`, minimal `contents: read` permissions, and branch concurrency cancellation.
   - Added `app-quality` job (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, zero empty docs folders & relative link verification).
   - Added `supabase-rls-pgtap` job (`supabase/setup-cli@v1`, `supabase start`, `supabase db reset`, `supabase test db`, `supabase db lint --schema public,app_auth --level error`, `if: always()` teardown `supabase stop --no-backup`).
2. **Pre-Push SQL / Seed / pgTAP Runtime Hardening:**
   - Guarded UUID regex check with `CASE WHEN ... THEN ... ELSE false END` in `app_auth.can_write_institution_storage` (`202611270003_private_storage_baseline.sql`) so malformed prefixes cleanly trigger RLS `42501` denial instead of `22P02` cast errors.
   - Added `SET LOCAL search_path = public, extensions;` in `supabase/seed.sql` and `supabase/tests/01_multi_tenant_rls.test.sql` plus explicit empty-string token columns on synthetic `auth.users` rows in `supabase/seed.sql`.

---

## 2. Verification Results

- Local checks (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`): Run on commit before push.
- Live GitHub Actions CI (`app-quality` + `supabase-rls-pgtap`): Pending live `gh run watch` update after push.
