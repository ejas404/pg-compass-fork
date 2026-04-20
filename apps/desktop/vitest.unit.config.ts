import { createVitestConfig } from "./vitest.shared";

export default createVitestConfig("jsdom", [
  "tests/unit/**/*.test.ts",
  "tests/unit/**/*.test.tsx",
]);
