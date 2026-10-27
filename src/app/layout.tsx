import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata = { title: "Agora", description: "A platform for community apps, run here as a demo with a kids' gear exchange." };
export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="btn skip">Skip to content</a>
        <Nav />
        <main id="main" className="container">{children}</main>
        <footer className="container small muted" style={{ paddingBottom: 32 }}>
          Demo mode: no accounts, simulated translation and carrier, synthetic families in the dashboard. Nothing here is real user data.
        </footer>
      </body>
    </html>
  );
}
