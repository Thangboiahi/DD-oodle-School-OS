# DD-oodle Multi-Tenant RLS, Schema & Storage Baseline

> **Canonical References:** [`../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md`](../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md) (Part A §3.4, §4, §7.1, §11.3–§11.4), [`../decisions/ADR-0001-multi-tenant-database-strategy.md`](../decisions/ADR-0001-multi-tenant-database-strategy.md), [`../decisions/ADR-0002-person-identity-and-session-enrolment.md`](../decisions/ADR-0002-person-identity-and-session-enrolment.md)  
> **Milestone:** `P1-M03`

---

## 1. Schema Isolation & Private `app_auth` Helper Schema

- **Exposed API Schema (`supabase/config.toml`):** PostgREST exposes **only** `["public"]`.
- **Private Security Schema (`app_auth`):** Created in `202611270001_core_identity_and_tenancy.sql`, with `REVOKE ALL ON SCHEMA app_auth FROM PUBLIC, anon` and `GRANT USAGE ON SCHEMA app_auth TO authenticated`.
- **Helper Functions (`202611270002_rls_helpers_and_policies.sql`):**
  - `app_auth.current_person_id()`
  - `app_auth.active_institution_ids()`
  - `app_auth.has_institution_permission(p_institution_id uuid, p_permission text)`
  - `app_auth.can_read_person(p_person_id uuid)`
  - `app_auth.can_write_institution_storage(p_object_name text)`
- Every helper is declared `STABLE SECURITY DEFINER SET search_path = ''`, revoked from `PUBLIC, anon`, granted `EXECUTE` strictly to `authenticated`, and evaluates `auth.uid()` without reading user-editable `user_metadata`.

---

## 2. Mandatory RLS & Composite Tenant Foreign Keys

- All 7 core `public.*` tables (`persons`, `platform_operators`, `institutions`, `institution_memberships`, `institution_roles`, `role_assignments`, `audit_events`) enforce **both** `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- **Composite Tenant Foreign Keys:** `public.institution_memberships` and `public.institution_roles` expose `UNIQUE (institution_id, id)`. `public.role_assignments` references `(institution_id, membership_id)` and `(institution_id, role_id)` via composite foreign keys so cross-tenant membership-to-role pairing is structurally impossible at the SQL constraint level.
- **Time-Bound Authority Checks:** `app_auth.has_institution_permission()` verifies active membership, `role_assignments.status = 'active'`, `starts_at <= now() AND (ends_at IS NULL OR ends_at > now())`, active `institution_roles`, and JSONB permission match (`permissions ? p_permission OR permissions ? 'institution.*'`).
- **Platform vs Institution Separation:** `public.platform_operators` grants zero automatic read/write access to institutional tables (`institutions`, `institution_memberships`, `institution_roles`, `role_assignments`, `audit_events`).
- **Profile Update Privilege Restriction:** Direct `UPDATE` on `public.persons` is restricted via column grants to `(full_name, display_name, primary_email, primary_phone)` so authenticated users cannot alter `status` or `auth_user_id`.

---

## 3. Append-Only Audit Log (`public.audit_events`)

- `BEFORE UPDATE OR DELETE` trigger (`public.prevent_audit_event_mutation()`) raises an exception on any mutation attempt.
- RLS defines `SELECT` (requiring `audit.read`) and `INSERT` (requiring active institution membership and `actor_person_id = app_auth.current_person_id()`), with zero `UPDATE` or `DELETE` policies.

---

## 4. Private Storage Path-Prefix Isolation (`202611270003_private_storage_baseline.sql`)

- Bucket `institution-private` is configured with `public = false`, `10 MiB` file size limit, and an explicit MIME allowlist.
- `storage.objects` `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies (`TO authenticated`) require `(storage.foldername(name))[1]` to match an active institution UUID in `app_auth.active_institution_ids()`. Write operations additionally pass `app_auth.can_write_institution_storage(name)`, which regex-validates UUID format before checking `files.write` permission.

---

## 5. Next.js 16 SSR, Secret Key Separation & `proxy.ts`

- Client and SSR cookie clients (`lib/supabase/browser.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts`) use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only.
- Privileged server operations (`lib/supabase/admin.ts`) require `server-only`, enforce a `typeof window !== "undefined"` runtime block inside `getServerSupabaseSecretEnv()`, and use `SUPABASE_SECRET_KEY`.
- Root `proxy.ts` calls `updateSession()` (`supabase.auth.getClaims()`) when public env vars are configured and passes through gracefully when unconfigured so public/build routes run cleanly without secrets.
