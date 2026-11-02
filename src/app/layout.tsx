import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { THEME_INIT_SCRIPT } from "@/components/ThemeToggle";
import { PUBLIC_BASE_URL } from "./_composition/public-url";
import "./globals.css";

export const metadata = {
  // The public origin, so the share image and icons get absolute addresses; the sub-path comes from `basePath`.
  metadataBase: new URL(new URL(PUBLIC_BASE_URL).origin),
  title: "Agora",
  description: "A platform for community apps, run here as a demo with a kids' gear exchange.",
};
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
      </body>
    </html>
  );
}
