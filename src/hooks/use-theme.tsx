import { useCallback, useEffect, useState } from "react";

type ThemeMode = "light" | "dark" | "system";

const FAV_DARK = "/favicon-light.ico";  // dark UI uses light favicon
const FAV_LIGHT = "/favicon-dark.ico";

function setFavicon(isDark: boolean) {
  const link = document.querySelector('link[rel*="icon"]') as HTMLLinkElement | null;
  if (link) link.href = isDark ? FAV_DARK : FAV_LIGHT;
}

function prefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * useTheme hook
 * Handles 'light' | 'dark' | 'system' mode
 */
export default function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("qivuli-app-theme") as ThemeMode) || "system";
  });

  // Derived theme (actual dark/light being applied)
  const [effectiveTheme, setEffectiveTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    if (localStorage.getItem("qivuli-app-theme") === "dark") return "dark";
    if (localStorage.getItem("qivuli-app-theme") === "light") return "light";
    return prefersDark() ? "dark" : "light";
  });

  /** Apply the chosen visual theme */
  const apply = useCallback((t: "light" | "dark") => {
    const root = document.documentElement;
    root.classList.toggle("dark", t === "dark");
    setFavicon(t === "dark");
  }, []);

  // When mode changes, update class and localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (mode === "system") {
      localStorage.removeItem("qivuli-app-theme");
      const current = prefersDark() ? "dark" : "light";
      setEffectiveTheme(current);
      apply(current);
    } else {
      localStorage.setItem("qivuli-app-theme", mode);
      setEffectiveTheme(mode);
      apply(mode);
    }
  }, [mode, apply]);

  // Watch system changes only in system mode
  useEffect(() => {
    if (typeof window === "undefined" || mode !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? "dark" : "light";
      setEffectiveTheme(newTheme);
      apply(newTheme);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [mode, apply]);

  // Helpers
  const setTheme = useCallback((t: ThemeMode) => setMode(t), []);
  const toggle = useCallback(() => {
    setMode((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return {
    mode,               // "light" | "dark" | "system"
    effectiveTheme,     // actual applied: "light" | "dark"
    setTheme,           // setTheme("system" | "light" | "dark")
    toggle,             // toggles light/dark only
  };
}