import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const seedSql = fs.readFileSync(
  path.resolve(process.cwd(), "tests/support/postgres-seed.sql"),
  "utf8",
);

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("Failed to allocate a free port.")));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(port);
      });
    });

    server.on("error", reject);
  });
}

export async function createSeededPGliteDatabase(): Promise<{
  connectionUrl: string;
  cleanup: () => Promise<void>;
}> {
  const db = await PGlite.create();
  await db.exec(seedSql);

  const port = await findFreePort();
  const server = new PGLiteSocketServer({
    db,
    host: "127.0.0.1",
    port,
  });

  await server.start();

  return {
    connectionUrl: `postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable`,
    cleanup: async () => {
      await server.stop();
      await db.close();
    },
  };
}
