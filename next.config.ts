import type { NextConfig } from "next";

// Serve at the domain root by default; set AGORA_BASE_PATH (e.g. "/agora") at build time to mount under a sub-path.
const basePath = (process.env.AGORA_BASE_PATH ?? "").replace(/\/+$/, "");

const config: NextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
  // An assistant asking /start for markdown or plain text (or ?format=md) gets the brief instead of the page; the same for an app's public page.
  async rewrites() {
    const brief = "/start/agent.md";
    const asMarkdown = "^(?!.*text/html).*text/(markdown|plain).*";
    return [
      { source: "/start", has: [{ type: "header" as const, key: "accept", value: asMarkdown }], destination: brief },
      { source: "/start", has: [{ type: "query" as const, key: "format", value: "md" }], destination: brief },
      { source: "/app/:app", has: [{ type: "header" as const, key: "accept", value: asMarkdown }], destination: "/app/:app/agent.md" },
      { source: "/app/:app", has: [{ type: "query" as const, key: "format", value: "md" }], destination: "/app/:app/agent.md" },
    ];
  },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default config;
