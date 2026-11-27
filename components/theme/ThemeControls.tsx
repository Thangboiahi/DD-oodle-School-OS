"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import {
  COLOR_MODES,
  THEME_FAMILIES,
  UI_DENSITIES,
  type ColorMode,
  type ThemeFamily,
  type UiDensity,
} from "@/lib/ui/theme";

const THEME_LABELS: Record<ThemeFamily, string> = {
  clarity: "Clarity",
  calm: "Calm",
  focus: "Focus",
};

const MODE_LABELS: Record<ColorMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

const DENSITY_LABELS: Record<UiDensity, string> = {
  compact: "Compact",
  comfortable: "Comfortable",
};

interface ThemeControlsProps {
  compact?: boolean;
}

export function ThemeControls({ compact = false }: ThemeControlsProps) {
  const { theme, mode, density, setTheme, setMode, setDensity } = useTheme();

  const optionClass = (active: boolean) =>
    [
      "inline-flex items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-colors",
      compact ? "min-h-9" : "min-h-11 sm:min-h-9",
      active
        ? "border-accent bg-accent text-accent-fg"
        : "border-border-subtle bg-surface text-fg hover:bg-elevated hover:border-border-strong",
    ].join(" ");

  return (
    <div
      className={
        compact
          ? "flex flex-col gap-2.5 text-xs"
          : "grid gap-3 sm:grid-cols-3"
      }
      aria-label="Appearance and density controls"
    >
      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-xs font-medium text-fg-muted">
          Theme Family
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {THEME_FAMILIES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={theme === item}
              onClick={() => setTheme(item)}
              className={optionClass(theme === item)}
            >
              {THEME_LABELS[item]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-xs font-medium text-fg-muted">
          Color Mode
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_MODES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={mode === item}
              onClick={() => setMode(item)}
              className={optionClass(mode === item)}
            >
              {MODE_LABELS[item]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="mb-1.5 text-xs font-medium text-fg-muted">
          Density
        </legend>
        <div className="flex flex-wrap gap-1.5">
          {UI_DENSITIES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={density === item}
              onClick={() => setDensity(item)}
              className={optionClass(density === item)}
            >
              {DENSITY_LABELS[item]}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
