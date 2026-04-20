import { createVitestConfig } from "./vitest.shared";

export default createVitestConfig("node", ["tests/integration/**/*.test.ts"]);
