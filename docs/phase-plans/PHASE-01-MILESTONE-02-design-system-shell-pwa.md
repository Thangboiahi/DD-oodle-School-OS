# Phase 1 — Milestone 02: Design System Tokens, Responsive App Shell, Public Landing Shell & PWA Skeleton

```text
MILESTONE ID: P1-M02
PHASE: Phase 1 — Foundation and multi-tenant platform
TITLE: Design System Tokens, 3 Theme Families, Responsive App Shell, Public Landing Shell & PWA Skeleton
OBJECTIVE: Implement DD-oodle's minimalistic, compact, accessible design system (Clarity, Calm, Focus in Light/Dark + compact/comfortable density), 4-mode responsive shell, public landing page shell, sign-in placeholder, and security-first Next.js 16 PWA skeleton without Supabase auth, database tables, or fake institutional dashboards.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §2.1, §12.1–§12.5, §17.3; Part B10–B13.
PRECONDITIONS: P1-M01 complete (da5bf9c on main); pnpm toolchain and Next.js 16 App Router active.
IN SCOPE:
  - Theme & density system: lib/ui/theme.ts, app/globals.css, components/theme/ThemeProvider.tsx, components/theme/ThemeControls.tsx.
  - Accessible UI primitives: components/ui/{Button,Badge,Card,StateNotice,Skeleton}.tsx.
  - Responsive 4-mode shell & preview: components/shell/{nav-config.ts,AppShell.tsx}, app/shell-preview/page.tsx.
  - Public landing & auth placeholder: app/page.tsx, app/sign-in/page.tsx.
  - Next.js 16 native PWA & security headers: app/manifest.ts, public/icons/{icon-192x192,icon-512x512,maskable-512x512}.png, public/offline.html, public/sw.js, components/pwa/ServiceWorkerRegistrar.tsx, app/layout.tsx, lib/security/headers.ts, next.config.ts.
  - Unit tests: tests/unit/{theme,manifest-and-pwa,security-headers}.test.ts.
  - Governance & docs: docs/ui-ux/DESIGN_SYSTEM_AND_PWA.md, docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md, docs/phase-plans/PHASE-01-MILESTONE-02-design-system-shell-pwa.md, docs/progress/MILESTONE-REPORT-P1-M02.md, docs/README.md, docs/PROJECT_STATUS.md, docs/architecture/ARCHITECTURE_OVERVIEW.md, CHANGELOG.md, README.md.
OUT OF SCOPE:
  - Supabase packages, SQL migrations, RLS policies, auth flows, or .env secrets (P1-M03).
  - Third-party PWA wrappers (next-pwa / Serwist).
  - Fake tenant dashboards, synthetic student/staff rows, or chat UI.
  - Empty directories or changes to DD-oodle_MASTER_PROJECT_BLUEPRINT.md.
EXPECTED FILES / DOMAINS: Theme/UI system, responsive shell, public landing/sign-in pages, native PWA manifest/SW/icons, security headers, unit tests, UI/UX and progress docs.
IMPLEMENTATION STEPS:
  1. Create lib/ui/theme.ts and lib/security/headers.ts; wire next.config.ts headers().
  2. Define 6 theme variants (Clarity/Calm/Focus x Light/Dark), density tokens, focus/reduced-motion rules, and landscape shell rules in app/globals.css.
  3. Build ThemeProvider (useSyncExternalStore), ThemeControls, and accessible UI primitives (Button, Badge, Card, StateNotice, Skeleton).
  4. Build 4-mode responsive AppShell and /shell-preview showcase route (zero tenant data).
  5. Replace starter app/page.tsx with minimalistic public landing shell and add /sign-in placeholder route.
  6. Generate verified binary PNG icons, implement app/manifest.ts, public/offline.html, public/sw.js, ServiceWorkerRegistrar, and wire app/layout.tsx.
  7. Add unit tests for theme guards/script, PWA manifest/icons/SW, and security headers.
  8. Update documentation, verify pnpm typecheck/lint/test/build, audit diff, commit, and push to origin/main.
SECURITY / PRIVACY / DATA RISKS:
  - Theme boot script could risk XSS if dynamic strings were interpolated; mitigated via hardcoded allowlists and zero string interpolation.
  - Service worker over-caching could leak tenant HTML/API responses across users; mitigated by strictly precaching only /offline.html, skipping /api/*, network-first navigation without HTML caching, no-store SW HTTP headers, and DD_OODLE_CLEAR_CACHES purge support.
ACCEPTANCE CRITERIA:
  - pnpm typecheck, pnpm lint, pnpm test, and pnpm build pass with zero errors.
  - All 6 theme combinations, density tokens, 4 responsive modes, UI primitives, and 4 StateNotice kinds work cleanly.
  - Binary PNG icons pass PNG signature and dimension checks; /sw.js and global security headers match spec.
  - Zero empty folders, zero unresolved relative doc links, zero secrets in staged diff.
TESTS AND VERIFICATION: pnpm typecheck, pnpm lint, pnpm test, pnpm build, directory/link checks, git diff --cached secret check.
DOCUMENTATION TO UPDATE: docs/ui-ux/DESIGN_SYSTEM_AND_PWA.md, docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md, docs/phase-plans/PHASE-01-MILESTONE-02-design-system-shell-pwa.md, docs/progress/MILESTONE-REPORT-P1-M02.md, docs/README.md, docs/PROJECT_STATUS.md, docs/architecture/ARCHITECTURE_OVERVIEW.md, CHANGELOG.md, README.md.
GIT COMMIT MESSAGE: feat(ui-pwa): add design system themes, responsive shell, public landing and pwa skeleton
PUSH TARGET: origin main
ROLLBACK / RECOVERY NOTES: Revert commit on main; zero database migrations or persisted external state exist.
DEPENDENCIES: P1-M01 complete.
NEXT MILESTONE: P1-M03
```

---

## Candidate Next Bounded Milestone (Proposed — Not Started)

```text
MILESTONE ID: P1-M03
PHASE: Phase 1 — Foundation and multi-tenant platform
TITLE: Supabase Auth, Multi-Tenant Core Schema, PostgreSQL RLS & Cross-Tenant Denial Tests
OBJECTIVE: Set up local Supabase CLI + Docker stack, core tenant/person/membership tables (per ADR-0001 & ADR-0002), RLS policies, private Storage bucket baseline, real server-verified /sign-in & workspace resolution, and automated cross-tenant denial integration tests.
PRECONDITIONS: P1-M02 complete and pushed to origin/main; local Supabase CLI + Docker runtime available.
```
