# DD-oodle Compliance & Official Research Register

> **Policy (Blueprint Part B12 & Part F):** Every external dependency—frameworks, Supabase security, Indian privacy law, CBSE circulars, government portals and messaging APIs—must be verified against official current sources before implementing the related feature. Discovery-stage citations are not permanent validation.

## Seeded Reference Register (Baseline: 2026-11-27)

| ID | Area / Requirement | Official Source URL | Document / Resource Title | Date Checked | Status | Owner & Next Review Trigger |
|---|---|---|---|---|---|---|
| **REF-01** | AI Model Routing & Orchestrator | https://antigravity.google/docs/models | Google Antigravity Models & Thinking Controls | 2026-11-27 | Re-verify before phase implementation | Tech Lead — review on model selector updates |
| **REF-02** | Antigravity Environment | https://antigravity.google/docs/home | Google Antigravity Documentation Home | 2026-11-27 | Re-verify before phase implementation | Tech Lead — Phase 1 setup |
| **REF-03** | PWA & Service Worker | https://nextjs.org/docs/app/guides/progressive-web-apps | Next.js Progressive Web App Guide | 2026-11-27 | Re-verify before phase implementation | Tech Lead — Phase 1 (`P1` PWA milestone) |
| **REF-04** | Database & App Security | https://supabase.com/docs/guides/security | Supabase Security Guidance | 2026-11-27 | Re-verify before phase implementation | Tech Lead — Phase 1 (`P1` Supabase baseline) |
| **REF-05** | Multi-Tenant Isolation | https://supabase.com/docs/guides/database/postgres/row-level-security | Supabase Row Level Security (RLS) | 2026-11-27 | Re-verify before phase implementation | Tech Lead — Phase 1 (before first migration) |
| **REF-06** | Private File Storage | https://supabase.com/docs/guides/storage/security/access-control | Supabase Storage Access Control | 2026-11-27 | Re-verify before phase implementation | Tech Lead — Phase 1 (storage foundation) |
| **REF-07** | Backups & Recovery | https://supabase.com/docs/guides/platform/backups | Supabase Backups Guide | 2026-11-27 | Re-verify before phase implementation | Ops / Tech Lead — before staging/production |
| **REF-08** | Indian Data Protection Law | https://www.meity.gov.in/data-protection-framework | Digital Personal Data Protection Act, 2023 (MeitY) | 2026-11-27 | Re-verify before phase implementation | Product Owner / Legal — before Phase 1 auth/registry & pre-launch |
| **REF-09** | DPDP Subordinate Rules | https://www.meity.gov.in/ | Digital Personal Data Protection Rules, 2025 (MeitY) | 2026-11-27 | Re-verify before phase implementation | Product Owner / Legal — before Phase 2 student/parent data |
| **REF-10** | Board Rules & Circulars | https://www.cbse.gov.in/ | CBSE Official Website & Circulars | 2026-11-27 | Re-verify before phase implementation | Product Owner — before Phase 3 attendance & Phase 5 exams |
| **REF-11** | Affiliation & Institutional Norms | https://www.cbse.gov.in/cbsenew/aff-bye-laws.html | CBSE Affiliation Bye-Laws | 2026-11-27 | Re-verify before phase implementation | Product Owner — before Phase 2/5/7 compliance templates |
| **REF-12** | Student Academic ID | https://apaar.education.gov.in/ | APAAR Official Portal | 2026-11-27 | Re-verify before phase implementation | Tech Lead — before Phase 2/9 APAAR fields/workflows |
| **REF-13** | School Data Portal | https://udiseplus.gov.in/ | UDISE+ Official Portal | 2026-11-27 | Re-verify before phase implementation | Tech Lead — before Phase 9 UDISE+ export/workflows |
| **REF-14** | Cybersecurity & ICT Logging | https://www.cert-in.org.in/ | CERT-In Official Website & Directions | 2026-11-27 | Re-verify before phase implementation | Tech Lead / Ops — before Phase 1/10 logging & India hosting |
| **REF-15** | WhatsApp Notifications | https://developers.facebook.com/docs/whatsapp/ | WhatsApp Business Platform Documentation | 2026-11-27 | Re-verify before phase implementation | Tech Lead — before Phase 9 notification integration |

---

## Verification Log Template (For Future Entries)

When verifying an item during implementation, record:
- **Document / API / Version Title**
- **Publication or Last-Updated Date**
- **Exact Clause / Endpoint / Plan Limitation**
- **Implementation Impact & Verification Date**
