"use client";
import { useCallback, useEffect, useState } from "react";

export type ThemeChoice = "light" | "dark" | "system";

const KEY = "pa:theme";

declare global {
  interface Window {
    __paApplyTheme?: () => void;
  }
}

function applyTheme() {
  if (typeof window === "undefined") return;
  if (typeof window.__paApplyTheme === "function") {
    window.__paApplyTheme();
    return;
  }
  try {
    const t = (localStorage.getItem(KEY) as ThemeChoice | null) ?? "system";
    const dark =
      t === "dark" ||
      (t === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
  } catch {
    // ignore
  }
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    try {
      const stored =
        (localStorage.getItem(KEY) as ThemeChoice | null) ?? "system";
      setChoice(stored);
    } catch {
      // ignore storage errors
    }
  }, []);

  const setTheme = useCallback((next: ThemeChoice) => {
    setChoice(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // ignore storage errors
    }
    applyTheme();
  }, []);

  return { theme: choice, setTheme };
}
