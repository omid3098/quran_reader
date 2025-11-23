/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference types="vitest/config" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // @ts-expect-error - Vite version mismatch between vitest and vite
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["__tests__/unit/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", "__tests__/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "dist/**",
        "__tests__/**",
        "**/*.d.ts",
        "**/*.config.{ts,js,mjs}",
        "**/index.tsx",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
