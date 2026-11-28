# DD-oodle Multi-Tenant RLS, Schema & Storage Baseline

> **Canonical References:** [`../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md`](../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md) (Part A §2.2–§2.4, §3.4, §4, §7.1, §11.3–§11.5, §12.5), [`../decisions/ADR-0001-multi-tenant-database-strategy.md`](../decisions/ADR-0001-multi-tenant-database-strategy.md), [`../decisions/ADR-0002-person-identity-and-session-enrolment.md`](../decisions/ADR-0002-person-identity-and-session-enrolment.md), [`../decisions/ADR-0003-academic-structure-and-typed-assignments.md`](../decisions/ADR-0003-academic-structure-and-typed-assignments.md), [`../decisions/ADR-0004-normalized-custom-field-engine.md`](../decisions/ADR-0004-normalized-custom-field-engine.md)

> **Milestones:** `P1-M03`, `P1-M04`, `P2-M01`, `P2-M04`, `P2-M05`, `P3-M01`

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
- Root `proxy.ts` calls `updateSession()` (`supabase.auth.getClaims()`) when public env vars are configured and passes through gracefully when unconfigured so public/build routes run cleanly without secrets. It also strips client-supplied `x-dd-oodle-tenant-hint` headers and forwards parsed subdomain hints strictly as untrusted routing hints (`OD-03`).

---

## 6. Server-Only Auth DAL, Tenant Resolver, Permission Engine & Platform Boundary (`P1-M04`)

- **Server-Only Data Access (`server/`):** Every module under `server/` (`auth/types.ts`, `auth/session.ts`, `auth/guards.ts`, `tenancy/resolve-context.ts`) starts with `import "server-only";`, authenticates solely via `supabase.auth.getClaims()` (never trusting `getSession()` on the server), and queries PostgreSQL exclusively via the RLS-enforced user client (`createSupabaseServerClient()`).
- **Non-Enumerating Tenant Context Resolution (`resolveVerifiedTenantContext`):** Slug routing hints are verified against PostgreSQL `institution_memberships` for the authenticated person. Nonexistent slugs and unauthorized institutions return an identical `{ status: "denied" }` state to avoid tenant enumeration.
- **Scoped, Time-Bound Permission Engine (`evaluatePermission`):** Evaluates `membershipStatus === "active"`, `roleIsActive === true`, `assignment.status === "active"`, `startsAt <= now && (endsAt === null || endsAt > now)`, `"institution.*"` vs exact permission strings, and scope hierarchy (`institution` satisfies narrower scopes; otherwise matches `scopeType` and `scopeRefId`). Platform operator status is ignored and grants zero institutional authority.
- **Strict Platform Separation (`requirePlatformOperator`):** `/platform` verifies `platform_operators.status === "active"` independently from institutional Principal/admin roles, reinforcing PostgreSQL RLS isolation.
- **Open-Redirect Protection & PWA Cache Isolation:** `sanitizeNextPath()` permits internal single-slash paths only (excluding `//`, external origins, scripts, control chars, and `/auth/sign-out`). Both `WorkspaceSwitcher` and `SignOutButton` invoke `clearPwaCaches()` before context transitions or `POST /auth/sign-out` so cached tenant responses cannot persist across institution switches or sign-out.

---

## 7. Phase 2 Registry, Academic Structure, Relationship & Sensitivity RLS (`P2-M01`)

- **26 Forced-RLS Tables (`202611270004`–`202611270006`):** All 19 new Phase 2 tables (`student_profiles`, `staff_profiles`, `student_guardians`, `admission_applications`, `custom_field_definitions`, `custom_field_values`, `academic_sessions`, `academic_terms`, `academic_departments`, `grade_levels`, `sections`, `streams`, `subjects`, `subject_offerings`, `student_session_enrolments`, `student_subject_enrolments`, `teaching_groups`, `teaching_group_memberships`, `academic_assignments`) enforce `ENABLE` + `FORCE ROW LEVEL SECURITY` and expose `UNIQUE (institution_id, id)` composite tenant keys so cross-tenant links fail with PostgreSQL `23503`.
- **Private Relationship & Sensitivity Helpers (`app_auth`):**
  - `app_auth.can_access_student_profile(p_institution_id, p_student_profile_id)` derives access strictly from active institution membership plus `people.read`, student self, active `student_guardians`, or active time-valid `academic_assignments` (`hod` by grade department, `class_teacher`/`monitor`/`monitress` by active section, or `subject_teacher` by active teaching group membership including cross-section groups).
  - `app_auth.can_read_custom_field(...)` + `app_auth.custom_field_sensitivity(...)` isolate `confidential` fields to `people.sensitive.read` (and writes to `people.manage` + `people.sensitive.write`), `restricted` fields to `people.restricted.read`/`people.sensitive.read`, and `standard` fields to authorized readers/scoped student/staff self.
- **Monitor/Monitress Read-Only Boundary & Platform Separation:** `monitor`/`monitress` assignments receive scoped read-only access inside `XI-A`, zero access to `confidential` custom fields, and zero write permissions; `platform_operators` retain zero automatic read/write access across all 19 Phase 2 tables.

---

## 8. Staged Bulk Import Security & Formula Neutralization (`P2-M04`)

- **28 Forced-RLS Tables (`202611270007_bulk_import_staging.sql`):** `public.import_batches` (unique `(institution_id, idempotency_key)`) and `public.import_rows` (composite FK `(institution_id, batch_id) ON DELETE CASCADE`) enforce `ENABLE` + `FORCE ROW LEVEL SECURITY` with policies restricted to `imports.manage` or `people.manage` (`0` access for `anon`, Subject Teachers, Guardians, Monitors, and `platform_operators`).
- **Parser Caps, Privacy & Formula Neutralization (`lib/imports/`):** Spreadsheets enforce 5 MB byte limit, 5,000 data row limit, 60-column limit, Aadhaar column/header rejection (`/aadha?r/i`), and `CWE-1236` formula neutralization (`neutralizeCsvFormula`) on all downloadable CSV reports.
- **Idempotent Non-Overwriting Commit (`server/imports/service.ts`):** Requires `validated` batches with `valid_rows > 0`, skips errors and duplicates without overwriting existing DB records, guards `resolveOrCreateGlobalPerson()` strictly post-authorization, and records append-only audit events.

---

## 9. Relationship-Scoped `public.persons` Directory RLS (`P2-M05`)

- **Migrations `0008` & `0009` (`app_auth.can_read_person_profile(p_person_id uuid)`):** `STABLE SECURITY DEFINER SET search_path = ''` helper (revoked from `PUBLIC, anon`; `EXECUTE` granted solely to `authenticated`) powering `persons_select_relationship_scoped` on `public.persons`. Returns `true` only when the caller holds an active institutional membership and the target `person_id` resolves within that same institution via:
  - an accessible `student_profiles` row via `app_auth.can_access_student_profile(sp.institution_id, sp.id)` (covering Principal/admin, HOD, Class Teacher, Subject Teacher teaching groups, Guardians, and Section Monitors),
  - an institutional `staff_profiles` or active `student_guardians` link when the caller holds `people.read` or `academics.manage`, or
  - an active date-valid staff leadership/teaching row in `academic_assignments` strictly restricted (`Migration 0009`) to `assignment_type IN ('hod', 'class_teacher', 'subject_teacher')` (explicitly excluding student `'monitor'`/`'monitress'` rows so monitor visibility remains section-scoped).
- **88-Assertion pgTAP Gate:** Verified live across `01_multi_tenant_rls.test.sql` (26), `02_phase2_registry_and_academics_rls.test.sql` (40), and `03_import_staging_rls.test.sql` (22) confirming cross-tenant denial and `platform_operators` seeing strictly their own single `persons` row.

---

## 10. Phase 3 Attendance, Leave, Notices & Digital Student Handbook RLS (`P3-M01`)

- **36 Forced-RLS Public Tables (`202611280001`–`202611280003`):** All 8 new Phase 3 tables (`attendance_policies`, `attendance_events`, `student_daily_attendance`, `student_period_attendance`, `staff_daily_attendance`, `leave_applications`, `parent_attendance_notices`, `handbook_entries`) enforce `ENABLE` + `FORCE ROW LEVEL SECURITY` and composite `(institution_id, id)` tenant foreign keys.
- **Append-Only Attendance Ledger & Biometric Exclusion (`ADR-0005`):** `public.attendance_events` defines `BEFORE UPDATE OR DELETE` trigger `public.prevent_attendance_event_mutation()`, zero `UPDATE`/`DELETE` policies, `UNIQUE (institution_id, idempotency_key)`, and mandatory `reason` when `event_type = 'correction'`. `attendance_policies.biometric_enabled` defaults to `false` with zero raw biometric templates stored in cloud.
- **Role/Monitor & Category Handbook Helpers (`app_auth`):**
  - `app_auth.is_section_class_teacher_or_hod(uuid, uuid)`, `app_auth.is_section_monitor(uuid, uuid)`, and `app_auth.is_teaching_group_teacher(uuid, uuid)` restrict `student_daily_attendance` reads for `monitor`/`monitress` strictly to `verification_status IN ('class_teacher_verified', 'signed_off')` (never `draft`, never leave, never handbook).
  - `app_auth.can_read_handbook_entry(uuid, uuid, text, text, uuid, uuid)` enforces `visibility_scope` partitioning (`leadership_only`, `class_teacher_and_leadership`, `staff_academic`, `student_and_guardian`) and restricts `subject_teacher` access strictly to `academic_observation` rows in their active `teaching_group_id`.
- **41-Assertion Phase 3 pgTAP Suite (`04_phase3_attendance_leave_handbook_rls.test.sql`):** Verifies 129 total pgTAP assertions across 4 suites (pending CI run).
