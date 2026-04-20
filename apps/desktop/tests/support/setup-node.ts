import { afterEach } from "vitest";

afterEach(() => {
  delete process.env.PG_COMPASS_STORE_DIR;
  delete process.env.PG_COMPASS_TEST_DATABASE_URL;
  delete process.env.PG_COMPASS_TEST_ADMIN_DATABASE_URL;
  delete process.env.PG_COMPASS_TEST_SAVE_DIALOG_DIR;
  delete process.env.PG_COMPASS_TEST_SAVE_DIALOG_PATH;
});
