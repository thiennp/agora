import tseslint from "typescript-eslint";

const internals = {
  group: ["**/features/*/internal/**", "**/features/*/features/*/internal/**"],
  message: "Import a slice only through its public-api.",
};
const noApps = { group: ["**/apps/**"], message: "Platform code must not import an app; use loadApp()." };

// flat config replaces a rule per file, so each block lists every pattern that applies to it.
export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  { files: ["**/*.{ts,tsx}"], extends: [tseslint.configs.base] },
  {
    // SRC-02: no slice imports another slice's internal folder; platform never imports an app.
    files: ["src/**/*.{ts,tsx}"],
    rules: { "no-restricted-imports": ["error", { patterns: [internals, noApps] }] },
  },
  {
    // The registry is the single place platform code reaches into apps/.
    files: ["src/lib/app-config/load-app.ts", "src/lib/app-config/*.test.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [internals] }] },
  },
  {
    // APP-02: apps import nothing from the platform except its config API.
    files: ["apps/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/src/**", "@/*"], message: "Apps may only import @agora/app-config." }] },
      ],
    },
  },
);
