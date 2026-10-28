import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";
import { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata = { title: "Agora", description: "A platform for community apps, run here as a demo with a kids' gear exchange." };
export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <a href="#main" className="btn skip">Skip to content</a>
        <Nav />
        <main id="main" className="wrap">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
