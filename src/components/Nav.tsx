"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

function Links() {
  const path = usePathname();
  // The QR home page, the start page and every app have their own look: no site navigation there.
  if (path === "/" || path.startsWith("/start") || path.startsWith("/app/")) return null;
  const item = (href: string, label: string) => (
    <Link href={href} aria-current={path.startsWith(href) ? "page" : undefined}>{label}</Link>
  );
  return (
    <nav className="nav" aria-label="Main">
      {item("/dashboard", "Dashboard")}
      {item("/docs", "Docs")}
      {item("/styleguide", "Styleguide")}
    </nav>
  );
}

export function Nav() {
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href="/" className="brand" aria-label="Agora home"><Logo /></Link>
        <Suspense fallback={null}>
          <Links />
        </Suspense>
        <ThemeToggle />
      </div>
    </header>
  );
}
