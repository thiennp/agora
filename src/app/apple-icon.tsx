import { ImageResponse } from "next/og";

import { MARK_PATH } from "@/components/ui";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon: the mark in white on a brand tile. Rendered at build time from the same path as the logo; no image file is shipped. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#6a3bc4" }}>
        <svg width="132" height="132" viewBox="0 0 32 32" fill="none">
          <path d={MARK_PATH} stroke="#ffffff" strokeWidth={3.5} strokeLinecap="round" />
          <circle cx="16" cy="16" r="3.2" fill="#ffffff" />
        </svg>
      </div>
    ),
    size,
  );
}
