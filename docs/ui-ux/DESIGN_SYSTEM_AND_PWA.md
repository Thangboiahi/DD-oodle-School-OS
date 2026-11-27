# DD-oodle Design System & PWA Architecture

> **Canonical Blueprint References:** [`../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md`](../../DD-oodle_MASTER_PROJECT_BLUEPRINT.md) (Part A §2.1, §12.1–§12.5, §17.3)  
> **Milestone:** `P1-M02`  
> **Status:** Active Baseline

---

## 1. Design Identity & Density

DD-oodle uses a **minimalistic, fluid, sleek and compact** visual language tailored for high-throughput school administration as well as calm daily student/parent reading:

- **Density Modes (`UiDensity`):**
  - `comfortable` (`--density-pad: 1rem`, `--density-gap: 1rem`) — default for general use, reading, student/parent views.
  - `compact` (`--density-pad: 0.625rem`, `--density-gap: 0.625rem`) — tighter operational spacing for dense administrative tables and schedules.

---

## 2. Three Theme Families (Light & Dark)

Implemented in `lib/ui/theme.ts` and `app/globals.css` using Tailwind CSS v4 `@theme inline` mapped to semantic CSS custom properties (`--bg-canvas`, `--bg-surface`, `--bg-elevated`, `--fg-primary`, `--fg-muted`, `--border-subtle`, `--border-strong`, `--accent`, `--accent-hover`, `--accent-fg`, `--status-success`, `--status-warning`, `--status-danger`, `--focus-ring`).

| Theme Family | Direction | Light Accent | Dark Accent | Target WCAG AA Contrast |
|---|---|---|---|---|
| **Clarity** (default) | Professional institutional blue & crisp slate | `#1D4ED8` (`#FFFFFF` fg) | `#60A5FA` (`#0F172A` fg) | >= 4.5:1 normal text; >= 3:1 UI borders/controls |
| **Calm** | Natural restrained green & sage/stone | `#15803D` (`#FFFFFF` fg) | `#4ADE80` (`#071A0E` fg) | >= 4.5:1 normal text; >= 3:1 UI borders/controls |
| **Focus** | Modern concentrated violet & cool surfaces | `#6D28D9` (`#FFFFFF` fg) | `#A78BFA` (`#140B29` fg) | >= 4.5:1 normal text; >= 3:1 UI borders/controls |

### Pre-Hydration Theme Safety (`buildThemeInitScript`)
- Client storage keys: `dd-oodle:theme`, `dd-oodle:mode`, `dd-oodle:density`.
- `buildThemeInitScript()` emits an inline pre-hydration script inside `<head>` wrapped in `try/catch` that validates stored values against exact hardcoded allowlists (`["clarity","calm","focus"]`, `["light","dark","system"]`, `["compact","comfortable"]`) and resolves `system` against `prefers-color-scheme` with zero untrusted string interpolation.

---

## 3. Four Responsive Shell Modes (`components/shell/AppShell.tsx`)

1. **Desktop (`>= 1024px`):** Collapsible left sidebar (`w-56` expanded / `w-16` icon rail), compact sticky top bar, and max-width workspace (`#main-content`).
2. **Tablet (`768px–1023px`):** Compact top bar with drawer trigger and slide-over sidebar drawer (`role="dialog"`, `aria-modal="true"`, Escape-key and backdrop dismissal).
3. **Mobile Portrait (`< 768px` portrait):** Compact sticky top bar, single-column content, and fixed bottom navigation bar (4 primary links with `env(safe-area-inset-bottom)` safe-area padding).
4. **Mobile Landscape (`< 1024px` wide and `<= 500px` tall):** Hides the portrait bottom bar and reveals a compact `w-14` left navigation rail so vertical reading space is preserved.

### Accessibility Guardrails
- Keyboard-accessible `Skip to main content` link targeting `#main-content`.
- Visible `:focus-visible` outline (`2px solid var(--focus-ring)`).
- Global `@media (prefers-reduced-motion: reduce)` rule disabling non-essential animations/transitions (including `Skeleton` pulse).
- Minimum `44px` (`min-h-11`) mobile touch targets on primary interactive buttons/nav links and `overflow-x-clip` overflow protection.
- Baseline state patterns in `components/ui/StateNotice.tsx`: `empty`, `error`, `permission-denied`, `offline`.

---

## 4. Security-First PWA & Offline Boundaries

Implemented natively on Next.js 16 without third-party SW wrappers:

- **Web App Manifest (`app/manifest.ts`):** `MetadataRoute.Manifest` referencing verified binary PNG icons (`192x192`, `512x512`, `maskable-512x512`).
- **Service Worker (`public/sw.js`):**
  - Precaches **only** `/offline.html` (`dd-oodle-shell-v1`).
  - Intercepts **only** same-origin `GET` `navigate` requests outside `/api/`, using network-first with fallback only to `/offline.html`.
  - **Never** caches HTML pages, `/api/*` endpoints, or tenant records.
  - Handles `DD_OODLE_CLEAR_CACHES` messages (via `clearPwaCaches()` in `components/pwa/ServiceWorkerRegistrar.tsx`) so future sign-out and tenant-switch workflows can purge non-shell caches.
- **Security Headers (`lib/security/headers.ts` -> `next.config.ts`):**
  - Global `/(.*)` -> `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
  - `/sw.js` -> `Content-Type: application/javascript; charset=utf-8`, `Cache-Control: no-cache, no-store, must-revalidate`, `Service-Worker-Allowed: /`, `Content-Security-Policy: default-src 'self'; script-src 'self'`.
