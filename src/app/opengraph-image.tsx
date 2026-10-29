import { ImageResponse } from "next/og";

import { MARK_PATH } from "@/components/ui";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Agora: a platform for community apps";

/** The picture a chat or social app shows when a link to the site is shared. Rendered at build time; no image file is shipped. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 96px",
          background: "#f4f3f8",
          color: "#1b1730",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg width="112" height="112" viewBox="0 0 32 32" fill="none">
            <path d={MARK_PATH} stroke="#6a3bc4" strokeWidth={3.5} strokeLinecap="round" />
            <circle cx="16" cy="16" r="3.2" fill="#1b1730" />
          </svg>
          <div style={{ fontSize: 120, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}>Agora</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 40, color: "#5a5470" }}>A platform for community apps. Scan a code, answer a few questions, share your app.</div>
      </div>
    ),
    size,
  );
}
