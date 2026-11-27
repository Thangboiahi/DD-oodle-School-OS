# Milestone Report: P1-M04 — Global Sign-In, Verified Workspace Selector, Server-Side Tenant Context Resolver, Permission Engine & Platform Boundary

**Date:** 2026-11-27  
**Phase:** Phase 1 — Foundation and Multi-Tenant Platform  
**Milestone:** `P1-M04`  
**Status:** **Complete**

---

## 1. Summary of Changes

1. **Pure Security, Permission & Navigation Helpers (`lib/auth/`):**
   - Added [`safe-redirect.ts`](../../lib/auth/safe-redirect.ts) (`sanitizeNextPath`) restricting `?next=` redirects to sanitized relative internal paths and rejecting open redirects, schemes, backslashes, control characters, and `/auth/sign-out`.
   - Added [`permissions.ts`](../../lib/auth/permissions.ts) (`evaluatePermission`, `isAssignmentActiveAt`) evaluating active membership status, active role status, `startsAt`/`endsAt` time bounds, `"institution.*"` wildcard vs exact permissions, scope hierarchy (`institution` vs narrower scopes/refs), and explicitly blocking institutional access from `isPlatformOperator`.
   - Added [`navigation.ts`](../../lib/auth/navigation.ts) (`buildInstitutionNav`) assembling permission-filtered workspace navigation items (including `Phase 2` preview badge on People & Registry) documented explicitly as UX/code-splitting only rather than a security boundary.
2. **Server-Only Data Access Layer & Proxy Hint Boundary (`server/`, `lib/supabase/proxy.ts`):**
   - Added [`server/auth/types.ts`](../../server/auth/types.ts), [`server/auth/session.ts`](../../server/auth/session.ts), [`server/tenancy/resolve-context.ts`](../../server/tenancy/resolve-context.ts), and [`server/auth/guards.ts`](../../server/auth/guards.ts), each enforcing `import "server-only";`.
   - Verified authentication exclusively via `supabase.auth.getClaims()`, queried user data via the RLS-enforced user client (`createSupabaseServerClient()`), returned uniform `denied` states for nonexistent and unauthorized slugs, and isolated `requirePlatformOperator()` from institutional roles.
   - Updated [`lib/supabase/proxy.ts`](../../lib/supabase/proxy.ts) to strip client-spoofed `x-dd-oodle-tenant-hint` headers and forward parsed subdomain hints strictly as untrusted routing hints while refreshing session claims.
3. **Global Auth Flows, Switcher & Isolated Workspace Shells (`app/`, `components/`):**
   - Extended [`AppShell.tsx`](../../components/shell/AppShell.tsx) and [`nav-config.ts`](../../components/shell/nav-config.ts) with `navItems`, `secondaryNavItems`, `badgeText`, `headerSlot`, and additional semantic navigation icons while keeping `/shell-preview` compatibility.
   - Implemented [`WorkspaceSwitcher.tsx`](../../components/shell/WorkspaceSwitcher.tsx) and [`SignOutButton.tsx`](../../components/auth/SignOutButton.tsx) calling `clearPwaCaches()` before switching contexts or logging out via `POST /auth/sign-out`.
   - Implemented Zod-validated Server Action global sign-in on `/sign-in` (generic failure messages, authenticated redirect, clean unconfigured `StateNotice`), `/workspace`, `/t/[slug]` layout & overview page, `/platform` console shell, and updated `/`.
4. **Unit Tests (`tests/unit/`):**
   - Added `permissions.test.ts` (6 tests), `safe-redirect-and-nav.test.ts` (5 tests), and `tenant-context-resolution.test.ts` (5 tests).

---

## 2. Verification Results

- `pnpm typecheck`: **Passed** (0 errors)
- `pnpm lint`: **Passed** (0 errors)
- `pnpm test`: **Passed** (10 test files, 40/40 tests passed)
- `pnpm build`: **Passed** (Next.js 16 production build with `/`, `/api/health`, `/auth/sign-out`, `/platform`, `/shell-preview`, `/sign-in`, `/t/[slug]`, `/workspace`, and `ƒ Proxy (Middleware)`)
- **CI Verification:** Automated GitHub Actions run (`app-quality` + `supabase-rls-pgtap`) triggered on push to `main`.

---

## 3. Next Recommended Action

Proceed to **`P1-M05`** — Phase 1 Exit Gate & Live Multi-Tenant Auth E2E Verification across dual-institution accounts and platform operator boundaries before opening Phase 2.
