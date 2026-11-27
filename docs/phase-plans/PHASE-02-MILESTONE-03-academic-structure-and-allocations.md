# Phase 2 — Milestone 03: Academic Structure, CBSE Electives, Cross-Section Teaching Groups & Time-Bound Allocations

```text
MILESTONE ID: P2-M03
PHASE: Phase 2 — Institutional registry and academic structure
TITLE: Academic Structure, CBSE Electives, Cross-Section Teaching Groups & Time-Bound Allocations
OBJECTIVE: Implement the server-only Academic Structure & Allocation module under /t/[slug]/academics supporting CBSE Senior Secondary (Classes XI-XII): Sessions/Terms, Class-Band Departments (HODs), Grades/Sections, Streams, Subject Offerings, individual Student Subject Enrolments, Cross-Section Teaching Groups, and Time-Bound Staff/Class Teacher/Monitor Allocations with conflict checks, audit trails, compact responsive UI, and unit tests.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.2-§3.5, §6.3, §7.1, §12.1-§12.4, §15 Phase 2 exit gate; Part B10-B13; ADR-0003.
PRECONDITIONS: P2-M02 merged on main with CI Run 45991352879 green (49/49 Vitest unit + 58/58 pgTAP + 10/10 Playwright).
IN SCOPE:
  - Shared Zod schemas & pure conflict engine (lib/academics/{schemas,conflicts}.ts): date/scope validation for sessions, terms, departments, grades/sections, subjects/offerings, student session/subject enrolments, teaching groups, typed academic_assignments, detectAcademicAssignmentConflicts(), and validateCrossSectionGroupMembership().
  - Server-only Academic DAL (server/academics/service.ts): caller-RLS reads and requireInstitutionPermission(slug, { permission: "academics.manage" }) audited mutations (zero createSupabaseAdminClient() usage).
  - Navigation, components, Server Actions & App Router UI (lib/auth/navigation.ts, components/shell/*, components/academics/*, app/t/[slug]/academics/*): Structure Overview, Section Detail (with read-only Monitor banner & individual elective badges), Teaching Groups (cross-section badges & section mix breakdown), and Time-Bound Allocations ledger + revoke.
  - Unit tests: tests/unit/{academics-conflicts,academics-schemas}.test.ts and updated safe-redirect-and-nav.test.ts.
OUT OF SCOPE:
  - Bulk CSV/XLSX import staging (P2-M04) or Phase 3 attendance/lesson-plan modules.
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or weakening any RLS policy.
EXPECTED FILES / DOMAINS: lib/academics/*, server/academics/*, components/{academics,shell}/*, app/t/[slug]/academics/*, lib/auth/navigation.ts, tests/unit/*, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Cross-tenant or form-body institution tampering: mitigated by resolving active tenant context strictly from route [slug], re-checking academics.manage in every write service, executing all DB reads/writes through caller's RLS-enforced Supabase client, and recording append-only audit events.
  - Monitor privilege bleed: section page displays monitor read-only scope banner and renders management forms only when academics.manage is authorized.
NEXT MILESTONE: P2-M04 — Initial Data Onboarding / Bulk Import Foundations & Phase 2 Verification Gate.
```
