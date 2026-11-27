"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEFAULT_UI_PREFERENCES,
  THEME_STORAGE_KEYS,
  parseStoredPreferences,
  resolveColorMode,
  type ColorMode,
  type ResolvedColorMode,
  type ThemeFamily,
  type UiDensity,
} from "@/lib/ui/theme";

interface ThemeSnapshot {
  theme: ThemeFamily;
  mode: ColorMode;
  resolvedMode: ResolvedColorMode;
  density: UiDensity;
}

interface ThemeContextValue extends ThemeSnapshot {
  setTheme: (theme: ThemeFamily) => void;
  setMode: (mode: ColorMode) => void;
  setDensity: (density: UiDensity) => void;
}

const SERVER_SNAPSHOT: ThemeSnapshot = {
  theme: DEFAULT_UI_PREFERENCES.theme,
  mode: DEFAULT_UI_PREFERENCES.mode,
  resolvedMode: "light",
  density: DEFAULT_UI_PREFERENCES.density,
};

let cachedClientSnapshot: ThemeSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function readBrowserSnapshot(): ThemeSnapshot {
  if (typeof window === "undefined") {
    return SERVER_SNAPSHOT;
  }

  let rawTheme: string | null = null;
  let rawMode: string | null = null;
  let rawDensity: string | null = null;

  try {
    rawTheme = window.localStorage.getItem(THEME_STORAGE_KEYS.theme);
    rawMode = window.localStorage.getItem(THEME_STORAGE_KEYS.mode);
    rawDensity = window.localStorage.getItem(THEME_STORAGE_KEYS.density);
  } catch {
    // Ignore storage read blocks (private browsing / restricted storage).
  }

  const parsed = parseStoredPreferences({
    theme: rawTheme,
    mode: rawMode,
    density: rawDensity,
  });

  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const resolvedMode = resolveColorMode(parsed.mode, prefersDark);

  if (
    cachedClientSnapshot.theme === parsed.theme &&
    cachedClientSnapshot.mode === parsed.mode &&
    cachedClientSnapshot.resolvedMode === resolvedMode &&
    cachedClientSnapshot.density === parsed.density
  ) {
    return cachedClientSnapshot;
  }

  cachedClientSnapshot = {
    theme: parsed.theme,
    mode: parsed.mode,
    resolvedMode,
    density: parsed.density,
  };
  return cachedClientSnapshot;
}

function getServerSnapshot(): ThemeSnapshot {
  return SERVER_SNAPSHOT;
}

function emitChange(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }

  const handleStorage = () => emitChange();
  window.addEventListener("storage", handleStorage);

  const mediaQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(prefers-color-scheme: dark)")
      : null;

  const handleMediaChange = () => emitChange();
  mediaQuery?.addEventListener("change", handleMediaChange);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
    mediaQuery?.removeEventListener("change", handleMediaChange);
  };
}

function writeStorageKey(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or private mode failures.
  }
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    readBrowserSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = snapshot.theme;
    root.dataset.mode = snapshot.resolvedMode;
    root.dataset.density = snapshot.density;
    root.style.colorScheme = snapshot.resolvedMode;
  }, [snapshot.theme, snapshot.resolvedMode, snapshot.density]);

  const setTheme = useCallback((theme: ThemeFamily) => {
    writeStorageKey(THEME_STORAGE_KEYS.theme, theme);
    emitChange();
  }, []);

  const setMode = useCallback((mode: ColorMode) => {
    writeStorageKey(THEME_STORAGE_KEYS.mode, mode);
    emitChange();
  }, []);

  const setDensity = useCallback((density: UiDensity) => {
    writeStorageKey(THEME_STORAGE_KEYS.density, density);
    emitChange();
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: snapshot.theme,
        mode: snapshot.mode,
        resolvedMode: snapshot.resolvedMode,
        density: snapshot.density,
        setTheme,
        setMode,
        setDensity,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
}
