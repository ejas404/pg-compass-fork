import { spawnSync } from "node:child_process";

const pnpmExecutable = process.env.npm_execpath;
const command = pnpmExecutable ? process.execPath : "pnpm";
const args = pnpmExecutable
  ? [pnpmExecutable, "audit", "--prod", "--json"]
  : ["audit", "--prod", "--json"];

const audit = spawnSync(command, args, {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024,
});

if (audit.error || audit.signal) {
  console.error(
    audit.error?.message ||
      `pnpm audit was terminated by signal ${audit.signal ?? "unknown"}.`,
  );
  process.exit(1);
}

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  console.error(
    audit.error?.message ||
      audit.stderr ||
      "Unable to parse pnpm audit output.",
  );
  process.exit(1);
}

if (
  report.error ||
  typeof report.advisories !== "object" ||
  report.advisories === null
) {
  console.error(
    report.error?.summary ||
      report.error?.message ||
      audit.stderr ||
      "pnpm audit returned an invalid report.",
  );
  process.exit(1);
}

const blockingSeverities = new Set(["critical", "high"]);
const isDesktopDependencyPath = (dependencyPath) => {
  const normalizedPath = dependencyPath.replaceAll("\\", "/");
  return (
    normalizedPath.startsWith("apps/desktop") ||
    normalizedPath.startsWith("apps__desktop")
  );
};

const desktopAdvisories = Object.values(report.advisories ?? {}).filter(
  (advisory) =>
    blockingSeverities.has(advisory.severity) &&
    advisory.findings.some((finding) =>
      finding.paths.some(isDesktopDependencyPath),
    ),
);

if (desktopAdvisories.length > 0) {
  console.error("Desktop production dependency audit failed:");
  desktopAdvisories.forEach((advisory) => {
    console.error(
      `- ${advisory.severity}: ${advisory.module_name} — ${advisory.title}`,
    );
  });
  process.exit(1);
}

console.log(
  "Desktop production dependencies have no high or critical advisories.",
);
