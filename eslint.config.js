import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // 🚫 IGNORE uninvited guests - build files, reports, generated code
  {
    ignores: [
      "**/node_modules/**",
      "**/build/**",
      "**/dist/**",
      "**/.react-router/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/coverage/**",
      "**/.next/**",
      "**/.nuxt/**",
      "**/tests-examples/**", // Example/demo files
    ],
  },
  // Base config for all files
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    plugins: {
      js,
    },
    extends: ["js/recommended"],
    rules: {
      // McConnell's Code Complete recommendations
      complexity: ["error", { max: 10 }], // Warn at 5, error at 10, following McConnell's advice
      "max-lines-per-function": [
        "error",
        {
          max: 200,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  // Browser environment for client code
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  // TypeScript config
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    rules: {
      ...config.rules,
      "@typescript-eslint/no-explicit-any": "warn", // Allow 'any' type
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  })),
  // React config
  {
    ...pluginReact.configs.flat.recommended,
    settings: {
      react: {
        version: "19.1.0", // Explicitly set React version
      },
    },
  },
  // 🔥 SERVER OVERRIDE - Node.js environment for server code
  {
    files: ["app/server/**/*.{js,ts}", "server.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off", // Console.log is totally fine in server code
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ], // Allow _unused variables
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
  // 🎯 REACT JSX RULES
  {
    files: ["**/*.{jsx,tsx}"],
    rules: {
      "react/react-in-jsx-scope": "off", // React 19 has automatic JSX transform
      "react/jsx-uses-react": "off", // Not needed with automatic JSX transform
    },
  },
]);
