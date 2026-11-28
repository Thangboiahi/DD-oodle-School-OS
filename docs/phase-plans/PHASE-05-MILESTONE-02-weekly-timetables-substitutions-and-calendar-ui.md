# Phase 5 — Milestone 02: Weekly Timetables, Conflict Prevention, Substitutions & Academic Calendar Server DAL + UI

```text
MILESTONE ID: P5-M02
PHASE: Phase 5 — Timetable, Examinations & Results
TITLE: Weekly Timetables, Venue/Teacher Conflict Prevention, Daily Substitutions & Academic Calendar — Server DAL + UI
OBJECTIVE: Build the pure domain schemas/rules, caller-RLS server-only Timetable & Calendar DAL, Server Actions, controlled client offline timetable cache, and compact responsive routes under /t/[slug]/timetable and /t/[slug]/calendar covering venues, bell periods, versioned weekly timetables, double-booking conflict prevention, non-mutating daily substitutions, and scoped academic calendar events.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §3.3-§3.5, §4.1-§4.3, §6.3, §6.9-§6.10, §11.4, §12.1-§12.5, §15 Phase 5; Part E; ADR-0009.
PRECONDITIONS: P5-M01 Complete and live CI verified green on main (cb7e778 / CI Run 46127727595: 115/115 Vitest, 228/228 pgTAP + db lint, 25/25 Playwright).
IN SCOPE:
  - Pure schemas & domain rules (lib/timetable/{schemas,rules}.ts): createVenueSchema, createTimetablePeriodSchema (endTime > startTime), createTimetableSchema (effectiveTo >= effectiveFrom), transitionTimetableStatusSchema, createTimetableSlotSchema, createSubstitutionSchema, transitionSubstitutionStatusSchema, createCalendarEventSchema (strict scopeType target alignment & endsOn >= startsOn), detectTimetableSlotConflicts, computeTeacherWorkloadSummary, filterAvailableSubstituteStaff, canTransitionTimetableStatus, canTransitionCalendarEventStatus, and buildOfflineTimetableSnapshot (§12.5 published + isOfflineCacheable only).
  - Caller-RLS server-only DAL (server/timetable/service.ts): getTimetableWorkspace, createVenue, createTimetablePeriod, createTimetable, transitionTimetableStatus, createTimetableSlot, deleteTimetableSlot, createTimetableSubstitution, transitionSubstitutionStatus, getAcademicCalendarWorkspace, createCalendarEvent, and updateCalendarEventStatus with zero admin client imports, zero ambiguous PostgREST persons(...) embeds, and metadata-only audit_events.
  - Server Actions (app/t/[slug]/timetable/actions.ts), controlled offline cache panel (components/timetable/OfflineTimetableCachePanel.tsx under dd-oodle:offline-timetable:${slug}), workspace navigation items (Timetable + Calendar), and compact WCAG AA routes at /t/[slug]/timetable and /t/[slug]/calendar.
  - Unit tests (tests/unit/timetable-rules.test.ts) and updated navigation assertions (tests/unit/safe-redirect-and-nav.test.ts).
OUT OF SCOPE:
  - Assessment schemes, exam cycles/schedules, marks entry/moderation, and immutable result snapshots DAL/UI (scheduled for P5-M03 and P5-M04).
  - Database schema migrations, seed edits, pgTAP edits, or edits to DD-oodle_MASTER_PROJECT_BLUEPRINT.md.
EXPECTED FILES / DOMAINS: lib/timetable/{schemas,rules}.ts, server/timetable/service.ts, app/t/[slug]/timetable/{actions.ts,page.tsx}, app/t/[slug]/calendar/page.tsx, components/timetable/OfflineTimetableCachePanel.tsx, components/shell/{nav-config,AppShell}.tsx, lib/auth/navigation.ts, tests/unit/{timetable-rules,safe-redirect-and-nav}.test.ts, docs/*.
SECURITY / PRIVACY / DATA RISKS:
  - Double-booking teachers, venues, teaching groups, or instructional section overlaps: prevented in detectTimetableSlotConflicts before insert and structurally enforced via PostgreSQL 23505 indexes.
  - Monitor / Student / Guardian boundary leakage: monitors/students/guardians get strict read-only published schedules with zero draft versions, zero daily substitution rows, zero teacher workload summaries, and zero write/setup forms.
  - Controlled offline cache safety (§12.5): buildOfflineTimetableSnapshot rejects draft, archived, or non-cacheable timetables and excludes substitution/internal notes.
NEXT MILESTONE: P5-M03 — Assessment Schemes, Exam Cycles/Schedules & Staged Marks Entry/Moderation Server DAL + UI.
```
