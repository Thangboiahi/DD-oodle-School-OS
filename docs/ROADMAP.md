# DD-oodle Product Roadmap

> **Source:** `DD-oodle_MASTER_PROJECT_BLUEPRINT.md` (Part A §15 & §16)  
> **Status Legend:** `Not Started` | `In Progress` | `Blocked` | `Complete`

The roadmap is a sequence of validated capabilities rather than calendar commitments. Each phase requires bounded milestone plans and explicit acceptance criteria before execution.

## Phase Status Overview

| Phase | Title | Status | Exit Gate Summary |
|---|---|---|---|
| **Phase 0** | Product Discovery & Repository Governance | **Complete** | Governance structure, canonical instructions, requirements/risk/compliance registers, domain glossary and approved `OD-01`–`OD-05` established (`P0-M01` + Phase 0 closure in `P1-M01`). |
| **Phase 1** | Foundation & Multi-Tenant Platform | **Complete** | Verified in CI Run `45951599452` (`eb6ed69`): 40/40 Vitest unit/SQL invariant checks, 26/26 live pgTAP RLS/Storage/audit assertions, and 10/10 live Playwright multi-tenant auth, responsive & WCAG AA E2E checks across two synthetic institutions (`P1-M01`–`P1-M05` complete). |
| **Phase 2** | Institutional Registry & Academic Structure | **In Progress** | Reference Senior Secondary XI/XII schema modelled (mixed subject combinations, multiple sections, cross-section teaching) via `P2-M01` (`ADR-0003`, `ADR-0004`, 19 forced-RLS tables, relationship/sensitivity RLS & pgTAP suite; registry/academic UI next). |
| **Phase 3** | Attendance, Leave & Digital Handbook | **Not Started** | A normal school day can be completed and reconstructed from the audit history. |
| **Phase 4** | Structured Communication & Academic Planning | **Not Started** | Subject teachers issue work/academic updates independently while class teachers and HODs receive correct oversight (no general chat clone). |
| **Phase 5** | Timetable, Examinations & Results | **Not Started** | An examination cycle can be configured, recorded, reviewed, approved, published and audited. |
| **Phase 6** | Finance, HR & Administration | **Not Started** | Core office workflows executed with separation of duties and auditable financial operations. |
| **Phase 7** | Documents, PDF Editor & Certificate Lifecycle | **Not Started** | Issue and independently verify a test certificate without exposing unrelated personal data. |
| **Phase 8** | Specialised Operations & Campus Devices | **Not Started** | Each specialised module (clinic, lab, facilities, device gateway simulator) has independent permissions, audit coverage and operational tests. |
| **Phase 9** | Integrations, AI & Analytics | **Not Started** | Integrations (WhatsApp Business where eligible, Study Buddy, email/SMS/push, AI assistant) are revocable, monitored, permission-scoped, retryable and documented. |
| **Phase 10** | Commercial SaaS & Scale | **Not Started** | Onboarding, usage, billing, support, data export and tenant exit are operationally documented and tested. |

## Future Roadmap Possibilities (Candidate Expansions)

> Status: **Not Started** (Non-committed candidate expansions per Part A §15)

- Multi-campus trust/group administration.
- Government or board integration where formally available (UDISE+, APAAR/PEN).
- Digital identity/credential standards and interoperable transcript exchange.
- Library, transport, hostel, visitor and canteen systems.
- School procurement/vendor marketplace.
- Parent appointment scheduling and counselling workflows.
- Student welfare and safeguarding case management.
- Alumni relations and verified credentials.
- Advanced learning analytics with strong privacy safeguards.
- Dedicated deployments and regional hosting options.
- Public APIs and vetted third-party extensions.
