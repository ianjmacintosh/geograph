import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Base config for all files
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: { js },
    extends: ["js/recommended"],
  },
  // Browser environment for client code
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  // TypeScript config
  ...tseslint.configs.recommended,
  // React config
  pluginReact.configs.flat.recommended,
  // 🔥 SERVER OVERRIDE - Node.js environment for server code
  {
    files: ["app/server/**/*.{js,ts}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off", // Console.log is totally fine in server code
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }], // Allow _unused variables
    },
  },
  // 🧪 TEST OVERRIDE - Test environment globals
  {
    files: ["**/*.test.{js,ts,tsx}", "**/__tests__/**/*.{js,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        // Add any test globals you need (vitest, etc.)
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off", // Tests often need any types
    },
  },
  // 🎯 REACT SETTINGS
  {
    files: ["**/*.{jsx,tsx}"],
    settings: {
      react: {
        version: "detect", // Automatically detect React version
      },
    },
  },
]);
