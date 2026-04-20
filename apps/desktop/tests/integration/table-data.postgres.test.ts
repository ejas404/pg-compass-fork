import { describe } from "vitest";
import {
  createSeededDatabase,
  hasPostgresTestConfig,
} from "../support/postgres";
import { runTableDataIntegrationSuite } from "./table-data.suite";

describe.runIf(hasPostgresTestConfig())("postgres authoritative suite", () => {
  runTableDataIntegrationSuite("postgres", createSeededDatabase);
});
