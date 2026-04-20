import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export function createVitestConfig(
  environment: "node" | "jsdom",
  include: string[],
) {
  return defineConfig({
    resolve: {
      alias: {
        "@": path.resolve(dirname, "./src"),
      },
    },
    test: {
      environment,
      globals: true,
      include,
      setupFiles:
        environment === "jsdom"
          ? ["./tests/support/setup-dom.ts"]
          : ["./tests/support/setup-node.ts"],
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
}
