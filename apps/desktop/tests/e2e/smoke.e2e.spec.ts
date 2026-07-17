import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { expect, test } from "@playwright/test";

function getExecutablePath(): string {
  const appRoot = process.cwd();
  const platform = process.platform;
  const architecture = process.arch;

  if (platform === "win32") {
    return path.join(
      appRoot,
      "out",
      `PG Compass-win32-${architecture}`,
      "pg-compass.exe",
    );
  }

  if (platform === "darwin") {
    return path.join(
      appRoot,
      "out",
      `PG Compass-darwin-${architecture}`,
      "PG Compass.app",
      "Contents",
      "MacOS",
      "PG Compass",
    );
  }

  return path.join(
    appRoot,
    "out",
    `PG Compass-linux-${architecture}`,
    "pg-compass",
  );
}

test("starts the packaged application without a database", async () => {
  const executablePath = getExecutablePath();
  const storeDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "pg-compass-smoke-store-"),
  );

  expect(
    fs.existsSync(executablePath),
    `Packaged executable was not found at ${executablePath}`,
  ).toBe(true);

  const app = spawn(executablePath, [], {
    env: {
      ...process.env,
      PG_COMPASS_STORE_DIR: storeDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  try {
    await new Promise<void>((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Packaged app did not load its renderer. Process output:\n${output}`,
          ),
        );
      }, 20_000);

      const onOutput = (chunk: Buffer) => {
        output += chunk.toString();
        if (output.includes("[pg-compass] renderer-mounted")) {
          clearTimeout(timeout);
          resolve();
        }
      };

      app.stdout.on("data", onOutput);
      app.stderr.on("data", onOutput);
      app.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      app.once("exit", (code, signal) => {
        clearTimeout(timeout);
        reject(
          new Error(
            `Packaged app exited before its renderer loaded (code ${code}, signal ${signal}).\n${output}`,
          ),
        );
      });
    });
  } finally {
    if (app.exitCode === null) {
      const exited = new Promise<void>((resolve) => {
        app.once("exit", () => resolve());
      });
      app.kill();
      await Promise.race([
        exited,
        new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
      ]);
    }
    fs.rmSync(storeDir, { recursive: true, force: true });
  }
});
