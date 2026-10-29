"use client";

import { usePathname } from "next/navigation";

/** The demo notice. Not shown inside an app (`/app/...`), whose pages say what that app does and does not do. */
export function SiteFooter() {
  if (usePathname().startsWith("/app/")) return null;
  return (
    <footer className="wrap small muted" style={{ paddingBottom: 32 }}>
      Shipping labels and tracking are not connected to a real carrier yet. The dashboard shows a simulation with synthetic families, not real people.
    </footer>
  );
}
