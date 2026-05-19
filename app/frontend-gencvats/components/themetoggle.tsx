"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "theme";

type ThemeToggleProps = {
  variant?: "fixed" | "inline";
};

export default function ThemeToggle({ variant = "fixed" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = stored === "dark" || (stored === null && prefersDark) ? "dark" : "light";
    root.classList.toggle("dark", initialTheme === "dark");
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const next = theme === "dark" ? "light" : "dark";
    root.classList.toggle("dark", next === "dark");
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  };

  if (variant === "fixed" && pathname.startsWith("/builder")) {
    return null;
  }

  const baseClass =
    "cursor-pointer rounded-full border border-[color-mix(in_oklab,var(--color-soft)_72%,white)] bg-[color-mix(in_oklab,var(--color-surface)_92%,white)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-lg backdrop-blur-md transition hover:border-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)]";

  const positionClass = variant === "fixed" ? "fixed right-4 top-4 z-[120]" : "z-30";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`${positionClass} ${baseClass}`}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "Light Mode" : "Dark Mode"}
    </button>
  );
}
