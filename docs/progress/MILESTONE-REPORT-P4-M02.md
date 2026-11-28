# Milestone Report: P4-M02 — Scoped Official Notices, Acknowledgements, Formal Parent Enquiries & Record-Bound Comments DAL + UI

- **Date:** 2026-11-28
- **Phase:** Phase 4 — Structured Communication & Academic Planning (**In Progress**)
- **Milestone:** `P4-M02`
- **Status:** **Local Verified — Pending GitHub Actions Live CI Verification**

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

- Verified locally with `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and docs hygiene checks prior to pushing to `origin/main`; live GitHub Actions CI run pending.

---

## 3. Next Recommended Action

Proceed to **`P4-M03`** — Academic Planning, Syllabus Progress, Lesson Plans, Learning Resources & Unified Hybrid Assignments Server DAL + UI once CI verifies `P4-M02` green.
