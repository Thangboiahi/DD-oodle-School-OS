import { describe, expect, it } from "vitest";
import {
  COLOR_MODES,
  DEFAULT_UI_PREFERENCES,
  THEME_FAMILIES,
  THEME_STORAGE_KEYS,
  UI_DENSITIES,
  buildThemeInitScript,
  isColorMode,
  isThemeFamily,
  isUiDensity,
  parseStoredPreferences,
  resolveColorMode,
} from "@/lib/ui/theme";

describe("lib/ui/theme", () => {
  it("defines strict allowlists and storage keys", () => {
    expect(THEME_FAMILIES).toEqual(["clarity", "calm", "focus"]);
    expect(COLOR_MODES).toEqual(["light", "dark", "system"]);
    expect(UI_DENSITIES).toEqual(["compact", "comfortable"]);
    expect(THEME_STORAGE_KEYS).toEqual({
      theme: "dd-oodle:theme",
      mode: "dd-oodle:mode",
      density: "dd-oodle:density",
    });
  });

  it("validates individual theme, mode, and density values", () => {
    expect(isThemeFamily("clarity")).toBe(true);
    expect(isThemeFamily("calm")).toBe(true);
    expect(isThemeFamily("focus")).toBe(true);
    expect(isThemeFamily("neon")).toBe(false);

    expect(isColorMode("light")).toBe(true);
    expect(isColorMode("dark")).toBe(true);
    expect(isColorMode("system")).toBe(true);
    expect(isColorMode("auto")).toBe(false);

    expect(isUiDensity("compact")).toBe(true);
    expect(isUiDensity("comfortable")).toBe(true);
    expect(isUiDensity("dense")).toBe(false);
  });

  it("resolves color mode against system preference", () => {
    expect(resolveColorMode("light", true)).toBe("light");
    expect(resolveColorMode("dark", false)).toBe("dark");
    expect(resolveColorMode("system", true)).toBe("dark");
    expect(resolveColorMode("system", false)).toBe("light");
  });

  it("falls back safely on invalid or missing stored preferences", () => {
    expect(parseStoredPreferences({})).toEqual(DEFAULT_UI_PREFERENCES);
    expect(
      parseStoredPreferences({
        theme: "<script>alert(1)</script>",
        mode: "sepia",
        density: 123,
      }),
    ).toEqual(DEFAULT_UI_PREFERENCES);
    expect(
      parseStoredPreferences({
        theme: "focus",
        mode: "dark",
        density: "compact",
      }),
    ).toEqual({
      theme: "focus",
      mode: "dark",
      density: "compact",
    });
  });

  it("builds a safe inline boot script using exact allowlists", () => {
    const script = buildThemeInitScript();

    expect(script).toContain("try{");
    expect(script).toContain("catch(_)");
    expect(script).toContain("localStorage.getItem");
    expect(script).toContain('["clarity","calm","focus"]');
    expect(script).toContain('["light","dark","system"]');
    expect(script).toContain('["compact","comfortable"]');
    expect(script).toContain("dataset.theme");
    expect(script).toContain("dataset.mode");
    expect(script).toContain("dataset.density");
    expect(script).toContain("colorScheme");
    expect(script).not.toContain("eval(");
    expect(script).not.toContain("http://");
    expect(script).not.toContain("https://");
  });
});
