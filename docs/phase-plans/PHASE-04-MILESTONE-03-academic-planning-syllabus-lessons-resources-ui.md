# Phase 4 — Milestone 03: Academic Planning, Syllabus Hierarchy, Lesson Plans, Learning Resources & Oversight DAL + UI

```text
MILESTONE ID: P4-M03
PHASE: Phase 4 — Structured communication and academic planning
TITLE: Academic Planning, Syllabus Hierarchy & Progress Tracking, Lesson Plans, Subject Learning Resources & HOD/Class Teacher Oversight — Server DAL + UI
OBJECTIVE: Build the pure planning domain rules/schemas, caller-RLS server-only Academic Planning DAL, Server Actions, and 4 compact WCAG 2.0/2.1 AA responsive routes under /t/[slug]/planning* enforcing CBSE Syllabus Hierarchy (Unit -> Chapter -> Topic), role-scoped progress updates, staff-only internal lesson plans, private/external subject resources, and HOD/Class Teacher pacing oversight.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.3-§3.5, §4.1-§4.3, §6.6-§6.7, §11.4, §12.1-§12.5, §15 Phase 4; ADR-0008.
PRECONDITIONS: P4-M02 live-verified green on main (4a46d8f, CI Run 46116183736 with 101/101 Vitest, 178/178 pgTAP + clean db lint, and 20/20 Playwright across 45 forced-RLS public tables).
IN SCOPE:
  - Pure schemas & rules (lib/planning/{schemas,rules}.ts): academic term lifecycle transitions, syllabus Unit -> Chapter -> Topic parent-kind enforcement, deterministic syllabus tree & progress rollup calculation, safe http(s) URL filtering, role-based access matrix (Leadership vs HOD vs Class Teacher vs Subject Teacher vs Student/Guardian/Monitor), and learning resource status state machine.
  - Caller-RLS server-only DAL (server/planning/service.ts with import "server-only"): zero admin client imports, batched fetchPersonNameMap() lookups, signed URLs for institution-private storage keys, term/syllabus/lesson/resource mutations with metadata-only audit_events, and aggregated oversight queries.
  - Navigation, sub-nav & 4 WCAG AA responsive routes: Planning workspace nav link, PlanningSubNav, /t/[slug]/planning (Syllabus & Terms), /t/[slug]/planning/lessons (strict permission-denied for students/guardians/monitors), /t/[slug]/planning/resources (scoped links & storage refs), and /t/[slug]/planning/oversight (strict permission-denied outside Leadership/HOD/Class Teacher).
  - Unit tests in tests/unit/planning-rules.test.ts and updated tests/unit/safe-redirect-and-nav.test.ts.
OUT OF SCOPE:
  - Hybrid online/offline/MCQ Assignments UI, submission grading, or Phase 4 Digital Handbook seam wiring (scheduled in P4-M04).
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or weakening RLS / pgTAP / Playwright checks.
EXPECTED FILES / DOMAINS: lib/planning/*, server/planning/service.ts, app/t/[slug]/planning/*, components/planning/PlanningSubNav.tsx, components/shell/{nav-config,AppShell}.tsx, lib/auth/navigation.ts, tests/unit/{planning-rules,safe-redirect-and-nav}.test.ts, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Student, Guardian, or Monitor inspecting staff-internal lesson plans or oversight delay reasons: blocked in both DAL/UI permission guards and PostgreSQL RLS.
  - Class Teacher or non-assigned HOD modifying another teacher's lesson plans or syllabus progress: restricted by writableTeachingGroupIds/manageableOfferingIds scoping and PostgreSQL RLS.
  - Unsafe javascript:/data: external resource URLs: rejected by Zod refinement and isSafeHttpUrl().
NEXT MILESTONE: P4-M04 — Unified Hybrid Assignments, MCQ/File Submissions, Grading & Digital Handbook Phase 4 Seam Wiring.
```
