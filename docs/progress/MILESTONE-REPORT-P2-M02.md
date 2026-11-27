# Milestone Report: P2-M02 — People Registry, Guardian Links, Admissions Basics & Custom Fields (Server DAL & UI)

- **Date:** 2026-11-27
- **Phase:** Phase 2 — Institutional Registry and Academic Structure (**In Progress**)
- **Milestone:** `P2-M02`
- **Status:** Local checks complete; awaiting live CI green confirmation

---

## 1. Summary of Changes

1. **Shared Registry Validation & Masking (`lib/registry/`):**
   - Added [`schemas.ts`](../../lib/registry/schemas.ts) with strict Zod schemas for student creation (rejecting unexpected Aadhaar properties via `.strict()`), student lifecycle transitions, staff creation, guardian linking, admission creation and controlled state transitions (`ALLOWED_ADMISSION_TRANSITIONS`), custom field definitions (`field_key` regex + non-empty select options), and `validateCustomFieldValue()`.
   - Added [`masking.ts`](../../lib/registry/masking.ts) exporting `filterAndMaskCustomFields()` (defense-in-depth hiding `confidential` unless `people.sensitive.read`/`institution.*` and hiding `restricted` unless `people.restricted.read`/`people.sensitive.read`/`institution.*`) and `maskExternalIdentifier()` (masking PEN/APAAR to last 4 characters unless full visibility is authorized).
2. **Server-Only Audit & Registry DAL (`server/`):**
   - Added [`server/audit/log.ts`](../../server/audit/log.ts) (`recordAuditEvent`) writing append-only audit entries via the caller's RLS-enforced client.
   - Added [`server/registry/service.ts`](../../server/registry/service.ts) (`import "server-only"`) implementing paginated RLS-enforced reads (`listStudents`, `getStudentDetail`, `listStaff`, `listAdmissions`, `listCustomFieldDefinitions`) and audited server-authorized mutations (`createStudentRecord`, `updateStudentLifecycle`, `linkStudentGuardian`, `createStaffRecord`, `createAdmissionApplication`, `transitionAdmissionStatus`, `upsertCustomFieldDefinition`, `upsertCustomFieldValue`) with `createSupabaseAdminClient()` strictly confined to post-authorization `resolveOrCreateGlobalPerson()`.
3. **Navigation, Components, Server Actions & Pages (`lib/auth/navigation.ts`, `components/registry/`, `app/t/[slug]/people/`):**
   - Updated [`lib/auth/navigation.ts`](../../lib/auth/navigation.ts) so `"People & Registry"` links to `/t/${slug}/people` while preserving zero Principal-only Governance/Audit links for Subject Teachers.
   - Added [`PeopleSubNav.tsx`](../../components/registry/PeopleSubNav.tsx), [`RegistryActionForm.tsx`](../../components/registry/RegistryActionForm.tsx), [`actions.ts`](../../app/t/[slug]/people/actions.ts), and compact responsive routes `/t/[slug]/people`, `/t/[slug]/people/students/[studentId]`, `/t/[slug]/people/staff`, `/t/[slug]/people/admissions`, and `/t/[slug]/people/custom-fields`.
4. **Unit Tests (`tests/unit/`):**
   - Added `registry-schemas.test.ts`, `registry-masking.test.ts`, and updated `safe-redirect-and-nav.test.ts`.

---

## 2. Verification Results

- Pending live GitHub Actions CI run verification after push to `main`.
