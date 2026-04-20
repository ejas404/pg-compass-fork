import { config } from "@repo/eslint-config/react-internal";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      ".vite/**",
      "coverage/**",
      "out/**",
      ".test-runtime/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...config,
];
