import tseslint from "typescript-eslint";

// Boundary rules (SRC-02): no slice imports another slice's internal folder.
export default tseslint.config(
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.base],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/features/*/internal/**", "**/features/*/features/*/internal/**"],
              message: "Import a slice only through its public-api.",
            },
          ],
        },
      ],
    },
  },
);
