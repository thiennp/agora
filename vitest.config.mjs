import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  css: { postcss: {} },
  resolve: { alias: [
      { find: "@agora/app-config", replacement: fileURLToPath(new URL("./src/lib/app-config/index.ts", import.meta.url)) },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ] },
  test: { include: ["src/**/*.test.ts", "apps/**/*.test.ts", "evals/**/*.test.ts"] },
});
