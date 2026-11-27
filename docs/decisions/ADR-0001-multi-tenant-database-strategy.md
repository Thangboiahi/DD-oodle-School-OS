# ADR-0001: Multi-Tenant Database, Storage & Routing Isolation Strategy

- **ID & Title:** `ADR-0001` — Multi-Tenant Database, Storage & Routing Isolation Strategy
- **Status:** Accepted
- **Date:** 2026-11-27
- **Decision Owner:** Product Owner (DD-oodle)

---

## Context / Problem

DD-oodle serves multiple independent educational institutions (starting with Indian CBSE schools) on a single SaaS platform. Institutional records—student profiles, guardian links, attendance, fees, medical clinic entries, disciplinary notes and private identity documents—are sensitive and include children's personal data. We must establish a multi-tenancy architecture, cloud region baseline and tenant-routing boundary before writing database schemas or Next.js middleware/routes.

## Options Considered

1. **Shared Supabase PostgreSQL database with mandatory `institution_id` scoping and PostgreSQL Row Level Security (RLS):** Single schema/infrastructure with strict tenant keys, server-side membership validation and RLS policies.
2. **Database-per-tenant (separate Supabase project per school):** Strong physical isolation, but prohibitive operational, migration, connection-pooling and cost overhead for school SaaS onboarding.
3. **Schema-per-tenant in one PostgreSQL database:** Moderate isolation, but complicates Drizzle/Supabase tooling, cross-institution global person identity (`ADR-0002`), connection pooling and automated migrations at scale.

## Decision & Rationale

Adopt **Option 1** as the initial platform architecture, combined with approved hosting and routing guardrails (`OD-03`, `OD-04`):

1. **Shared Supabase PostgreSQL with mandatory tenant scope:** Every tenant-owned table must carry `institution_id` directly or through a rigorously enforced parent relationship.
2. **PostgreSQL RLS on all exposed tenant tables:** RLS is enabled by default on all tenant tables, referencing verified membership and relationship helper functions—never user-editable JWT metadata.
3. **Server-side tenant context resolution (`OD-03`):** Support `<slug>.dd-oodle.com` (production), `<slug>.localhost:3000` (local dev) and `/t/<slug>` (preview fallback only). Any slug parsed from host or path is strictly an **untrusted routing hint**. Server handlers and queries must resolve the authenticated user and verify active institution membership server-side and in PostgreSQL RLS.
4. **Private Storage by default:** Sensitive student/staff/institutional documents reside in private Supabase Storage buckets with Storage policies and short-lived signed URLs—never permanent public URLs.
5. **Hosting & Region (`OD-04`):** Deploy the Next.js application on Vercel and primary Supabase PostgreSQL/Auth/Storage in the **Mumbai (`ap-south-1`)** region for Indian school latency and DPDP/CERT-In readiness.

## Security / Privacy / Data Implications

- Prevents cross-tenant reads/writes even if a client tampers with cookies, headers, query params or URL slugs.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to client bundles or `NEXT_PUBLIC_*` environment variables; privileged server-only paths must explicitly validate caller identity, tenant scope and action.
- Views and `SECURITY DEFINER` functions must be audited so they do not bypass RLS unintentionally.
- Requires automated cross-tenant denial tests (`P1-M03`+) before Phase 1 exit gate sign-off.

## Cost / Maintenance Implications

- Lowest operational and infrastructure cost for early multi-school onboarding (`1` shared database, `1` migration pipeline, predictable Vercel + Supabase pricing).
- Requires disciplined migration review and RLS test coverage on every new table/view.

## Migration / Rollback Implications

- Because `institution_id` is explicit on tenant tables and global identity is separated (`ADR-0002`), large enterprise/dedicated-tenant institutions can later be extracted to dedicated Supabase projects if commercially justified (Phase 10).
- Changing away from shared-DB before launch is low-friction only prior to production data; once live data exists, tenant extraction requires per-institution export/import tooling.

## Consequences & Revisit Conditions

- **Consequences:** All Phase 1+ data models and APIs must accept server-resolved tenant context and pass cross-tenant RLS denial tests.
- **Revisit conditions:** Enterprise regulatory mandates requiring physical single-tenant databases, or database scale bottlenecks on `ap-south-1` primary instance.

## Links to Requirements & Implementation Milestones

- Master Blueprint: Part A §1.3, §2, §10.2, §10.5, §11.3, §11.4, §18 (#2, #8, #18).
- Open Decisions: `OD-03`, `OD-04` (`docs/requirements/REQUIREMENTS_INDEX_AND_REGISTERS.md`).
- Milestones: `P1-M01` (pure untrusted tenant-hint parser `lib/tenancy/resolve-tenant-hint.ts`), `P1-M03` (Supabase schema, RLS policies & cross-tenant denial tests).
