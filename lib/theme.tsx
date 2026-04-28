"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export type Theme = "dark" | "light";
export type ThemeMode = "dark" | "light" | "auto";

function getAutoTheme(): Theme {
  // 1. Prefer system preference (prefers-color-scheme)
  if (typeof window !== "undefined" && window.matchMedia) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  }
  // 2. Fallback: time-based (06:00–18:00 = light)
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  mode: "auto",
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [theme, setThemeState] = useState<Theme>("dark");

  const applyTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  // Initialize from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("theme-mode") as ThemeMode | null;
    if (savedMode === "dark" || savedMode === "light") {
      setModeState(savedMode);
      applyTheme(savedMode);
    } else if (savedMode === "auto") {
      setModeState("auto");
      applyTheme(getAutoTheme());
    } else {
      setModeState("dark");
      applyTheme("dark");
    }
  }, [applyTheme]);

  // Listen for system preference changes in auto mode
  useEffect(() => {
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme(getAutoTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode, applyTheme]);

  // In auto mode, also check time-based changes every minute
  useEffect(() => {
    if (mode !== "auto") return;
    const interval = setInterval(() => applyTheme(getAutoTheme()), 60_000);
    return () => clearInterval(interval);
  }, [mode, applyTheme]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem("theme-mode", m);
    if (m === "auto") {
      applyTheme(getAutoTheme());
    } else {
      applyTheme(m);
    }
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    // Cycle: auto → light → dark → auto
    const next: ThemeMode = mode === "auto" ? "light" : mode === "light" ? "dark" : "auto";
    setMode(next);
  }, [mode, setMode]);

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeSwitcher() {
  const { mode, toggleTheme } = useTheme();
  const label = mode === "auto" ? "อัตโนมัติ" : mode === "light" ? "สว่าง" : "มืด";
  const icon = mode === "auto" ? "🌗" : mode === "light" ? "☀️" : "🌙";

  return (
    <button
      onClick={toggleTheme}
      className="px-2 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm hover:border-[var(--accent)] transition cursor-pointer flex items-center gap-1"
      title={`ธีม: ${label} (คลิกเพื่อสลับ)`}
    >
      <span>{icon}</span>
      <span className="text-xs hidden sm:inline" style={{ color: "var(--text-muted)" }}>{label}</span>
    </button>
  );
}
