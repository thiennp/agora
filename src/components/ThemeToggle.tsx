"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icons";

const KEY = "agora-theme";

/** Inline script for <head>: applies the saved or system theme before first paint, so there is no flash. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches)document.documentElement.classList.add("dark")}catch(e){}`;

/** Light/dark switch. Dark mode is the `dark` class on <html>. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      /* storage can be blocked; the choice then lasts for this visit only */
    }
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label="Dark mode"
      title="Dark mode"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Icon name={dark ? "sun" : "moon"} size={18} />
    </button>
  );
}
