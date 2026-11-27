# DD-oodle Architecture Overview

> **Canonical Reference:** [`../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md`](../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md) (Part A §7, §11, §12, §18)

This document strictly separates **Confirmed Facts** (verified in the current repository) from the **Approved Baseline / Proposed Design** (target architecture not yet implemented).

---

## 1. Confirmed Facts (Current Repository State)

Audited on `2026-11-27`:

- **Codebase state:** Governance and documentation repository only. No application source code exists yet.
- **Framework / runtime:** No `package.json`, Next.js app, TypeScript config, Tailwind config, or UI components exist.
- **Database / migrations:** No `supabase/` directory, SQL migrations, RLS policies, or seed files exist.
- **Tests / CI:** No automated test runner, linter, or CI/CD workflows are configured.
- **Tracked files:** Master blueprint (`DD-oodle_MASTER_PROJECT_BLUEPRINT.md`), governance/status/roadmap/architecture/compliance docs, `.gitignore`, and key-free `.env.example`.

---

## 2. Approved Baseline / Proposed Design (Not Yet Implemented)

The following architecture is approved in the master blueprint and awaits Phase 1 (`P1-M01`+) implementation:

### 2.1 Technology Stack (Part A §11.1)

- **Web framework:** Next.js (App Router) with React and TypeScript (`strict` mode).
- **Styling & UI:** Tailwind CSS with a custom, accessible, responsive design system.
- **Validation & forms:** Zod + React Hook Form (or verified current equivalents at Phase 1 start).
- **Backend data & auth:** Supabase PostgreSQL, Supabase Auth, and Supabase Storage (private buckets by default).
- **Authorisation:** Server-side permission evaluation combined with PostgreSQL Row Level Security (RLS).
- **PWA:** Web app manifest, service worker, push notifications and strictly bounded offline caching (excluding sensitive tenant records).
- **Hosting / workers:** Vercel (or suitable Next.js host) + separate background workers (e.g., Supabase Queues/Cron or Cloud Run) when heavy imports, notifications or PDF jobs require them.

### 2.2 Modular Monolith & Domain Boundaries (Part A §11.2)

Start as a single **modular monolith** with explicit server-side domain modules and DTO boundaries:

- Identity & tenancy (`global person` vs `institution membership`)
- Organisation & configurable permissions (RBAC + ABAC + relationship-based access)
- Student & staff registry
- Academic structure (sessions, classes, sections, subjects, streams, teaching groups, time-bound staff assignments)
- Attendance & leave
- Academic planning & assignments
- Examination & results
- Structured communication & workflow engine
- Finance, HR, inventory & facilities
- Documents, PDF templates & credentials
- Reporting & external integrations (Study Buddy, WhatsApp Business, campus device gateway, UDISE+/APAAR)

### 2.3 Multi-Tenancy & Security Model (Part A §11.3–§11.4)

- **Isolation strategy:** Shared PostgreSQL database with `institution_id` scoping (direct or enforced parent relationship) and mandatory RLS on all exposed tenant tables.
- **Server-verified context:** Tenant context and user permissions are resolved and enforced server-side on every request; browser-supplied institution IDs are never trusted as proof of membership.
- **Data lifecycle (§7):** Three-layer model separating permanent person identity, session-based enrolments/assignments, and historical transactions.

### 2.4 Responsive UI & Theme System (Part A §12)

- **Design identity:** Minimalistic, fluid, sleek, compact yet functional, with density controls.
- **Three theme families (Light & Dark):** **Clarity** (institutional blue), **Calm** (natural green), **Focus** (modern violet).
- **Viewports:** Mobile portrait, mobile landscape, tablet, and desktop with keyboard navigation and WCAG-aligned contrast.
