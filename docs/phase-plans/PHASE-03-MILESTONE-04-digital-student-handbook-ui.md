# Phase 3 — Milestone 04: Digital Student Handbook Assembly, Category/Visibility Privacy & Guardianship Acknowledgements

```text
MILESTONE ID: P3-M04
PHASE: Phase 3 — Attendance, leave and digital handbook
TITLE: Digital Student Handbook with Strict Category & Visibility Privacy Controls (Server DAL + UI)
OBJECTIVE: Build pure domain schemas/rules, caller-RLS server-only DAL, Server Actions, and compact responsive routes under /t/[slug]/handbook and /t/[slug]/handbook/[studentProfileId] assembling live Phase 3 attendance/leave/notice summaries alongside category- and visibility-partitioned handbook_entries (plus typed Phase 4 & Phase 6 extension seams), while recording P3-M03 CI Run 46099916419 evidence.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.5, §4.1-§4.3, §6.5, §10.2, §12.1-§12.4, §15 Phase 3; ADR-0006.
PRECONDITIONS: P3-M03 live CI Run 46099916419 (commit 9b69e75) passed all 3 jobs (88/88 Vitest, 131/131 pgTAP + clean db lint, 15/15 Playwright).
IN SCOPE:
  - Pure domain schemas & privacy rules (lib/handbook/{schemas,rules}.ts): 5 handbook categories, 4 visibility scopes, resolveHandbookAuthoringPolicy, validateEntryAuthoringAgainstPolicy, canGuardianAcknowledgeEntry, and typed Phase 4/6 extension seams.
  - Caller-RLS server-only DAL (server/handbook/service.ts): zero service-role client, zero ambiguous PostgREST persons(...) embeds, monitor classmate handbook restriction (self-only), live attendance/leave/notice composition, metadata-only audit_events (no sensitive body text logged), staff-only edit/archive checks, and guardian acknowledgement updates.
  - Server Actions (app/t/[slug]/handbook/actions.ts), workspace "Handbook" nav link, and pages (/t/[slug]/handbook, /t/[slug]/handbook/[studentProfileId]).
  - Unit & nav tests (tests/unit/handbook-rules.test.ts, updated safe-redirect-and-nav.test.ts) & docs.
OUT OF SCOPE:
  - Phase 3 live Playwright E2E exit-gate suite & Phase 3 closure (scheduled next in P3-M05).
EXPECTED FILES / DOMAINS: lib/handbook/*, server/handbook/service.ts, app/t/[slug]/handbook/*, components/shell/*, lib/auth/navigation.ts, tests/unit/*, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Monitor classmate isolation: Monitor / Monitress directory filtered strictly to own student_profile_id; peer detail access explicitly denied before loading records.
  - Role authoring boundaries: Subject teachers restricted to academic_observation + student_and_guardian/staff_academic + shared assigned teaching group; Class Teachers/HODs excluded from leadership_only; guardians cannot edit/archive school entries.
  - Sensitive body logging prevention: audit_events omit body contents.
NEXT MILESTONE: P3-M05 — Phase 3 Exit Gate (Live E2E Verification across Attendance/Leave/Handbook Privacy, Responsive/WCAG AA Audit & Phase 3 Closure).
```
