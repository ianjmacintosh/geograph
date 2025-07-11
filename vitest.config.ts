import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./app/test-setup.ts"],
    globals: true,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "tests/**",
      "tests-examples/**",
      "**/*.spec.ts",
    ],
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "./app"),
    },
  },
});
