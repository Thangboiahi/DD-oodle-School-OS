# Phase 1 — Milestone 04: Global Sign-In, Verified Workspace Selector, Server-Side Tenant Context Resolver, Permission Engine & Platform Boundary

```text
MILESTONE ID: P1-M04
PHASE: Phase 1 — Foundation and multi-tenant platform
TITLE: Global Sign-In, Verified Workspace Selector, Server-Side Tenant Context Resolver, Permission Engine & Platform Boundary
OBJECTIVE: Implement DD-oodle's global person authentication, server-only tenant context resolution and permission engine, persistent workspace/institution switcher (with PWA cache clearing on switch/logout), institutional workspace shell (/t/[slug]), and strictly separated DD-oodle platform console shell (/platform) — without building Phase 2 registries or faking institutional student/staff data.
REQUIREMENTS / MASTER BLUEPRINT REFERENCES: Part A §2.2–§2.4, §4.1–§4.3, §11.3–§11.5, §12.5; Part B10–B13; ADR-0001; ADR-0002; OD-03.
PRECONDITIONS: P1-M03 & P1-M03b complete (c599486 / a4d73aa on main, live CI Run 45946043527 passed 26/26 pgTAP assertions).
IN SCOPE:
  - Pure security & navigation helpers: lib/auth/safe-redirect.ts, lib/auth/permissions.ts, lib/auth/navigation.ts, components/shell/nav-config.ts.
  - Server-only DAL & guards (import "server-only"): server/auth/types.ts, server/auth/session.ts, server/auth/guards.ts, server/tenancy/resolve-context.ts, plus untrusted subdomain hint forwarding in lib/supabase/proxy.ts.
  - Auth UI, workspace switcher & isolated shells: components/shell/AppShell.tsx, components/shell/WorkspaceSwitcher.tsx, components/auth/SignOutButton.tsx, app/auth/sign-out/route.ts, app/sign-in/{actions.ts,SignInForm.tsx,page.tsx}, app/workspace/page.tsx, app/t/[slug]/{layout.tsx,page.tsx}, app/platform/page.tsx, app/page.tsx.
  - Unit tests: tests/unit/{permissions,safe-redirect-and-nav,tenant-context-resolution}.test.ts.
  - Documentation & compliance updates across docs/ and root governance files.
OUT OF SCOPE:
  - Self-registration / institution onboarding wizard UI or password-reset templates.
  - Phase 2 tables or UI (students, guardians, classes, sections, subjects, teaching groups).
  - Chat UI or placeholder institutional metrics.
  - Modifying DD-oodle_MASTER_PROJECT_BLUEPRINT.md or weakening SQL/RLS policies.
EXPECTED FILES / DOMAINS: lib/auth/*, server/*, app/{sign-in,auth/sign-out,workspace,t/[slug],platform}/*, components/{auth,shell}/*, tests/unit/*, docs/*.
IMPLEMENTATION STEPS:
  1. Build pure sanitizeNextPath, evaluatePermission, and buildInstitutionNav helpers under lib/auth/.
  2. Build server-only DTOs, getClaims()-verified session/workspace loader, tenant context resolver, and platform/institution guards under server/.
  3. Update proxy.ts/lib/supabase/proxy.ts to sanitize and forward informational x-dd-oodle-tenant-hint on subdomain requests while preserving server getClaims() refresh.
  4. Extend AppShell with headerSlot/custom nav props and implement WorkspaceSwitcher + SignOutButton invoking clearPwaCaches().
  5. Implement global /sign-in, POST /auth/sign-out, /workspace, /t/[slug], /platform, and update / header link without leaking tenant existence or data.
  6. Add unit tests for permissions, safe-redirect/nav, and tenant context resolution; update docs and compliance register; run full local and CI verification.
SECURITY / PRIVACY / DATA RISKS:
  - Tenant enumeration or client header spoofing; mitigated by uniform denied states on unknown vs unauthorized slugs and stripping/re-parsing x-dd-oodle-tenant-hint on server verification.
  - Open-redirect loops on ?next=... or privilege leakage from platform_operators; mitigated via sanitizeNextPath and explicit separation in evaluatePermission and requirePlatformOperator.
  - Stale tenant views in PWA Service Worker cache after switching schools or signing out; mitigated via clearPwaCaches() before navigation.
ACCEPTANCE CRITERIA:
  - pnpm typecheck, pnpm lint, pnpm test (40/40 across 10 files), and pnpm build pass cleanly.
  - Every file in server/ imports "server-only"; no client component imports server/ or secret keys.
  - Zero empty directories, valid Markdown links, clean staged diff, pushed to origin/main with CI verified.
TESTS AND VERIFICATION: pnpm typecheck, pnpm lint, pnpm test, pnpm build, doc/link/secret checks, GitHub Actions app-quality + supabase-rls-pgtap.
DOCUMENTATION TO UPDATE: docs/phase-plans/PHASE-01-MILESTONE-04-auth-workspace-tenancy.md, docs/progress/MILESTONE-REPORT-P1-M04.md, docs/security/MULTI_TENANT_RLS_BASELINE.md, docs/compliance/COMPLIANCE_AND_RESEARCH_REGISTER.md, docs/architecture/ARCHITECTURE_OVERVIEW.md, docs/README.md, docs/PROJECT_STATUS.md, docs/ROADMAP.md, CHANGELOG.md, README.md.
GIT COMMIT MESSAGE: feat(auth-tenancy): add global sign-in, server tenant resolver, permission engine and workspace switcher
PUSH TARGET: origin main
ROLLBACK / RECOVERY NOTES: Revert commit cleanly on main without rewriting published history.
DEPENDENCIES: P1-M03b verified CI gate.
NEXT MILESTONE: P1-M05 — Phase 1 Exit Gate & Live Multi-Tenant Auth E2E Verification (browser + Playwright/REST smoke check against local Supabase stack + Phase 2 readiness review).
```

---

## Candidate Next Bounded Milestone (Proposed — Not Started)

```text
MILESTONE ID: P1-M05
PHASE: Phase 1 — Foundation and multi-tenant platform
TITLE: Phase 1 Exit Gate & Live Multi-Tenant Auth E2E Verification
OBJECTIVE: Verify the full Phase 1 exit gate end-to-end against a running Supabase stack (global sign-in as dual.member@example.test, workspace switching across sunrise-cbse vs valley-cbse, cross-tenant denial verification, and platform.ops denial on institutional routes) before opening Phase 2 registry and academic schema milestones.
PRECONDITIONS: P1-M04 merged on main and CI green.
```
