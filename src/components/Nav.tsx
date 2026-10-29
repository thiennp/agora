"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";

function Links() {
  const path = usePathname();
  const as = useSearchParams().get("as") === "b" ? "b" : "a";
  // The QR home page and the start page are for a first-time visitor: no demo navigation, no persona switch.
  // Inside an app (`/app/...`) the app's own bar replaces the demo links and the Mia/Jonas switch.
  if (path === "/" || path.startsWith("/start") || path.startsWith("/app/")) return null;
  const q = `?as=${as}`;
  const item = (href: string, label: string, match: (p: string) => boolean) => (
    <Link href={`${href}${["/dashboard", "/docs", "/styleguide"].includes(href) ? "" : q}`} aria-current={match(path) ? "page" : undefined}>{label}</Link>
  );
  const here = path.startsWith("/dashboard") ? "/dashboard" : path.startsWith("/docs") ? "/docs" : path.startsWith("/styleguide") ? "/styleguide" : path.startsWith("/deals") ? "/deals" : path.startsWith("/items") ? "/items" : "/cards";
  return (
    <>
      <nav className="nav" aria-label="Main">
        {item("/cards", "Cards", (p) => p.startsWith("/cards"))}
        {item("/items", "Items", (p) => p.startsWith("/items"))}
        {item("/deals", "Deals", (p) => p.startsWith("/deals"))}
        {item("/dashboard", "Dashboard", (p) => p.startsWith("/dashboard"))}
        {item("/docs", "Docs", (p) => p.startsWith("/docs"))}
        {item("/styleguide", "Styleguide", (p) => p.startsWith("/styleguide"))}
      </nav>
      {here !== "/dashboard" && here !== "/docs" && here !== "/styleguide" ? (
        <div className="persona" role="group" aria-label="Act as">
          <Link href={`${path}?as=a`} aria-current={as === "a" ? "true" : undefined}>Mia · EN</Link>
          <Link href={`${path}?as=b`} aria-current={as === "b" ? "true" : undefined}>Jonas · DE</Link>
        </div>
      ) : null}
    </>
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
