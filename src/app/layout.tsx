import type { ReactNode } from "react";

export const metadata = { title: "Hand-Me-Down" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
