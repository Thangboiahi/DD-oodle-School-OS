# Phase 4 — Milestone 02: Scoped Official Notices, Acknowledgements, Formal Parent Enquiries & Record-Bound Comments DAL + UI

```text
MILESTONE ID: P4-M02
PHASE: Phase 4 — Structured communication and academic planning
TITLE: Scoped Official Notices, Notice Acknowledgements, Formal Parent Enquiries & Record-Bound Contextual Comments — Server DAL + UI
OBJECTIVE: Implement pure communication Zod schemas/rules, caller-RLS server-only DAL, Server Actions, controlled client offline notice caching, non-authoritative WhatsApp click-to-chat helper, and 4 compact WCAG AA responsive routes under /t/[slug]/communication* enforcing zero open chat rooms or DM surfaces.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.5, §4.1-§4.3, §5.1-§5.4, §12.1-§12.5, §15 Phase 4; ADR-0007.
PRECONDITIONS: P4-M01 live-verified green on main (6314e80, CI Run 46114613893 with 95/95 Vitest, 178/178 pgTAP, and 20/20 Playwright across 45 forced-RLS public tables).
IN SCOPE:
  - Pure schemas & rules (lib/communication/{schemas,rules}.ts): role-scoped notice authoring policy (Leadership vs HOD vs Class Teacher vs Subject Teacher vs Monitor/Guardian), exact scope_type target refinement, notice/enquiry one-way state transitions, mandatory >= 5-char resolutionSummary when resolving enquiries, internal staff note guard, sanitized https://wa.me/ click-to-chat link builder, and filterCacheablePublishedNotices (§12.5).
  - Caller-RLS server-only DAL (server/communication/service.ts with import "server-only"): zero admin client imports, batched fetchPersonNameMap(), getNoticesWorkspace, getNoticeDetail, createOfficialNotice, transitionOfficialNoticeStatus, acknowledgeOfficialNotice, getParentEnquiriesWorkspace, getParentEnquiryDetail, createParentEnquiry, updateParentEnquiry, and shared createRecordComment with metadata-only audit_events.
  - Navigation, client controls & 4 WCAG AA responsive routes: Communication workspace nav item, CommunicationSubNav, OfflineNoticesCachePanel (dd-oodle:offline-notices:<slug> storing only published cacheable notices), /t/[slug]/communication, /t/[slug]/communication/notices/[noticeId], /t/[slug]/communication/enquiries, and /t/[slug]/communication/enquiries/[enquiryId] (with explicit Monitor denial and non-authoritative WhatsApp coordination link).
  - Unit tests in tests/unit/communication-rules.test.ts and updated safe-redirect-and-nav.test.ts.
OUT OF SCOPE:
  - Academic planning, syllabus progress, learning resources, hybrid assignments, and Handbook Phase 4 wiring UI/DAL (scheduled in P4-M03 and P4-M04).
  - Open chat rooms, DM threads, automated WhatsApp messaging, or modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md.
EXPECTED FILES / DOMAINS: lib/communication/*, server/communication/service.ts, app/t/[slug]/communication/*, components/communication/*, components/shell/{nav-config,AppShell}.tsx, lib/auth/navigation.ts, tests/unit/{communication-rules,safe-redirect-and-nav}.test.ts, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Student+Monitor hybrid account bypassing Monitor-only enquiry guards: blocked cleanly in loadCallerCommunicationScope without ownStudentProfileId exemption.
  - Internal staff notes or enquiry resolution summaries leaking into client caches or audit logs: excluded by filterCacheablePublishedNotices and metadata-only audit_events.
  - Subject Teacher broadcasting school-wide or unassigned teaching group notices: prevented at UI selector, service validation, and PostgreSQL RLS.
NEXT MILESTONE: P4-M03 — Academic Planning, Syllabus Progress, Lesson Plans, Learning Resources & Hybrid Assignments DAL + UI.
```
