"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Links() {
  const path = usePathname();
  const as = useSearchParams().get("as") === "b" ? "b" : "a";
  const q = `?as=${as}`;
  const item = (href: string, label: string, match: (p: string) => boolean) => (
    <Link href={`${href}${href === "/dashboard" ? "" : q}`} aria-current={match(path) ? "page" : undefined}>{label}</Link>
  );
  const here = path.startsWith("/dashboard") ? "/dashboard" : path.startsWith("/deals") ? "/deals" : "/cards";
  return (
    <>
      <nav className="nav" aria-label="Main">
        {item("/cards", "Cards", (p) => p.startsWith("/cards"))}
        {item("/deals", "Deals", (p) => p.startsWith("/deals"))}
        {item("/dashboard", "Dashboard", (p) => p.startsWith("/dashboard"))}
      </nav>
      {here !== "/dashboard" ? (
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
      <div className="container">
        <Link href="/" className="brand">Ag<span>o</span>ra</Link>
        <Suspense fallback={null}>
          <Links />
        </Suspense>
      </div>
    </header>
  );
}
