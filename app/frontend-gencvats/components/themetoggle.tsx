"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DarkTheme, LightTheme } from "@/components/icons";

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
  "group cursor-pointer rounded-full border border-[color-mix(in_oklab,var(--color-soft)_72%,white)] bg-[color-mix(in_oklab,var(--color-surface)_92%,white)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-lg backdrop-blur-md transition-all duration-300 ease-out hover:scale-[1.03] hover:border-[var(--color-primary)] hover:bg-[color-mix(in_oklab,var(--color-soft)_35%,white)] active:scale-95";

  const positionClass = variant === "fixed" ? "fixed right-4 top-4 z-[120]" : "z-30";

  return (
  <button
    type="button"
    onClick={toggleTheme}
    className={`${positionClass} ${baseClass} flex items-center gap-3`}
    aria-label="Toggle theme"
  >
    <div
      className="
        relative
        flex
        h-6
        w-12
        items-center
        rounded-full
        bg-[color-mix(in_oklab,var(--color-soft)_40%,white)]
        p-1
        transition-all
        duration-300
      "
    >
      <div
        className={`
          absolute
          flex
          h-4
          w-4
          items-center
          justify-center
          rounded-full
          bg-[var(--color-primary)]
          text-white
          shadow-md
          transition-all
          duration-300
          ease-out
          ${
            theme === "dark"
              ? "translate-x-6"
              : "translate-x-0"
          }
        `}
      >
        {theme === "dark" ? (
          <LightTheme className="h-3 w-3" />
        ) : (
          <DarkTheme className="h-3 w-3" />
        )}
      </div>
    </div>
  </button>
  );
}
