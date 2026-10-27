import type { NextConfig } from "next";

// Serve at the domain root by default; set AGORA_BASE_PATH (e.g. "/agora") at build time to mount under a sub-path.
const basePath = (process.env.AGORA_BASE_PATH ?? "").replace(/\/+$/, "");

const config: NextConfig = {
  reactStrictMode: true,
  ...(basePath ? { basePath } : {}),
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default config;
