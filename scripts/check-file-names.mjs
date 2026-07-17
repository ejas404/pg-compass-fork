import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOTS = ["apps/desktop/src", "apps/desktop/tests", "packages", "scripts"];
const CONVENTIONAL_FILES = new Set(["README.md"]);
const KEBAB_CASE_FILE = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+)*$/;

const projectFiles = execFileSync(
  "git",
  [
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
    "--",
    ...ROOTS,
  ],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);

const invalidFiles = projectFiles.filter((filePath) => {
  const fileName = path.basename(filePath);
  return !CONVENTIONAL_FILES.has(fileName) && !KEBAB_CASE_FILE.test(fileName);
});

if (invalidFiles.length > 0) {
  console.error("Project-authored files must use kebab-case:");
  invalidFiles.forEach((filePath) => console.error(`- ${filePath}`));
  process.exitCode = 1;
} else {
  console.log("File naming check passed.");
}
