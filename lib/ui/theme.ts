import { z } from "zod";

export const THEME_FAMILIES = ["clarity", "calm", "focus"] as const;
export type ThemeFamily = (typeof THEME_FAMILIES)[number];

export const COLOR_MODES = ["light", "dark", "system"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

export const RESOLVED_COLOR_MODES = ["light", "dark"] as const;
export type ResolvedColorMode = (typeof RESOLVED_COLOR_MODES)[number];

export const UI_DENSITIES = ["compact", "comfortable"] as const;
export type UiDensity = (typeof UI_DENSITIES)[number];

export const THEME_STORAGE_KEYS = {
  theme: "dd-oodle:theme",
  mode: "dd-oodle:mode",
  density: "dd-oodle:density",
} as const;

export interface UiPreferences {
  theme: ThemeFamily;
  mode: ColorMode;
  density: UiDensity;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  theme: "clarity",
  mode: "system",
  density: "comfortable",
} as const;

export const themeFamilySchema = z.enum(THEME_FAMILIES);
export const colorModeSchema = z.enum(COLOR_MODES);
export const uiDensitySchema = z.enum(UI_DENSITIES);

export function isThemeFamily(value: unknown): value is ThemeFamily {
  return themeFamilySchema.safeParse(value).success;
}

export function isColorMode(value: unknown): value is ColorMode {
  return colorModeSchema.safeParse(value).success;
}

export function isUiDensity(value: unknown): value is UiDensity {
  return uiDensitySchema.safeParse(value).success;
}

export function resolveColorMode(
  mode: ColorMode,
  prefersDark: boolean,
): ResolvedColorMode {
  if (mode === "light" || mode === "dark") {
    return mode;
  }
  return prefersDark ? "dark" : "light";
}

export function parseStoredPreferences(raw: {
  theme?: unknown;
  mode?: unknown;
  density?: unknown;
}): UiPreferences {
  return {
    theme: isThemeFamily(raw.theme)
      ? raw.theme
      : DEFAULT_UI_PREFERENCES.theme,
    mode: isColorMode(raw.mode) ? raw.mode : DEFAULT_UI_PREFERENCES.mode,
    density: isUiDensity(raw.density)
      ? raw.density
      : DEFAULT_UI_PREFERENCES.density,
  };
}

/**
 * Generates an inline pre-hydration boot script with strict allowlist validation
 * and zero dynamic/untrusted string interpolation to prevent FOUC and XSS.
 */
export function buildThemeInitScript(): string {
  return `(function(){try{var root=document.documentElement;var themes=["clarity","calm","focus"];var modes=["light","dark","system"];var densities=["compact","comfortable"];var t=localStorage.getItem("dd-oodle:theme");var m=localStorage.getItem("dd-oodle:mode");var d=localStorage.getItem("dd-oodle:density");var theme=themes.indexOf(t)!==-1?t:"clarity";var mode=modes.indexOf(m)!==-1?m:"system";var density=densities.indexOf(d)!==-1?d:"comfortable";var resolved=mode==="system"?(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):mode;root.dataset.theme=theme;root.dataset.mode=resolved;root.dataset.density=density;root.style.colorScheme=resolved;}catch(_){}})();`;
}
