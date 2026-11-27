# Phase 2 — Milestone 02: People Registry, Guardian Links, Admissions Basics & Custom Fields (Server DAL & UI)

```text
MILESTONE ID: P2-M02
PHASE: Phase 2 — Institutional registry and academic structure
TITLE: People Registry, Guardian Links, Admissions Basics & Custom Fields (Server DAL & UI)
OBJECTIVE: Implement DD-oodle's server-only People Registry, Guardian Relationship, Admissions-to-Enrolment Basics, and Custom Field Engine under /t/[slug]/people, with server-side permission checks, sensitive-field masking, append-only audit logging, compact responsive UI, and unit tests.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §6.1-§6.2, §7.1-§7.3, §10.4, §11.4, §12.1-§12.4; Part B10-B13; ADR-0002; ADR-0004.
PRECONDITIONS: P2-M01 merged on main with CI Run 45989069548 green (58/58 pgTAP + 10/10 E2E).
IN SCOPE:
  - Shared validation & masking (lib/registry/{schemas,masking}.ts): strict Zod schemas rejecting Aadhaar fields, admission transition checks, custom field value type/select validation, sensitivity filtering, and last-4 PEN/APAAR masking.
  - Server-only audit & registry DAL (server/audit/log.ts, server/registry/service.ts): paginated RLS-enforced reads, requireInstitutionPermission checks on route slug, append-only audit logging, and privileged persons lookup/creation strictly after people.manage authorization.
  - Responsive accessible UI & Server Actions (lib/auth/navigation.ts, components/registry/*, app/t/[slug]/people/*): Students roster & detail (guardians + grouped custom fields), Staff directory, Admissions pipeline -> Enrolled Student creation, and Custom Field definitions manager.
  - Unit tests: tests/unit/{registry-schemas,registry-masking}.test.ts and updated safe-redirect-and-nav.test.ts.
OUT OF SCOPE:
  - /t/[slug]/academics routes (P2-M03) or CSV/XLSX bulk import tooling (P2-M04).
  - Weakening any RLS policy or modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md.
EXPECTED FILES / DOMAINS: lib/registry/*, server/{audit,registry}/*, components/registry/*, app/t/[slug]/people/*, lib/auth/navigation.ts, tests/unit/*, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Client tampering of hidden institutionId or custom field sensitivity: mitigated by binding route slug into Server Actions, re-verifying requireInstitutionPermission, PostgreSQL RLS, and filterAndMaskCustomFields defense-in-depth.
  - Privilege escalation on unlinked persons creation: createSupabaseAdminClient() isolated solely to resolveOrCreateGlobalPerson() after requireInstitutionPermission(slug, { permission: "people.manage" }).
NEXT MILESTONE: P2-M03 — Academic Structure & CBSE Senior Secondary XI-XII Allocation Services & UI (/t/[slug]/academics).
```
