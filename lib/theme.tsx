"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export type Theme = "dark" | "light";
export type ThemeMode = "dark" | "light" | "auto";

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  mode: "dark",
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode] = useState<ThemeMode>("dark");
  const [theme, setThemeState] = useState<Theme>("dark");

  const applyTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme-mode", "dark");
    applyTheme("dark");
  }, [applyTheme]);

  const setMode = useCallback((_m: ThemeMode) => {
    localStorage.setItem("theme-mode", "dark");
    applyTheme("dark");
  }, [applyTheme]);

  const toggleTheme = useCallback(() => {
    setMode("dark");
  }, [setMode]);

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
  return null;
}
