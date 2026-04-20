import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    environmentMatchGlobs: [["tests/integration/**/*.test.ts", "node"]],
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
    ],
    setupFiles: ["./tests/support/setup-dom.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      exclude: [
        "tests/**",
        "*.config.*",
        "forge.config.ts",
        "vitest*.ts",
        "src/electron.d.ts",
        "src/vite-env.d.ts",
        "src/polyfills.ts",
        "src/renderer.tsx",
        "src/main.ts",
      ],
      thresholds: {
        "src/main/**/*.ts": {
          lines: 12,
          functions: 45,
          branches: 55,
          statements: 12,
        },
        "src/preload.ts": {
          lines: 55,
          functions: 8,
          branches: 100,
          statements: 55,
        },
        "src/hooks/**/*.tsx": {
          lines: 45,
          functions: 60,
          branches: 55,
          statements: 45,
        },
      },
    },
  },
});
