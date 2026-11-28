# Changelog

All notable changes to the DD-oodle School OS repository are documented in this file.

The format follows dated, grouped entries (`Added`, `Changed`, `Fixed`, `Security`, `Documentation`, `Removed`) per `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` (Part D3).

## [Unreleased]

## [0.4.0] - 2026-11-28

### Added
- Added live Phase 4 Exit-Gate E2E suite (`tests/e2e/phase4-communication-planning-assignments.spec.ts` with `E2E_REQUIRE_SUPABASE=true` fail-fast guard) verifying Subject Teacher independent `teaching_group` official notices, controlled offline cache (`dd-oodle:offline-notices:sunrise-cbse`), contextual comments, CBSE syllabus & delayed watchlist, lesson plans, learning resources, hybrid `auto_mcq` quizzes & offline notebook completion, Class Teacher/HOD oversight & internal staff note / enquiry resolution, Valley guardian cross-tenant isolation & notice acknowledgement, learner MCQ answer-key stripping (`correctOptionIndex`), live Digital Student Handbook Phase 4 wiring, Monitor read-only classroom-board boundaries, and 4-viewport + WCAG 2.0/2.1 AA `axe-core` audits across all 11 Phase 4 routes (`25/25` Playwright total).

### Fixed
- Fixed active link contrast (`2.66:1` -> `> 6.7:1`) in `components/planning/PlanningSubNav.tsx` caught by Stage A `axe-core` audit by replacing undefined `text-fg-inverse` with `border border-accent bg-accent text-accent-fg`.

### Documentation
- Recorded `P4-M04` CI Run `46120075849` (`371d4ed`) and Stage A `P4-M05` green CI Run `46122793847` (`1e66f83`: **115/115** Vitest across 21 files, **178/178** pgTAP across 5 suites + clean `db lint`, **25/25** Playwright across 5 specs) and formally closed **Phase 4 — Structured Communication & Academic Planning** as **Complete**.
- Created `docs/phase-plans/PHASE-04-MILESTONE-05-exit-gate-e2e-verification.md` and `docs/progress/MILESTONE-REPORT-P4-M05.md`; updated `docs/progress/MILESTONE-REPORT-P4-M04.md`, `docs/ROADMAP.md`, `docs/PROJECT_STATUS.md`, `docs/testing/TEST_STRATEGY.md`, `docs/README.md`, and `README.md`.

## [0.4.0-alpha.4] - 2026-11-28

### Added
- Added pure hybrid assignment schemas and domain rules (`lib/assignments/{schemas,rules}.ts`): `objectiveQuestionSchema`, `createAssignmentSchema` (auto-MCQ refinements), `transitionAssignmentStatusSchema`, `submitStudentAssignmentSchema` (traversal-safe relative storage paths), `recordOfflineCompletionSchema`, `evaluateSubmissionSchema`, deterministic `scoreObjectiveQuiz()`, `determineSubmissionStatus()`, `canTransitionAssignmentStatus()`, `canStudentSubmitAssignment()`, `sanitizeObjectiveQuestionsForLearner()`, `buildMonitorBoardAssignmentView()`, and `computeAssignmentCompletionMetrics()`.
- Added caller-RLS server-only Assignments DAL (`server/assignments/service.ts` with `import "server-only"`, zero admin client imports, batched `fetchPersonNameMap()`, student grade-column RLS compliance, and server-computed `auto_mcq` score confirmation) and Server Actions (`app/t/[slug]/assignments/actions.ts`).
- Added `"Assignments"` workspace nav link (`components/shell/{nav-config,AppShell}.tsx`, `lib/auth/navigation.ts`), controlled client draft box (`components/assignments/OfflineDraftBox.tsx`), and 2 compact WCAG AA responsive routes at `/t/[slug]/assignments` (including Monitor read-only classroom board) and `/t/[slug]/assignments/[assignmentId]` (student MCQ/text submit, offline notebook completion, evaluation, and contextual `record_comments`).
- Wired live Phase 4 assignments & submission summaries directly into Phase 3's Digital Student Handbook (`server/handbook/service.ts`, `lib/handbook/rules.ts`, `app/t/[slug]/handbook/[studentProfileId]/page.tsx`) while preserving Monitor peer denial and leaving Phase 6 (`Fee Receipts & Ledger`) as the remaining planned seam.
- Added unit tests in `tests/unit/assignments-rules.test.ts` and updated `tests/unit/handbook-rules.test.ts` and `tests/unit/safe-redirect-and-nav.test.ts`.

### Documentation
- Recorded `P4-M03` live CI Run `46118712061` (`314875f`: `108/108` Vitest, `178/178` pgTAP + `db lint`, `20/20` Playwright) in `docs/progress/MILESTONE-REPORT-P4-M03.md` and `docs/PROJECT_STATUS.md`.
- Created `docs/phase-plans/PHASE-04-MILESTONE-04-hybrid-assignments-and-handbook-wiring.md` and `docs/progress/MILESTONE-REPORT-P4-M04.md`; updated `docs/README.md` and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.4.0-alpha.3] - 2026-11-28

### Added
- Added pure academic planning schemas and domain rules (`lib/planning/{schemas,rules}.ts`): academic term lifecycle schema (`planned`/`active`/`completed`), syllabus hierarchy parent-kind validation (`validateSyllabusParentKind` for `Unit -> Chapter -> Topic`), deterministic tree builder (`buildSyllabusTree`), progress rollup calculator (`computeSyllabusProgressRollup`), mandatory `>= 5`-char `delayReason` when marking items `delayed`, role capability resolution (`resolvePlanningRoleAccess`), safe HTTP(S) URL validator (`isSafeHttpUrl`), and resource archival transition helper (`canTransitionResourceStatus`).
- Added caller-RLS server-only Academic Planning DAL (`server/planning/service.ts` with `import "server-only"`, zero admin client imports, batched `fetchPersonNameMap()`, signed private storage URLs) and Server Actions (`app/t/[slug]/planning/actions.ts`).
- Added `"Planning"` workspace nav link (`components/shell/{nav-config,AppShell}.tsx`, `lib/auth/navigation.ts`), `PlanningSubNav.tsx`, and 4 compact WCAG AA responsive routes at `/t/[slug]/planning`, `/lessons`, `/resources`, and `/oversight` (with explicit `permission-denied` notices outside authorized roles).
- Added unit tests in `tests/unit/planning-rules.test.ts` and updated `tests/unit/safe-redirect-and-nav.test.ts`.

### Documentation
- Recorded `P4-M02` live CI Run `46116183736` (`4a46d8f`: `101/101` Vitest, `178/178` pgTAP + `db lint`, `20/20` Playwright) in `docs/progress/MILESTONE-REPORT-P4-M02.md` and `docs/PROJECT_STATUS.md`.
- Created `docs/phase-plans/PHASE-04-MILESTONE-03-academic-planning-syllabus-lessons-resources-ui.md` and `docs/progress/MILESTONE-REPORT-P4-M03.md`; updated `docs/README.md` and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.4.0-alpha.2] - 2026-11-28

### Added
- Added pure structured communication schemas and domain rules (`lib/communication/{schemas,rules}.ts`): scope-locked `createOfficialNoticeSchema`, `resolveNoticeAuthoringPolicy()` & `validateNoticeAuthoringAgainstPolicy()`, one-way notice & enquiry state machines (`canTransitionNoticeStatus`, `canTransitionEnquiryStatus`), mandatory >= 5-char `resolutionSummary` when resolving enquiries, `canPostInternalStaffNote()`, sanitized non-authoritative `buildWhatsAppClickToChatUrl()`, and `filterCacheablePublishedNotices()` (§12.5).
- Added caller-RLS server-only Communication DAL (`server/communication/service.ts` with `import "server-only"`, zero admin client imports, batched `fetchPersonNameMap()` lookups) powering Official Notices, Notice Acknowledgements, Formal Parent Enquiries (with explicit `isMonitorRestricted` denial), shared `createRecordComment()` (with metadata-only `audit_events`), and optional staff-only non-authoritative WhatsApp coordination links.
- Added `app/t/[slug]/communication/actions.ts`, `"Communication"` workspace nav (`components/shell/{nav-config,AppShell}.tsx`, `lib/auth/navigation.ts`), `CommunicationSubNav.tsx`, `OfflineNoticesCachePanel.tsx` (`dd-oodle:offline-notices:<slug>` caching strictly published `is_offline_cacheable` notices), and 4 compact WCAG AA responsive routes at `/t/[slug]/communication`, `/notices/[noticeId]`, `/enquiries`, and `/enquiries/[enquiryId]`.
- Added unit tests in `tests/unit/communication-rules.test.ts` and updated `tests/unit/safe-redirect-and-nav.test.ts`.

### Documentation
- Recorded `P4-M01` live CI Run `46114613893` (`6314e80`: `95/95` Vitest, `178/178` pgTAP + `db lint`, `20/20` Playwright) in `docs/progress/MILESTONE-REPORT-P4-M01.md` and `docs/PROJECT_STATUS.md`.
- Created `docs/phase-plans/PHASE-04-MILESTONE-02-communication-notices-and-enquiries-ui.md` and `docs/progress/MILESTONE-REPORT-P4-M02.md`; updated `docs/README.md` and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.4.0-alpha.1] - 2026-11-28

### Added
- Recorded accepted Phase 4 ADRs: `docs/decisions/ADR-0007-record-bound-contextual-communication.md` (record-bound comments rejecting unlinked chat/DM tables, scoped official notices with acknowledgement and §12.5 offline-cache flags, formal parent enquiry case states) and `docs/decisions/ADR-0008-unified-hybrid-assignments-and-handbook-seam.md` (unified online/offline/MCQ hybrid assignments, normalized syllabus hierarchy, and Digital Handbook Phase 4 seam).
- Added Migration 14 (`supabase/migrations/202611280005_academic_planning_and_assignments.sql`): extended existing `public.academic_terms` with lifecycle `status` (`planned`/`active`/`completed`) and created 5 forced-RLS tables (`syllabus_items` requiring `delay_reason` when `delayed`, `lesson_plans`, `learning_resources`, `assignments`, `assignment_submissions`) with composite tenant FKs, triggers, and indexes.
- Added Migration 15 (`supabase/migrations/202611280006_communication_and_contextual_comments.sql`): created 4 forced-RLS tables (`official_notices` with strict `scope_type` target check, `notice_acknowledgements`, `parent_enquiries`, and `record_comments` enforcing mutually exclusive single parent FK linkage to `notice`/`parent_enquiry`/`assignment`).
- Added Migration 16 (`supabase/migrations/202611280007_phase4_rls_and_helpers.sql`): enforced `ENABLE` + `FORCE ROW LEVEL SECURITY` across all 9 new tables (**45** total forced-RLS `public.*` tables across 16 migrations), added private `app_auth` helpers (`is_department_hod`, `is_teaching_group_oversight`, `is_student_or_guardian_in_teaching_group`, `is_monitor_for_teaching_group`, `can_manage_subject_offering_planning`, `can_read_official_notice`, `can_read_parent_enquiry`, `can_read_record_comment`), and configured explicit `TO authenticated` policies (Subject Teacher TG autonomy vs Class Teacher/HOD oversight, student grade-column locks, guardian scoping, and Monitor board-only / zero internal-note isolation).
- Expanded `supabase/seed.sql` (preserving all Phase 1–3 records), added 47-assertion pgTAP suite (`supabase/tests/05_phase4_communication_planning_assignments_rls.test.sql`), and updated `tests/unit/sql-migration-invariants.test.ts` to assert all 45 forced-RLS public tables.

### Documentation
- Created `docs/phase-plans/PHASE-04-MILESTONE-01-communication-planning-assignments-schema.md` and `docs/progress/MILESTONE-REPORT-P4-M01.md`; updated `docs/ROADMAP.md` (Phase 4 `In Progress`), `docs/PROJECT_STATUS.md`, `docs/README.md`, `docs/security/MULTI_TENANT_RLS_BASELINE.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.3.0] - 2026-11-28

### Added
- Added live Phase 3 Exit-Gate E2E suite (`tests/e2e/phase3-school-day-and-handbook.spec.ts` with `E2E_REQUIRE_SUPABASE=true` fail-fast guard) verifying full school-day daily/staff attendance -> verification -> sign-off -> post-sign-off correction -> chronological `attendance_events` ledger reconstruction (with biometric disabled by default), idempotent `POST /api/t/[slug]/attendance/sync` replay & `401`/`403` tenant/role denials, Valley guardian notice isolation & Sunrise leave approval + Monitor read-only summary/route denials, Digital Student Handbook category/visibility privacy boundaries + Valley guardian acknowledgement + Monitor classmate block, and 4-viewport responsive + WCAG 2.0/2.1 AA `axe-core` audits across all 9 Phase 3 routes (`20/20` Playwright total).

### Fixed
- Tightened `isMonitorRestricted` in `server/leave/service.ts` (`getLeaveWorkspace` and `getParentNoticesWorkspace`) so dual Student+Monitor accounts (`monitor.11a.sunrise@example.test`) receive strict explicit permission-denied views on `/t/[slug]/leave` and `/t/[slug]/leave/notices` rather than empty self views.

### Documentation
- Recorded `P3-M04` CI Run `46101572764` (`bff9076`) and Stage A `P3-M05` live CI Run `46105679125` (`efccad9`: **95/95** Vitest across 18 files, **131/131** pgTAP across 4 suites, **20/20** Playwright) and formally closed **Phase 3 — Attendance, Leave & Digital Handbook** as **Complete**.
- Created `docs/phase-plans/PHASE-03-MILESTONE-05-exit-gate-e2e-verification.md` and `docs/progress/MILESTONE-REPORT-P3-M05.md`; updated `docs/progress/MILESTONE-REPORT-P3-M04.md`, `docs/ROADMAP.md`, `docs/PROJECT_STATUS.md`, `docs/testing/TEST_STRATEGY.md`, `docs/README.md`, and `README.md`.

## [0.3.0-alpha.4] - 2026-11-28

### Added
- Added pure Digital Student Handbook schemas and privacy policy helpers (`lib/handbook/{schemas,rules}.ts`): category/visibility metadata (`disciplinary` and `student_support` marked sensitive), `resolveHandbookAuthoringPolicy()`, `validateEntryAuthoringAgainstPolicy()`, `canGuardianAcknowledgeEntry()`, and typed Phase 4 (`Assignments & Subject Work`) / Phase 6 (`Fee Receipts & Ledger`) extension seams.
- Added caller-RLS server-only Handbook DAL (`server/handbook/service.ts` with `import "server-only"`) assembling live Phase 3 attendance summaries, leave applications, parent notices, and category/visibility-partitioned `handbook_entries`, enforcing Monitor classmate handbook isolation (self-only), staff-only edit/archive checks, guardian-only acknowledgements, and metadata-only `audit_events` (zero body text logged).
- Added `app/t/[slug]/handbook/actions.ts`, `"Handbook"` workspace navigation link, compact WCAG AA routes at `/t/[slug]/handbook` and `/t/[slug]/handbook/[studentProfileId]`, and unit tests in `tests/unit/handbook-rules.test.ts` + `tests/unit/safe-redirect-and-nav.test.ts`.

### Documentation
- Recorded `P3-M03` live CI Run `46099916419` (`9b69e75`: `88/88` Vitest, `131/131` pgTAP, `15/15` Playwright) in `docs/progress/MILESTONE-REPORT-P3-M03.md` and `docs/PROJECT_STATUS.md`.
- Created `docs/phase-plans/PHASE-03-MILESTONE-04-digital-student-handbook-ui.md` and `docs/progress/MILESTONE-REPORT-P3-M04.md`; updated `docs/PROJECT_STATUS.md`, `docs/README.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.3.0-alpha.3] - 2026-11-28

### Added
- Added pure leave & daily summary schemas and rules (`lib/leave/{schemas,rules}.ts`): inclusive calendar day computation, one-way leave state transitions (`submitted` -> `approved`/`rejected` for reviewer, `submitted` -> `cancelled` for applicant, terminal locks), non-override self-approval block (`canReviewLeaveRecord`), mandatory >=3-char rejection `decisionNote`, parent notice acknowledgement rules, and `summarizeDailyClassAttendance({ verifiedOnly })`.
- Added caller-RLS server-only Leave & Summary DAL (`server/leave/service.ts` with `import "server-only"`) implementing student & staff leave submission, review/cancellation with `audit_events`, guardian-scoped parent attendance notices (`/t/[slug]/leave/notices`) + one-click acknowledgement, and verified-only Daily Class / Monitor Summary (`/t/[slug]/attendance/summary`) with Class Teacher/HOD leave & notice panels.
- Added `app/t/[slug]/leave/actions.ts`, `"Leave & Notices"` workspace navigation (omitted for Monitor-only roles), `components/leave/LeaveSubNav.tsx`, `"Daily Summary"` tab in `components/attendance/AttendanceSubNav.tsx`, and unit tests in `tests/unit/leave-and-summary-rules.test.ts` + `tests/unit/safe-redirect-and-nav.test.ts`.

### Documentation
- Recorded `P3-M02` green CI Run `46097947497` (`7efa07a`: `78/78` Vitest, `131/131` pgTAP, `15/15` Playwright) in `docs/progress/MILESTONE-REPORT-P3-M02.md` and `docs/PROJECT_STATUS.md`.
- Created `docs/phase-plans/PHASE-03-MILESTONE-03-leave-notices-and-daily-summary.md` and `docs/progress/MILESTONE-REPORT-P3-M03.md`; updated `docs/PROJECT_STATUS.md`, `docs/README.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.3.0-alpha.2] - 2026-11-28

### Added
- Added pure attendance schemas and domain rules (`lib/attendance/{schemas,rules}.ts`): one-way student (`draft` -> `class_teacher_verified` -> `signed_off`) and staff (`draft` -> `verified` -> `signed_off`) verification transitions, mandatory post-sign-off `correctionReason` (>= 5 chars), configurable policy-based shortage percentages (`computeAttendanceShortage`), deterministic idempotency keys, and `offlineSyncBatchSchema`.
- Added caller-RLS server-only Attendance DAL (`server/attendance/service.ts` with `import "server-only"`) supporting daily student rolls, teaching-group period rolls, staff daily check-in/out & verification/sign-off, audited post-sign-off corrections writing append-only `attendance_events` and `audit_events`, institutional threshold policy updates (keeping `biometric_enabled = false`), and idempotent `syncOfflineAttendanceQueue()`.
- Added authenticated `POST /api/t/[slug]/attendance/sync` (`Cache-Control: no-store`), `app/t/[slug]/attendance/actions.ts`, workspace `"Attendance"` nav item, `components/attendance/{AttendanceSubNav,offline-queue-panel}.tsx`, and responsive routes `/t/[slug]/attendance`, `/t/[slug]/attendance/periods`, `/t/[slug]/attendance/staff`, and `/t/[slug]/attendance/ledger` (with strict verified-only read view for section Monitors).
- Added unit tests in `tests/unit/attendance-rules.test.ts` and updated `tests/unit/safe-redirect-and-nav.test.ts` (`78/78` unit tests passing).

### Documentation
- Updated `docs/progress/MILESTONE-REPORT-P3-M01.md` with Migration `202611280004` (`95bbda0`) and green CI Run `46095870562` (`131/131` pgTAP, `66/66` unit, `15/15` Playwright).
- Created `docs/phase-plans/PHASE-03-MILESTONE-02-attendance-verification-and-ledger-ui.md` and `docs/progress/MILESTONE-REPORT-P3-M02.md`; updated `docs/PROJECT_STATUS.md`, `docs/README.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.3.0-alpha.1] - 2026-11-28

### Added
- Recorded accepted Phase 3 ADRs: `docs/decisions/ADR-0005-two-layer-attendance-ledger-and-signoff.md` (append-only `attendance_events` ledger + `draft` -> `class_teacher_verified` -> `signed_off` registers + disabled-by-default zero-template biometric boundary) and `docs/decisions/ADR-0006-category-partitioned-digital-student-handbook.md` (live Phase 3 assembly + category/scope-partitioned `handbook_entries`).
- Added Migration 10 (`supabase/migrations/202611280001_attendance_and_leave_schema.sql`): 7 tables (`attendance_policies`, append-only `attendance_events` with `BEFORE UPDATE OR DELETE` trigger + `UNIQUE (institution_id, idempotency_key)`, `student_daily_attendance`, `student_period_attendance`, `staff_daily_attendance`, `leave_applications`, `parent_attendance_notices`) with composite tenant FKs.
- Added Migration 11 (`supabase/migrations/202611280002_digital_student_handbook.sql`): `public.handbook_entries` partitioned by `category` and `visibility_scope`.
- Added Migration 12 (`supabase/migrations/202611280003_phase3_rls_and_helpers.sql`): `ENABLE` + `FORCE ROW LEVEL SECURITY` on all 8 new tables (36 total forced-RLS public tables), private `app_auth` helpers (`is_section_class_teacher_or_hod`, `is_section_monitor`, `is_teaching_group_teacher`, `can_read_handbook_entry`), verified-only monitor daily attendance reads, and category/scope handbook RLS policies.
- Expanded `supabase/seed.sql` (preserving all Phase 1 & Phase 2 rows) and added 41-assertion pgTAP suite `supabase/tests/04_phase3_attendance_leave_handbook_rls.test.sql`; updated `tests/unit/sql-migration-invariants.test.ts` to assert 36 forced-RLS public tables.

### Documentation
- Created `docs/phase-plans/PHASE-03-MILESTONE-01-attendance-leave-handbook-schema.md` and `docs/progress/MILESTONE-REPORT-P3-M01.md`; updated `docs/ROADMAP.md` (Phase 3 `In Progress`), `docs/PROJECT_STATUS.md`, `docs/README.md`, `docs/security/MULTI_TENANT_RLS_BASELINE.md`, `docs/architecture/ARCHITECTURE_OVERVIEW.md`, and `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` (`REF-10`).

## [0.2.0] - 2026-11-28

### Added
- Added live Phase 2 Exit-Gate E2E suite (`tests/e2e/phase2-registry-and-cbse-academics.spec.ts` with `E2E_REQUIRE_SUPABASE=true` fail-fast guard) covering CBSE XI–XII reference model & cross-section `TG-XI-APPMATH-1`, 3-row staged CSV bulk import/dry-run/valid-only commit/CSV report, Dual Member relationship scoping + confidential field redaction + Valley ward switch, Monitor XI-A read-only coordination view, and 4-viewport responsive + WCAG 2.0/2.1 AA `axe-core` audits.
- Added forward-only Migrations 8 & 9 (`202611270008_persons_relationship_read_rls.sql`, `202611270009_restrict_person_read_staff_assignments.sql`) implementing `app_auth.can_read_person_profile(uuid)` and `persons_select_relationship_scoped` (with staff-only rule (c) restricted to `'hod'`, `'class_teacher'`, `'subject_teacher'`), expanding `supabase/tests/02_phase2_registry_and_academics_rls.test.sql` to 40 assertions (88 total pgTAP assertions).
- Extracted pure `resolveSectionRoleAssignments()` in `lib/academics/conflicts.ts` with unit tests in `tests/unit/academics-conflicts.test.ts` (66/66 Vitest total).

### Fixed
- Eliminated PostgREST `PGRST201` ambiguous `academic_assignments -> persons` embeds in `server/academics/service.ts` (`getSectionDetail`, `listTeachingGroups`, `listAcademicAssignments`) using direct queries, explicit error throwing, and caller-RLS batch `fetchPersonNameMap()`.
- Aligned `/t/[slug]/imports*` pages with canonical `app/globals.css` WCAG AA contrast tokens and `min-w-0` responsive grid containers; added optional `E2E_PORT` override in `playwright.config.ts`.

### Changed
- Hardened `.github/workflows/ci.yml` by upgrading `supabase/setup-cli@v1` (`version: latest`) to npm-backed `supabase/setup-cli@v3` (`version: ^2`) in both `supabase-rls-pgtap` and `e2e-live-auth`.

### Documentation
- Formally closed **Phase 2 — Institutional Registry & Academic Structure** as **Complete** following green CI Run `46087393787` (`beab9d2`); created `docs/phase-plans/PHASE-02-MILESTONE-05-exit-gate-e2e-verification.md` and `docs/progress/MILESTONE-REPORT-P2-M05.md`; updated `docs/ROADMAP.md`, `docs/PROJECT_STATUS.md`, `docs/security/MULTI_TENANT_RLS_BASELINE.md`, `docs/testing/TEST_STRATEGY.md`, `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` (`REF-06G`), `docs/README.md`, and `README.md`.

## [0.2.0-alpha.4] - 2026-11-27

### Added
- Added Migration 7 (`supabase/migrations/202611270007_bulk_import_staging.sql`) creating `public.import_batches` and `public.import_rows` with composite `(institution_id, batch_id)` FK, per-institution `idempotency_key` uniqueness, and forced RLS restricted to `imports.manage` or `people.manage`, verified by 22-assertion pgTAP suite `supabase/tests/03_import_staging_rls.test.sql` and updated `tests/unit/sql-migration-invariants.test.ts` (28 forced-RLS public tables).
- Installed `read-excel-file@9.3.20` (avoiding legacy `xlsx` CVEs), configured `6mb` Server Action body limit in `next.config.ts`, and implemented `lib/imports/{csv,spreadsheet,validators}.ts` with RFC-4180 CSV & XLSX parsing, 5 MB / 5,000-row / 60-column limits, `neutralizeCsvFormula()` export protection, Aadhaar header/mapping rejection, and in-file/DB duplicate detection across `students`, `staff`, and `subject_enrolments`.
- Added `server/imports/service.ts` (`import "server-only"`) implementing staged dry-run validation, non-overwriting idempotent batch commits (`resolveOrCreateGlobalPerson()` exported from `server/registry/service.ts` solely for new post-authorization person inserts), batch cancellation, audit logging, and formula-safe CSV reporting.
- Added `/t/[slug]/imports`, `/t/[slug]/imports/[batchId]`, authenticated CSV download route `/t/[slug]/imports/[batchId]/report`, and `app/t/[slug]/imports/actions.ts`.
- Added `tests/unit/imports-csv-and-validation.test.ts` and updated `tests/unit/safe-redirect-and-nav.test.ts`.

### Changed
- Updated `components/shell/nav-config.ts`, `components/shell/AppShell.tsx`, and `lib/auth/navigation.ts` to show `"Bulk Imports"` strictly for `imports.manage` / `people.manage` operators.

### Documentation
- Created `docs/phase-plans/PHASE-02-MILESTONE-04-bulk-import-staging.md` and `docs/progress/MILESTONE-REPORT-P2-M04.md`; updated `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` (`REF-06F`), `docs/PROJECT_STATUS.md`, `docs/README.md`, `docs/security/MULTI_TENANT_RLS_BASELINE.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.2.0-alpha.3] - 2026-11-27

### Added
- Added academic Zod schemas & pure conflict engine (`lib/academics/schemas.ts`, `lib/academics/conflicts.ts`): `detectAcademicAssignmentConflicts()` preventing overlapping active `class_teacher` and per-role `monitor`/`monitress` allocations while permitting concurrent teacher roles and validating section monitor eligibility, plus `validateCrossSectionGroupMembership()` validating active session & subject offering enrolment for cross-section groups.
- Added server-only Academics DAL (`server/academics/service.ts` with `import "server-only"`): caller-RLS queries (`getAcademicsOverview`, `getSectionDetail`, `listTeachingGroups`, `listAcademicAssignments`) and `academics.manage`-gated audited mutations (`createSession`, `activateSession`, `createDepartment`, `createGradeAndSection`, `createSubjectAndOffering`, `enrolStudentInSession`, `enrolStudentInSubject`, `createTeachingGroup`, `addStudentToTeachingGroup`, `assignAcademicResponsibility`, `revokeAcademicResponsibility`) with zero admin client imports.
- Added `/t/[slug]/academics/*` App Router UI, `components/academics/AcademicsSubNav.tsx`, and route-slug-bound Server Actions (`app/t/[slug]/academics/actions.ts`) covering Sessions/Terms/Departments/Sections, Section Detail (with read-only Monitor banner and individual elective badges), Cross-Section Teaching Groups, and Time-Bound Allocations ledger + revocation.
- Added unit tests `tests/unit/academics-conflicts.test.ts` and `tests/unit/academics-schemas.test.ts`, and updated `tests/unit/safe-redirect-and-nav.test.ts`.

### Changed
- Updated `components/shell/nav-config.ts`, `components/shell/AppShell.tsx`, and `lib/auth/navigation.ts` to expose `"Academics"` (`/t/${slug}/academics`) for authorized institutional roles while keeping Governance/Audit hidden from non-Principals.

### Documentation
- Created `docs/phase-plans/PHASE-02-MILESTONE-03-academic-structure-and-allocations.md` and `docs/progress/MILESTONE-REPORT-P2-M03.md`; updated `docs/PROJECT_STATUS.md`, `docs/README.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.2.0-alpha.2] - 2026-11-27

### Added
- Added shared registry validation & sensitivity helpers: `lib/registry/schemas.ts` (strict student/staff/guardian/admission/custom-field Zod schemas rejecting unexpected Aadhaar fields and validating `ALLOWED_ADMISSION_TRANSITIONS` + custom field `data_type`/`options_json`) and `lib/registry/masking.ts` (`filterAndMaskCustomFields`, `maskExternalIdentifier` last-4 PEN/APAAR masking).
- Added server-only audit helper (`server/audit/log.ts`) and registry DAL (`server/registry/service.ts` with `import "server-only"`) providing paginated RLS-enforced reads (`listStudents`, `getStudentDetail`, `listStaff`, `listAdmissions`, `listCustomFieldDefinitions`) and audited server-authorized mutations (`createStudentRecord`, `updateStudentLifecycle`, `linkStudentGuardian`, `createStaffRecord`, `createAdmissionApplication`, `transitionAdmissionStatus` with admission-to-student conversion, `upsertCustomFieldDefinition`, `upsertCustomFieldValue`).
- Added responsive accessible People Registry UI under `/t/[slug]/people`: Student Roster + Student Detail (guardians, enrolment badge, lifecycle updates, grouped sensitivity-filtered custom fields), Staff Directory, Admissions Pipeline, Custom Field Definitions manager, `components/registry/{PeopleSubNav,RegistryActionForm}.tsx`, and route-slug-verified `app/t/[slug]/people/actions.ts`.
- Added unit tests `tests/unit/registry-schemas.test.ts` and `tests/unit/registry-masking.test.ts`, and updated `tests/unit/safe-redirect-and-nav.test.ts`.

### Changed
- Updated `lib/auth/navigation.ts` to route `"People & Registry"` to `/t/[slug]/people` across authorized institutional roles without exposing Principal-only Governance or Audit items to Subject Teachers.

### Documentation
- Created `docs/phase-plans/PHASE-02-MILESTONE-02-people-registry-and-custom-fields.md` and `docs/progress/MILESTONE-REPORT-P2-M02.md`; updated `docs/PROJECT_STATUS.md`, `docs/README.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

## [0.2.0-alpha.1] - 2026-11-27

### Added
- Recorded accepted Phase 2 ADRs: `docs/decisions/ADR-0003-academic-structure-and-typed-assignments.md` (separated CBSE Senior Secondary schema + typed `academic_assignments`) and `docs/decisions/ADR-0004-normalized-custom-field-engine.md` (normalized core registries + sensitivity-classified custom fields).
- Added Migration 4 (`supabase/migrations/202611270004_people_registry_and_custom_fields.sql`): 6 forced-RLS tables (`student_profiles` with optional non-PK `pen_number`/`apaar_id` and zero Aadhaar column, `staff_profiles`, `student_guardians`, `admission_applications`, `custom_field_definitions`, `custom_field_values`) with composite tenant FKs.
- Added Migration 5 (`supabase/migrations/202611270005_academic_structure_and_assignments.sql`): 13 forced-RLS tables (`academic_sessions` single-active partial unique index, `academic_terms`, `academic_departments`, `grade_levels`, `sections`, `streams`, `subjects`, `subject_offerings`, `student_session_enrolments`, `student_subject_enrolments`, `teaching_groups`, `teaching_group_memberships`, `academic_assignments`).
- Added Migration 6 (`supabase/migrations/202611270006_phase2_rls_and_helpers.sql`): private `app_auth` relationship & sensitivity helpers (`can_access_student_profile`, `can_access_student_enrolment`, `is_hod_or_class_teacher_of_student`, `custom_field_sensitivity`, `can_read_custom_field`) and forced RLS policies across all 19 Phase 2 tables.
- Expanded `supabase/seed.sql` (preserving all 4 Phase 1 users/roles/audit rows) with CBSE XI–XII `2026-27` session data, mixed elective enrolments across `XI-A` & `XI-B`, cross-section teaching groups (`TG-XI-APPMATH-1`, `TG-XI-CS-1`), HOD/Class Teacher/Monitor/Student accounts, Valley guardian link (`Kabir Rao`), and `standard`/`confidential` custom fields.
- Added 30-assertion pgTAP suite (`supabase/tests/02_phase2_registry_and_academics_rls.test.sql`) and updated `tests/unit/sql-migration-invariants.test.ts` for all 26 forced-RLS public tables.

### Documentation
- Created `docs/phase-plans/PHASE-02-MILESTONE-01-registry-academics-schema.md` and `docs/progress/MILESTONE-REPORT-P2-M01.md`; updated `docs/ROADMAP.md` (Phase 2 `In Progress`), `docs/PROJECT_STATUS.md`, `docs/README.md`, `docs/security/MULTI_TENANT_RLS_BASELINE.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

### Security
- Enforced relationship-scoped RLS for HODs, class teachers, subject teachers (cross-section), guardians, and read-only monitors, field-level `standard`/`restricted`/`confidential` sensitivity isolation, composite `(institution_id, id)` FK tenant locks, and zero automatic school access for `platform_operators`.

## [0.1.0-alpha.6] - 2026-11-27

### Added
- Added synthetic local/CI GoTrue password (`DdOodleTest#2026!` via `extensions.crypt(..., extensions.gen_salt('bf'))`) and idempotent `auth.identities` email rows for the 4 synthetic `@example.test` users in `supabase/seed.sql`.
- Installed `@playwright/test@1.65.1` and `@axe-core/playwright@4.14.1`, created `playwright.config.ts`, and added `pnpm test:e2e` and `pnpm test:e2e:public` scripts.
- Added `tests/e2e/public-and-responsive.spec.ts` covering `/` public zero-leakage assertions, `/api/health`, `/manifest.webmanifest`, `/sw.js` headers, `/offline.html`, theme/density reload persistence, 4-viewport (`390x844`, `844x390`, `820x1180`, `1280x800`) horizontal-overflow & navigation audits, and WCAG 2.0/2.1 AA `axe-core` scans across Light/Dark modes.
- Added `tests/e2e/multi-tenant-auth.spec.ts` exercising live browser sign-in/sign-out, unauthenticated redirects, invalid-credential handling, Sunrise Principal isolation + non-enumerating denial on `/t/valley-cbse` and unknown slugs, Dual-Member single-identity switching across `sunrise-cbse` (`Subject Teacher`) and `valley-cbse` (`Parent / Guardian`) via `WorkspaceSwitcher`, and strict Platform Operator isolation on `/platform` vs `/t/[slug]`.
- Added parallel Job 3 (`e2e-live-auth`) to `.github/workflows/ci.yml` exporting live `supabase status -o env` values without logging keys before `pnpm build` and `pnpm test:e2e` with `E2E_REQUIRE_SUPABASE=true`.

### Documentation
- Closed **Phase 1 — Foundation and Multi-Tenant Platform** as **Complete** in `docs/ROADMAP.md` and `docs/PROJECT_STATUS.md` following green GitHub Actions CI Run `45951599452` (`eb6ed69`).
- Created `docs/phase-plans/PHASE-01-MILESTONE-05-exit-gate-e2e-verification.md` and `docs/progress/MILESTONE-REPORT-P1-M05.md`; updated `docs/testing/TEST_STRATEGY.md`, `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` (`REF-06D`, `REF-06E`), `docs/README.md`, and `README.md`.

### Security
- Verified live end-to-end enforcement across GoTrue, PostgREST RLS (`26/26` pgTAP), and Next.js 16 SSR routes (`10/10` Playwright E2E) including cross-tenant denial, non-enumerating slug responses, platform separation, and fail-fast CI guard (`E2E_REQUIRE_SUPABASE=true`).

## [0.1.0-alpha.5] - 2026-11-27

### Added
- Implemented pure security, permission, and navigation helpers: `lib/auth/safe-redirect.ts` (`sanitizeNextPath`), `lib/auth/permissions.ts` (`evaluatePermission` across active membership, time-bound role assignments, wildcard/exact grants, scope hierarchy, and strict exclusion of platform operator privileges), and `lib/auth/navigation.ts` (`buildInstitutionNav`).
- Implemented server-only authentication and multi-tenant data access layer under `server/` (every module guarded by `import "server-only"`): `server/auth/types.ts`, `server/auth/session.ts` (`getVerifiedAuthIdentity` via `getClaims()` and RLS-enforced `getCurrentPersonWorkspace`), `server/tenancy/resolve-context.ts` (`resolveTenantContextFromWorkspace`, `resolveVerifiedTenantContext`), and `server/auth/guards.ts` (`requireInstitutionPermission`, `requirePlatformOperator`).
- Added global authentication and isolated workspace shells: Zod-validated Server Action sign-in (`app/sign-in/actions.ts`, `SignInForm.tsx`, `page.tsx`), `POST /auth/sign-out`, `components/auth/SignOutButton.tsx` and `components/shell/WorkspaceSwitcher.tsx` (clearing PWA caches via `clearPwaCaches()`), `/workspace`, `/t/[slug]` layout & overview page, and strictly isolated `/platform` console shell.
- Added unit tests covering permissions, safe-redirect/navigation, and tenant context resolution + `server-only` enforcement (`tests/unit/permissions.test.ts`, `tests/unit/safe-redirect-and-nav.test.ts`, `tests/unit/tenant-context-resolution.test.ts`).

### Changed
- Extended `components/shell/AppShell.tsx` and `components/shell/nav-config.ts` with optional `badgeText`, `navItems`, `secondaryNavItems`, `headerSlot`, and domain icons while keeping full compatibility with `/shell-preview`.
- Updated `lib/supabase/proxy.ts` to strip spoofed `x-dd-oodle-tenant-hint` headers and forward parsed subdomain hints strictly as untrusted routing hints alongside `getClaims()` session refresh.
- Updated `app/page.tsx` to check `getVerifiedAuthIdentity()` and surface an `Open Workspace` or `Sign In` CTA without leaking private tenant data.

### Documentation
- Created `docs/phase-plans/PHASE-01-MILESTONE-04-auth-workspace-tenancy.md` and `docs/progress/MILESTONE-REPORT-P1-M04.md`.
- Updated `docs/security/MULTI_TENANT_RLS_BASELINE.md`, `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` (`REF-05C`, `REF-05D`), `docs/architecture/ARCHITECTURE_OVERVIEW.md`, `docs/README.md`, `docs/PROJECT_STATUS.md`, `docs/ROADMAP.md`, and `README.md`.

### Security
- Verified strict server-only tenant verification using `supabase.auth.getClaims()`, non-enumerating denial on nonexistent vs unauthorized institution slugs, complete separation of `platform_operators` from institutional leadership, open-redirect filtering, and PWA cache purging on workspace switch and logout.

## [0.1.0-alpha.4] - 2026-11-27

### Added
- Created GitHub Actions CI workflow (`.github/workflows/ci.yml`) running `app-quality` (Node 22, pnpm `--frozen-lockfile`, typecheck, lint, unit/SQL-invariant tests, Next.js build, docs hygiene) and `supabase-rls-pgtap` (`supabase/setup-cli@v1`, `supabase start`, `supabase db reset`, `supabase test db`, `supabase db lint`).

### Fixed
- Hardened `app_auth.can_write_institution_storage()` (`supabase/migrations/202611270003_private_storage_baseline.sql`) with explicit `CASE WHEN` regex guard before `::uuid` casting so non-UUID storage paths deterministically deny with RLS `42501`.
- Added `SET LOCAL search_path = public, extensions;` in `supabase/seed.sql` and `supabase/tests/01_multi_tenant_rls.test.sql` and explicit empty-string token columns on seeded `auth.users` rows.

### Documentation
- Created `docs/phase-plans/PHASE-01-MILESTONE-03B-ci-and-live-pgtap-gate.md` and `docs/progress/MILESTONE-REPORT-P1-M03B.md`.
- Updated `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` (`REF-06B`, `REF-06C`), `docs/testing/TEST_STRATEGY.md`, `docs/README.md`, `docs/PROJECT_STATUS.md`, `docs/progress/MILESTONE-REPORT-P1-M03.md`, and `README.md`.
- Recorded verified live GitHub Actions CI Run `45946043527` (`app-quality` + `supabase-rls-pgtap`: `Files=1, Tests=26, Result: PASS`, `No schema errors found`) and safe non-destructive recovery of `068cf60` (`ef53895` + `c599486`).

## [0.1.0-alpha.3] - 2026-11-27

### Added
- Installed `@supabase/supabase-js@2.119.2`, `@supabase/ssr@0.12.7`, and `server-only@0.0.1` for Next.js 16 SSR authentication plumbing.
- Created `supabase/config.toml` exposing `public` only (keeping `app_auth` hidden from PostgREST) with pgTAP testing and `supabase/seed.sql` enabled.
- Created core SQL migrations:
  - `supabase/migrations/202611270001_core_identity_and_tenancy.sql`: private `app_auth` schema, 7 core multi-tenant tables (`persons`, `platform_operators`, `institutions`, `institution_memberships`, `institution_roles`, `role_assignments`, `audit_events`), composite tenant-safe FKs, append-only `audit_events` immutability trigger, `updated_at` triggers, and B-tree indexes.
  - `supabase/migrations/202611270002_rls_helpers_and_policies.sql`: `STABLE SECURITY DEFINER SET search_path = ''` helpers in `app_auth`, forced RLS (`ENABLE` + `FORCE`) across all 7 tables, column-restricted `persons` profile `UPDATE`, and explicit `TO authenticated` initPlan policies.
  - `supabase/migrations/202611270003_private_storage_baseline.sql`: private `institution-private` bucket (`public = false`) and UUID-folder-prefixed Storage RLS policies.
- Created synthetic two-institution seed (`supabase/seed.sql`) and 26-assertion pgTAP security suite (`supabase/tests/01_multi_tenant_rls.test.sql`).
- Implemented `lib/supabase/{env,browser,server,admin,proxy}.ts` and Next.js 16 root `proxy.ts` (`getClaims()` session refresh with graceful pass-through when unconfigured).
- Added `tests/unit/supabase-env.test.ts` and `tests/unit/sql-migration-invariants.test.ts`.

### Changed
- Updated `.env.example` and `README.md` with `NEXT_PUBLIC_APP_DOMAIN`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and local `supabase test db` instructions.

### Documentation
- Created `docs/security/MULTI_TENANT_RLS_BASELINE.md`, `docs/phase-plans/PHASE-01-MILESTONE-03-supabase-schema-rls-storage.md`, and `docs/progress/MILESTONE-REPORT-P1-M03.md`.
- Verified Nov 2026 Supabase official documentation (`REF-04`, `REF-05`, `REF-05B`, `REF-06`, `REF-06B`) in `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md`.
- Updated `docs/README.md` (moved `docs/security/` from deferred to active), `docs/PROJECT_STATUS.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

### Security
- Enforced private `app_auth` helper isolation, `FORCE ROW LEVEL SECURITY` on all 7 public tables, composite cross-tenant FK rejection, platform-vs-institution separation, append-only `audit_events`, private Storage bucket access control, and browser runtime guards on `SUPABASE_SECRET_KEY`. Live `supabase test db` run pending local Docker + Supabase CLI setup.

## [0.1.0-alpha.2] - 2026-11-27

### Added
- Implemented theme and density configuration (`lib/ui/theme.ts`), semantic Tailwind CSS v4 tokens in `app/globals.css` across **Clarity**, **Calm**, and **Focus** (Light & Dark + `compact`/`comfortable` density), `ThemeProvider` (`useSyncExternalStore`), and accessible `ThemeControls`.
- Added core accessible UI primitives (`components/ui/Button.tsx`, `Badge.tsx`, `Card.tsx`, `StateNotice.tsx`, `Skeleton.tsx`).
- Added 4-mode responsive `AppShell` (`components/shell/AppShell.tsx`, `nav-config.ts`) supporting desktop collapsible sidebar, tablet Escape/backdrop drawer, mobile portrait bottom nav with safe-area padding, and mobile landscape compact rail, showcased on `/shell-preview`.
- Added `/sign-in` placeholder route (scheduled for `P1-M03`).
- Added Next.js 16 native PWA skeleton (`app/manifest.ts`, verified binary PNG icons in `public/icons/`, self-contained `public/offline.html`, auditable network-first `public/sw.js` with `DD_OODLE_CLEAR_CACHES`, and `components/pwa/ServiceWorkerRegistrar.tsx`).
- Added unit tests covering theme guards/script (`tests/unit/theme.test.ts`), PWA manifest/PNG icons/SW (`tests/unit/manifest-and-pwa.test.ts`), and security headers (`tests/unit/security-headers.test.ts`).

### Changed
- Replaced starter `app/page.tsx` with minimalistic public landing shell highlighting Indian CBSE & multi-board architecture pillars without exposing tenant data.
- Wired pre-hydration theme script, PWA metadata/viewport, `ThemeProvider`, and `ServiceWorkerRegistrar` into `app/layout.tsx`.
- Configured global security headers and strict `/sw.js` headers in `lib/security/headers.ts` and `next.config.ts`.
- Updated `README.md` with `P1-M02` repository state and UI/UX & PWA documentation link.

### Documentation
- Created `docs/ui-ux/DESIGN_SYSTEM_AND_PWA.md`, `docs/phase-plans/PHASE-01-MILESTONE-02-design-system-shell-pwa.md`, and `docs/progress/MILESTONE-REPORT-P1-M02.md`.
- Verified `REF-03` (Next.js PWA Guide, updated 2026-07-30) in `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md`.
- Updated `docs/README.md` (moved `docs/ui-ux/` from deferred to active), `docs/PROJECT_STATUS.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

### Security
- Enforced allowlist-only pre-hydration theme script (zero string interpolation), network-first navigation SW excluding `/api/*` and HTML caching, explicit cache-purge message hook for sign-out/tenant switching, `no-store` SW HTTP headers, and global `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy` headers.

## [0.1.0-alpha.1] - 2026-11-27

### Added
- Initialized Next.js App Router (`16.4.6`) + React (`19.3.1`) + strict TypeScript (`5.9.3`, `noUncheckedIndexedAccess: true`) + Tailwind CSS (`4.3.5`) + ESLint (`9.39.5`) + Vitest (`5.1.2`) foundation with `pnpm@12.23.0` and `pnpm-lock.yaml`.
- Added minimal application shell (`app/layout.tsx`, `app/globals.css`, `app/page.tsx`) and `/api/health` route returning `{ status: "ok", app: "dd-oodle" }` with `Cache-Control: no-store`.
- Added Zod-validated untrusted tenant routing hint parser (`lib/tenancy/resolve-tenant-hint.ts`) supporting `<slug>.dd-oodle.com`, `<slug>.localhost:3000`, and `/t/<slug>` (`OD-03`).
- Added unit tests (`tests/unit/resolve-tenant-hint.test.ts`, `tests/unit/health-route.test.ts`) covering valid/invalid/reserved tenant hints and `/api/health`.

### Changed
- Updated `.gitignore` to ignore `.pnpm-store/`.
- Updated `README.md` with verified prerequisites, `pnpm` scripts and ADR/testing doc links.

### Documentation
- Closed Phase 0: added `docs/requirements/DOMAIN_GLOSSARY.md` and recorded Product Owner approval for `OD-01`–`OD-05` in `docs/requirements/REQUIREMENTS_INDEX_AND_REGISTERS.md`.
- Authored accepted Core ADRs: `docs/decisions/ADR-0001-multi-tenant-database-strategy.md` and `docs/decisions/ADR-0002-person-identity-and-session-enrolment.md`.
- Added `docs/testing/TEST_STRATEGY.md`, `docs/phase-plans/PHASE-01-MILESTONE-01-foundation-and-core-adrs.md`, and `docs/progress/MILESTONE-REPORT-P1-M01.md`.
- Updated `docs/README.md`, `docs/ROADMAP.md` (Phase 0 `Complete`, Phase 1 `In Progress`), `docs/PROJECT_STATUS.md`, and `docs/architecture/ARCHITECTURE_OVERVIEW.md`.

### Security
- Enforced `isTrustedMembership: false` contract and reserved-slug/host validation on `resolveTenantHint` (`OD-03` / `ADR-0001`), plus zero environment or secret exposure in `/api/health`.

## [0.0.2] - 2026-11-27

### Added
- `.gitignore` to exclude `.env*` secrets, Node/Next.js build artefacts, logs, OS/IDE files and local data exports.
- `.env.example` with placeholder variable names only for future Next.js and Supabase setup.

### Documentation
- `PROJECT_INSTRUCTIONS.md` — concise permanent operating rules derived from Part B of the master blueprint.
- `README.md` — project overview, planned prerequisites, environment variable index and canonical documentation links.
- `docs/README.md` — documentation index linking active governance, requirements, architecture, compliance, phase-plan and progress records.
- `docs/PROJECT_STATUS.md` — audited repository baseline, Phase 0 status, blockers/open decisions and `P1-M01` candidate next milestone.
- `docs/ROADMAP.md` — Phases 0–10 and future roadmap possibilities mapped to explicit status.
- `docs/requirements/REQUIREMENTS_INDEX_AND_REGISTERS.md` — Part A requirement index, Open Decisions Register (`OD-01`–`OD-05`) and Initial Risk Register.
- `docs/architecture/ARCHITECTURE_OVERVIEW.md` — separation of confirmed repository facts vs. approved baseline design.
- `docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md` — official reference register seeded from Part F URLs.
- `docs/phase-plans/PHASE-00-MILESTONE-01-governance-bootstrap.md` — Part E milestone plan for `P0-M01` and candidate definition for `P1-M01`.
- `docs/progress/MILESTONE-REPORT-P0-M01.md` — audit findings, files created, verification summary and open decisions.

### Security
- Enforced secret hygiene baseline via `.gitignore` and key-free `.env.example` before any application code or credentials exist.

## [0.0.1] - 2026-11-27

### Added
- `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` (v1.0.0) committed as the canonical product and technical handover baseline (`d7e0dc7`).
- Initial `README.md` placeholder (`# DD-oodle-School-OS`).
