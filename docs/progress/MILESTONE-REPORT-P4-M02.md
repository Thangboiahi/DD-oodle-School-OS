# Milestone Report: P4-M02 — Scoped Official Notices, Acknowledgements, Formal Parent Enquiries & Record-Bound Comments DAL + UI

- **Date:** 2026-11-28
- **Phase:** Phase 4 — Structured Communication & Academic Planning (**In Progress**)
- **Milestone:** `P4-M02`
- **Status:** **Complete (Live CI Verified)**

---

## 1. Summary of Changes

1. **Pure Communication Schemas & Domain Rules (`lib/communication/`):**
   - Added [`schemas.ts`](../../lib/communication/schemas.ts) with strict Zod schemas for `createOfficialNoticeSchema` (enforcing exact single scope target matching `scopeType`), `transitionNoticeStatusSchema`, `acknowledgeNoticeSchema`, `createParentEnquirySchema`, `updateParentEnquirySchema` (requiring >= 5-char `resolutionSummary` when resolving), and `createRecordCommentSchema`.
   - Added [`rules.ts`](../../lib/communication/rules.ts) with `resolveNoticeAuthoringPolicy()`, `validateNoticeAuthoringAgainstPolicy()`, one-way status transitions (`canTransitionNoticeStatus`, `canTransitionEnquiryStatus`), `canPostInternalStaffNote()`, non-authoritative `buildWhatsAppClickToChatUrl()`, and `filterCacheablePublishedNotices()` (§12.5).
2. **Caller-RLS Server-Only Communication DAL (`server/communication/service.ts`):**
   - Implemented [`service.ts`](../../server/communication/service.ts) with `import "server-only"`, strictly using `createSupabaseServerClient()` (zero admin/service-role imports) and batched `fetchPersonNameMap()` lookups (zero ambiguous PostgREST `persons(...)` embeds).
   - Built Official Notices workspace/detail/create/transition/acknowledge operations, Parent Enquiries workspace/detail/create/triage/resolve operations with explicit Monitor permission-denied enforcement (`isMonitorRestricted`), shared `createRecordComment()`, optional staff-only non-authoritative WhatsApp links, and metadata-only `audit_events` (never logging comment or internal-note text).
3. **Server Actions, Navigation & UI (`app/`, `components/`):**
   - Added [`actions.ts`](../../app/t/[slug]/communication/actions.ts), workspace `"Communication"` nav link ([`nav-config.ts`](../../components/shell/nav-config.ts), [`AppShell.tsx`](../../components/shell/AppShell.tsx), [`navigation.ts`](../../lib/auth/navigation.ts)), [`CommunicationSubNav.tsx`](../../components/communication/CommunicationSubNav.tsx), [`OfflineNoticesCachePanel.tsx`](../../components/communication/OfflineNoticesCachePanel.tsx), and 4 responsive WCAG AA routes under `/t/[slug]/communication`, `/notices/[noticeId]`, `/enquiries`, and `/enquiries/[enquiryId]`.
4. **Unit & Navigation Tests (`tests/unit/`):**
   - Added [`communication-rules.test.ts`](../../tests/unit/communication-rules.test.ts) and updated [`safe-redirect-and-nav.test.ts`](../../tests/unit/safe-redirect-and-nav.test.ts).

---

## 2. Verification Summary

- **Live GitHub Actions CI Run [`46116183736`](https://github.com/Thangboiahi/DD-oodle-School-OS/actions/runs/46116183736)** (`4a46d8f`) passed all 3 jobs cleanly:
  - `App Quality & Hygiene` (`140890438672`, 48s): `pnpm typecheck`, `pnpm lint`, `19` files / `101/101` Vitest unit tests, `pnpm build`, and docs hygiene passed.
  - `Supabase RLS & pgTAP Verification` (`140890438785`, 2m40s): `supabase db lint` (`No schema errors found`) and `supabase test db` (`Files=5, Tests=178, Result: PASS`).
  - `Live Multi-Tenant Auth & A11y E2E` (`140890438877`, 3m58s): `20 passed (35.0s)` with zero horizontal overflow and zero WCAG 2.0/2.1 AA violations.

---

## 3. Next Recommended Action

Proceed to **`P4-M03`** — Academic Planning, Syllabus Progress, Lesson Plans & Subject Learning Resources Server DAL + UI (`/t/[slug]/planning`).
