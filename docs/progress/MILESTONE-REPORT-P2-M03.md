# Milestone Report: P2-M03 — Academic Structure, CBSE Electives, Cross-Section Teaching Groups & Time-Bound Allocations

- **Date:** 2026-11-27
- **Phase:** Phase 2 — Institutional Registry and Academic Structure (**In Progress**)
- **Milestone:** `P2-M03`
- **Status:** **Verification Pending CI**

---

## 1. Summary of Changes

1. **Academic Schemas & Pure Conflict Engine (`lib/academics/`):**
   - Added [`schemas.ts`](../../lib/academics/schemas.ts) with strict `.strict()` Zod schemas for sessions, terms, departments, grade/section creation, subject & stream-aware offerings, student session/subject enrolments, cross-section teaching groups, memberships, and `assignAcademicResponsibilitySchema` (enforcing `endsOn >= startsOn` and an exclusive single target per `assignmentType`).
   - Added [`conflicts.ts`](../../lib/academics/conflicts.ts) exporting `detectAcademicAssignmentConflicts()` (preventing overlapping active `class_teacher` or per-role `monitor`/`monitress` allocations on the same section, enforcing active-section student eligibility for monitors, while permitting concurrent teacher roles) and `validateCrossSectionGroupMembership()` (verifying active session + subject offering enrolment across mixed sections such as `XI-A` and `XI-B`).
2. **Server-Only Academic DAL (`server/academics/service.ts`):**
   - Created [`service.ts`](../../server/academics/service.ts) (`import "server-only"`) executing all reads (`getAcademicsOverview`, `getSectionDetail`, `listTeachingGroups`, `listAcademicAssignments`) and audited `academics.manage` mutations (`createSession`, `activateSession`, `createDepartment`, `createGradeAndSection`, `createSubjectAndOffering`, `enrolStudentInSession`, `enrolStudentInSubject`, `createTeachingGroup`, `addStudentToTeachingGroup`, `assignAcademicResponsibility`, `revokeAcademicResponsibility`) solely through `createSupabaseServerClient()` under full PostgreSQL RLS (zero admin client imports).
3. **Navigation, Components, Server Actions & Routes (`lib/auth/navigation.ts`, `components/`, `app/t/[slug]/academics/`):**
   - Updated [`navigation.ts`](../../lib/auth/navigation.ts), [`nav-config.ts`](../../components/shell/nav-config.ts), and [`AppShell.tsx`](../../components/shell/AppShell.tsx) to include `"Academics"` (`/t/${slug}/academics`) alongside `"People & Registry"`, keeping Principal-only Governance and Audit items hidden from non-Principals.
   - Added [`AcademicsSubNav.tsx`](../../components/academics/AcademicsSubNav.tsx), route-slug-verified [`actions.ts`](../../app/t/[slug]/academics/actions.ts), and compact responsive pages:
     - `/t/[slug]/academics` (Sessions, Terms, Departments + HODs, Grades & Sections, Streams, Subject Offerings)
     - `/t/[slug]/academics/sections/[sectionId]` (Class Teacher, Monitor/Monitress, monitor read-only scope banner, student roster with individual elective badges, enrolment & elective assignment forms)
     - `/t/[slug]/academics/teaching-groups` (Subject Teacher assignments, cross-section badges, section distribution chips, group creation & student allocation)
     - `/t/[slug]/academics/allocations` (Time-bound `academic_assignments` ledger, assignment form, and revocation controls)
4. **Unit Tests (`tests/unit/`):**
   - Added [`academics-conflicts.test.ts`](../../tests/unit/academics-conflicts.test.ts) and [`academics-schemas.test.ts`](../../tests/unit/academics-schemas.test.ts), and updated [`safe-redirect-and-nav.test.ts`](../../tests/unit/safe-redirect-and-nav.test.ts).

---

## 2. Verification & Live CI Evidence

- **Local Static, Unit & Build Checks:**
  - `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, client-boundary check, and docs hygiene pending post-edit run.
- **Live GitHub Actions CI:** Pending push and workflow run verification.

---

## 3. Next Recommended Action

Proceed to **`P2-M04`** — Initial Data Onboarding / Bulk Import Foundations & Phase 2 Verification Gate.
