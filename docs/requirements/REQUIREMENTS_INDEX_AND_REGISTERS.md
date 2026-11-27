# DD-oodle Requirements Index, Open Decisions & Risk Register

> **Canonical Source:** [`../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md`](../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md)

---

## 1. Functional & Non-Functional Requirements Index

| Blueprint Section | Domain / Requirement Area | First Usable Release Priority (§16) |
|---|---|---|
| §1.3 & §18 | Non-negotiable product principles & 20 baseline decisions | Foundational |
| §2 | Four environments (Public site, Global workspace selector, Institution console, Platform console) | Critical |
| §3 | Reference CBSE school model (leadership, class-band HODs, academic entities, assignments, monitors) | Critical |
| §4 | Hybrid RBAC + ABAC + Relationship-based access, role builder, delegation & audit | Critical |
| §5 | Communication boundary (WhatsApp = casual chat; DD-oodle = structured school ops) | Critical |
| §6.1–§6.3 | People/institutional registry, admissions & enrolment, academic structure & allocation | Critical |
| §6.4–§6.5 | Attendance & leave; Digital Student Handbook with category/field privacy | Critical / High |
| §6.6–§6.7 | Academic planning & syllabus; assignments, quizzes & learning resources | High / Critical |
| §6.8 | Examinations & results | Deferred (Phase 5) |
| §6.9–§6.10 | Timetable & scheduling; calendar & events | High |
| §6.11–§6.14 | Finance & fees; HR; inventory/procurement; clinic/lab/facilities | Deferred (Phase 6–8) |
| §6.15–§6.17 | Private documents; template PDF editor; Credential Exchange | Critical (private docs) / Deferred (Phase 7+) |
| §6.18–§6.19 | Configurable workflow engine; role-scoped analytics & reports | High / Phase-staged |
| §7–§8 | Session-based continuity, Transition Wizard, storage minimisation, bulk import/export | Critical / High |
| §9 | Study Buddy API/event integration (isolated private learner data) | Deferred (Phase 9) |
| §10 | Indian configuration & regulatory readiness (DPDP, CBSE, APAAR/PEN/UDISE+, CERT-In) | Cross-cutting |
| §11–§12 | Technical stack, Supabase RLS/Storage security, PWA & 3 theme families | Critical |
| §13–§14 | Campus device gateway, notification providers, AI assistant safety boundaries | Deferred (Phase 8–9) |
| §17 | NFRs: security, reliability/performance, accessibility/responsiveness, data integrity, testing | Cross-cutting |

---

## 2. Open Decisions Register

Product-owner decisions recorded as **Approved** on `2026-11-27`:

| ID | Topic | Approved Decision | Impact & Notes | Status |
|---|---|---|---|---|
| **OD-01** | Git branching & merge workflow | Direct milestone commits to `main` during solo Phase 1; switch to `feat/<milestone>` + PR before multi-contributor or pilot rollout. | Governs milestone commits in Phase 1 (`P1-M01`+). | **Approved (2026-11-27)** |
| **OD-02** | Package manager, Node.js LTS & Supabase CLI | `pnpm` + Node.js LTS (`22.x`, `>=22.0.0`; local machine verified at `v26.13.0`) + Supabase CLI (local Docker stack for RLS tests starting in `P1-M03`). | Enforces `pnpm-lock.yaml` from `P1-M01`; Supabase CLI/Docker setup scoped to `P1-M03`. | **Approved (2026-11-27)** |
| **OD-03** | Multi-tenant routing strategy | Host/path abstraction supporting `<slug>.dd-oodle.com` (production), `<slug>.localhost:3000` (local dev), and `/t/<slug>` (preview fallback only). | Treated strictly as an untrusted routing hint; always validated server-side against verified membership (see `ADR-0001`). | **Approved (2026-11-27)** |
| **OD-04** | Hosting & India-region data residency | Vercel (Next.js app) + Supabase Mumbai (`ap-south-1`) for India latency and DPDP/CERT-In readiness. | Governs cloud provisioning & region selection (see `ADR-0001`). | **Approved (2026-11-27)** |
| **OD-05** | Native AI tool rules adapter file | Keep `PROJECT_INSTRUCTIONS.md` canonical; do not create unverified native AI rules files. | Avoids redundant or unverified tool-specific instruction files. | **Approved (2026-11-27)** |

---

## 3. Initial Risk Register

| ID | Risk | Severity | Blueprint Control / Mitigation |
|---|---|---|---|
| **R-01** | Cross-tenant data leakage via missing RLS, unsafe views or client-supplied institution ID | Critical | Resolve/verify tenant membership server-side; enable RLS on all tenant tables; keep Storage private; run automated cross-tenant denial tests (Phase 1 exit gate). |
| **R-02** | Child-data privacy, DPDP compliance or biometric data exposure | High | Data minimisation, guardian consent flows, strict medical/disciplinary/fee field-level access, no raw cloud biometric templates by default, legal review prior to production. |
| **R-03** | Scope creep into a general-purpose WhatsApp chat clone | Medium | Enforce §5 boundary: only record-linked contextual comments and structured workflows; no open-ended messenger/chat clone. |
| **R-04** | Outdated or hardcoded CBSE / government compliance rules | Medium | Versioned templates; check official circulars/sites before implementing each board feature and log in `COMPLIANCE_AND_RESEARCH_REGISTER.md`. |
| **R-05** | Secret or real-data leakage into GitHub | High | `.gitignore` blocks `.env*` and local exports; key-free `.env.example`; staged diff secret inspection before every commit; synthetic test fixtures only. |
| **R-06** | Unverified AI or OCR output treated as authoritative school records | Medium | Label AI drafts, require human verification/approval, enforce caller's existing RBAC/RLS scope before retrieval. |
