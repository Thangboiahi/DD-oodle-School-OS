# DD-oodle Architecture Overview

> **Canonical Reference:** [`../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md`](../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md) (Part A §7, §11, §12, §18)

This document strictly separates **Confirmed Facts** (verified in the current repository) from the **Approved Baseline / Proposed Design** (target architecture not yet implemented).

---

## 1. Confirmed Facts (Current Repository State)

Audited on `2026-11-27` (`P1-M02`):

- **Codebase state:** Next.js 16 App Router application with governance, architecture (`ADR-0001`, `ADR-0002`), UI/UX & PWA spec, glossary, testing and compliance records.
- **Installed Runtime & Toolchain (`package.json` + `pnpm-lock.yaml`):**
  - Package manager: `pnpm` (`12.23.0`); Node.js `>=22.0.0` (verified locally on `v26.13.0`)
  - Framework & UI: `next` (`16.4.6`), `react` (`19.3.1`), `react-dom` (`19.3.1`)
  - Language & validation: `typescript` (`5.9.3`, `strict: true`, `noUncheckedIndexedAccess: true`), `zod` (`4.6.7`)
  - Styling: `tailwindcss` (`4.3.5`), `@tailwindcss/postcss` (`4.3.5`), `postcss` (`8.5.33`)
  - Lint & tests: `eslint` (`9.39.5`), `eslint-config-next` (`16.4.6`), `vitest` (`5.1.2`)
- **Verified Directory Layout:**
  - `app/` (`layout.tsx`, `globals.css`, `page.tsx`, `manifest.ts`, `shell-preview/page.tsx`, `sign-in/page.tsx`, `api/health/route.ts`)
  - `components/` (`theme/`, `ui/`, `shell/`, `pwa/`)
  - `lib/` (`tenancy/resolve-tenant-hint.ts`, `ui/theme.ts`, `security/headers.ts`)
  - `public/` (`offline.html`, `sw.js`, `icons/icon-192x192.png`, `icons/icon-512x512.png`, `icons/maskable-512x512.png`)
  - `tests/unit/` (`resolve-tenant-hint.test.ts`, `health-route.test.ts`, `theme.test.ts`, `manifest-and-pwa.test.ts`, `security-headers.test.ts`)
  - `docs/` (`architecture/`, `compliance/`, `decisions/`, `phase-plans/`, `progress/`, `requirements/`, `testing/`, `ui-ux/`)
- **Design System & PWA Baseline (`P1-M02`):** Active (`Clarity`, `Calm`, `Focus` Light/Dark + density, 4-mode `AppShell`, native `app/manifest.ts`, auditable `public/sw.js` precaching only `/offline.html`, global & `/sw.js` security headers).
- **Database / migrations / auth:** Not yet implemented (`supabase/`, PostgreSQL schemas, RLS policies and Supabase Auth flows are deferred to `P1-M03`).

---

## 2. Approved Baseline / Proposed Design (Not Yet Implemented)

The following architecture is approved in the master blueprint and Core ADRs (`ADR-0001`, `ADR-0002`) for upcoming milestones:

### 2.1 Technology Stack & Hosting (Part A §11.1, OD-04)

- **Hosting & region (`ADR-0001` / `OD-04`):** Vercel (Next.js app) + Supabase Mumbai (`ap-south-1`) for PostgreSQL, Auth and Storage.
- **Forms & backend data:** React Hook Form + Zod; Supabase PostgreSQL, Auth and private Storage buckets.
- **Authorisation:** Server-side permission evaluation combined with PostgreSQL Row Level Security (RLS).
- **PWA:** Web app manifest, service worker, push notifications and strictly bounded offline caching (excluding sensitive tenant records).
- **Workers:** Separate background workers (e.g., Supabase Queues/Cron or Cloud Run) when heavy imports, notifications or PDF jobs require them.

### 2.2 Modular Monolith & Domain Boundaries (Part A §11.2)

Start as a single **modular monolith** with explicit server-side domain modules and DTO boundaries:

- Identity & tenancy (`global person` vs `institution membership` per `ADR-0002`)
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

### 2.3 Multi-Tenancy & Security Model (`ADR-0001`)

- **Isolation strategy:** Shared PostgreSQL database with `institution_id` scoping (direct or enforced parent relationship) and mandatory RLS on all exposed tenant tables.
- **Routing hint boundary (`OD-03`):** `<slug>.dd-oodle.com`, `<slug>.localhost:3000` and `/t/<slug>` are parsed strictly as untrusted routing hints (`isTrustedMembership: false`); server handlers and RLS resolve and verify active membership on every request.
- **Data lifecycle (`ADR-0002`):** Three-layer model separating permanent person identity, session-based enrolments/assignments, and historical transactions.

### 2.4 Responsive UI & Theme System (Part A §12 — Scheduled `P1-M02`)

- **Design identity:** Minimalistic, fluid, sleek, compact yet functional, with density controls.
- **Three theme families (Light & Dark):** **Clarity** (institutional blue), **Calm** (natural green), **Focus** (modern violet).
- **Viewports:** Mobile portrait, mobile landscape, tablet, and desktop with keyboard navigation and WCAG-aligned contrast.
