"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The bar inside a created app: the app's name (a link to its overview) and, for a person using it, their own pages. No demo links, no persona switch. */
export function AppNav({ appId, appName, links }: { appId: string; appName: string; links: { path: string; label: string; badge?: number }[] }) {
  const path = usePathname();
  const home = `/app/${appId}`;
  return (
    <div className="stack" style={{ marginBottom: 16 }}>
      <p style={{ margin: 0 }}><Link href={home} style={{ fontWeight: 600 }}>{appName}</Link></p>
      {links.length ? (
        <nav className="nav" aria-label={`${appName} pages`}>
          {links.map((l) => {
            const href = `${home}${l.path}`;
            const here = l.path === "" ? path === home : path === href || path.startsWith(`${href}/`);
            return <Link key={l.path} href={href} aria-current={here ? "page" : undefined}>{l.label}{l.badge ? ` (${l.badge})` : ""}</Link>;
          })}
        </nav>
      ) : null}
    </div>
  );
}
