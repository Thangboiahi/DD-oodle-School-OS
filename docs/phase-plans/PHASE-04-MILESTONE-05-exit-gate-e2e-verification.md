# Phase 4 — Milestone 05: Exit Gate Live Communication, Planning, Assignments & Handbook E2E Verification, Responsive/WCAG AA Audit & Phase 4 Closure

```text
MILESTONE ID: P4-M05
PHASE: Phase 4 — Structured communication and academic planning
TITLE: Phase 4 Exit Gate: Live Multi-Role Communication, Academic Planning, Hybrid Assignments & Handbook E2E Verification, Responsive/WCAG AA Audit & Phase 4 Closure
OBJECTIVE: Verify the complete Phase 4 Exit Gate live against Supabase Auth + PostgREST + Next.js in GitHub Actions CI, fix any genuine access-boundary, UI, or WCAG 2.0/2.1 AA defect surfaced without weakening security or RLS, and formally mark Phase 4 Complete in docs/ROADMAP.md after all 3 CI jobs pass green.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §5, §6.5-§6.7, §15 Phase 4 exit gate & Phase 5 overview; Part B13; Part D; Part E; ADR-0007; ADR-0008.
PRECONDITIONS: P4-M01 through P4-M04 live-verified on main (through 371d4ed / CI Run 46120075849) with 45 forced-RLS public tables across 16 SQL migrations, Structured Communication, Academic Planning, Unified Hybrid Assignments, and live Digital Student Handbook Phase 4 wiring operational.
IN SCOPE:
  - Live Phase 4 Exit-Gate E2E suite (tests/e2e/phase4-communication-planning-assignments.spec.ts) with E2E_REQUIRE_SUPABASE=true fail-fast guard covering 5 scenarios:
    1. Subject Teacher independent publishing, planning & hybrid assignments (dual.member in sunrise-cbse): notice scope restricted to teaching_group (zero institution option), offline notice cache persistence (dd-oodle:offline-notices:sunrise-cbse), contextual notice record comment, seeded APP-MATH delayed syllabus reason verification, lesson plan creation, teaching_group learning resource publishing, oversight permission denial, published auto_mcq quiz creation, Aarav offline notebook completion, and seeded assignment evaluation with remarks.
    2. Class Teacher oversight, read-only views, internal staff notes & enquiry triage (classteacher.11a.sunrise): Subject Progress Rollup and Delayed Items watchlist, read-only lesson plans and assignment metrics (zero write buttons), seeded internal staff note visibility on Aarav's enquiry, posting a new staff-only internal note, and resolving the enquiry with mandatory resolution summary.
    3. Guardian isolation, notice acknowledgement, learner MCQ answer-key protection & live Handbook Phase 4 wiring: dual.member in valley-cbse sees ONLY Kabir Rao enquiries (zero Sunrise enquiries/internal notes), submits new Valley enquiry, sees ONLY Valley notices and executes notice acknowledgement; student.11b.sunrise (Rohan Sen) inspects published auto_mcq quiz with zero leaked correctOptionIndex/correctIndex in HTML/RSC payload and submits online MCQ receiving preliminary score without answer-key leak; principal.sunrise inspects Aarav Verma's Digital Student Handbook showing live evaluated marks/remarks and offline completion with only Phase 6 Fee Receipts remaining as a planned seam.
    4. Monitor / Monitress read-only classroom board & strict Phase 4 privacy boundaries (monitor.11a.sunrise): read-only published assignment board (zero drafts/roster/peer submissions/remarks/answer keys), read-only published notices (zero drafts/authoring), explicit permission-denied boundaries on /communication/enquiries, /planning/lessons, /planning/oversight, and Aarav's handbook, and zero draft/staff-only learning resources.
    5. 4-viewport (1280x800, 768x1024, 390x844, 844x390) horizontal overflow audit and WCAG 2.0/2.1 AA axe-core scan across all 11 Phase 4 routes.
  - Genuine WCAG 2.0/2.1 AA defect fix surfaced during live Stage A CI audit in components/planning/PlanningSubNav.tsx (replacing undefined text-fg-inverse with border-accent + text-accent-fg on the active planning navigation link).
  - Formal Phase 4 Closure across docs/ROADMAP.md, docs/PROJECT_STATUS.md, docs/testing/TEST_STRATEGY.md, docs/progress/MILESTONE-REPORT-P4-M04.md, docs/progress/MILESTONE-REPORT-P4-M05.md, docs/README.md, CHANGELOG.md, and README.md after Stage A CI passes all 3 jobs green.
OUT OF SCOPE:
  - Phase 5 Timetable, Examinations & Results schema or UI implementation (awaits Product Owner kick-off).
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or weakening any RLS policy, pgTAP check, or Playwright security/a11y assertion.
EXPECTED FILES / DOMAINS: components/planning/PlanningSubNav.tsx, tests/e2e/phase4-communication-planning-assignments.spec.ts, docs/phase-plans/PHASE-04-MILESTONE-05-exit-gate-e2e-verification.md, docs/progress/MILESTONE-REPORT-P4-M04.md, docs/progress/MILESTONE-REPORT-P4-M05.md, docs/ROADMAP.md, docs/PROJECT_STATUS.md, docs/testing/TEST_STRATEGY.md, docs/README.md, CHANGELOG.md, README.md.
SECURITY / PRIVACY / DATA RISKS:
  - MCQ answer-key leakage (correctOptionIndex) in RSC/HTML payloads prior to evaluation: live-verified absent from DOM/RSC for both learner and Monitor accounts.
  - Cross-tenant and Monitor leakage of internal staff notes, parent enquiries, teacher lesson plans, or classmate coursework: live-verified blocked at PostgreSQL RLS, server DAL, and browser UI layers.
  - Active PlanningSubNav tab low-contrast fallback (2.66:1) caught by axe-core and fixed cleanly in components/planning/PlanningSubNav.tsx without relaxing WCAG AA thresholds.
CANDIDATE NEXT MILESTONE: P5-M01 — Phase 5 Timetable, Examinations & Results Core Schema, Forced RLS & pgTAP Suite (awaiting Product Owner kick-off).
```
