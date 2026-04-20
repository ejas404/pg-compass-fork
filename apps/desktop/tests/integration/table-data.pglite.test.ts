import { runTableDataIntegrationSuite } from "./table-data.suite";
import { createSeededPGliteDatabase } from "../support/pglite";

runTableDataIntegrationSuite("pglite", createSeededPGliteDatabase);
