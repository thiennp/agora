"use client";

import { usePathname } from "next/navigation";

/** The demo notice. Not shown inside an app (`/app/...`), whose pages say what that app does and does not do. */
export function SiteFooter() {
  if (usePathname().startsWith("/app/")) return null;
  return (
    <footer className="wrap small muted" style={{ paddingBottom: 32 }}>
      Demo mode: no accounts, simulated translation and delivery, and synthetic families on the dashboard. Nothing here is real user data.
    </footer>
  );
}
