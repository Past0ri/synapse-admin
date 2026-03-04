import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import unusedImports from "eslint-plugin-unused-imports";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: "./tsconfig.eslint.json",
      },
    },
    plugins: {
      import: importPlugin,
      "unused-imports": unusedImports,
    },
    rules: {
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: ["**/vite.config.ts", "**/*.test.ts", "**/*.test.tsx", "**/vitest.setup.ts"],
        },
      ],
      "import/order": [
        "warn",
        {
          alphabetize: {
            order: "asc",
            caseInsensitive: false,
          },
          "newlines-between": "always",
          groups: ["external", "builtin", "internal", ["parent", "sibling", "index"]],
        },
      ],
      "unused-imports/no-unused-imports": "error",
    },
  },
];
