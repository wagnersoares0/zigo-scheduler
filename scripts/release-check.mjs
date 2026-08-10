import { spawnSync } from "node:child_process";

/**
 * Public package release gate.
 *
 * Website, demo and example sandboxes live outside the public package repo.
 * This command only checks what a clean GitHub clone must be able to prove:
 * source tests, TypeScript, lint, build artifacts, npm pack/install and the
 * dependency audit for shipped package metadata.
 */

const skipAudit = process.argv.includes("--skip-audit");
const debtWarningLimit = 106;

const steps = [
  { label: "tests", command: "npx", args: ["vitest", "run"] },
  { label: "types", command: "npx", args: ["tsc", "--noEmit"] },
  { label: "lint", command: "npx", args: ["eslint", ".", "--max-warnings=0"] },
  {
    label: "lint debt gate",
    command: "npx",
    args: ["eslint", ".", `--max-warnings=${debtWarningLimit}`],
    env: { ...process.env, LINT_DEBT: "1" },
  },
  { label: "build", command: "node", args: ["scripts/build.mjs"] },
  { label: "browser integration", command: "node", args: ["scripts/verify-browser.mjs"] },
  { label: "external package install", command: "node", args: ["scripts/verify-package.mjs"] },
  { label: "external framework installs", command: "node", args: ["scripts/verify-external-frameworks.mjs"] },
];

if (!skipAudit) {
  steps.push({ label: "npm audit", command: "npm", args: ["audit", "--audit-level=moderate"] });
}

const results = [];

for (const { label, command, args, env = process.env } of steps) {
  const start = Date.now();
  console.log(`\n==> ${label}\n`);
  const { status } = spawnSync(command, args, { stdio: "inherit", env });
  const ok = status === 0;
  results.push({ label, ok, seconds: ((Date.now() - start) / 1000).toFixed(1) });
  if (!ok) break;
}

console.log("\n==> summary\n");
for (const { label, ok, seconds } of results) {
  console.log(`${ok ? "OK    " : "FAILED"}  ${label.padEnd(28)} ${seconds}s`);
}

const failed = results.filter((result) => !result.ok);
if (failed.length === 0 && results.length === steps.length) {
  console.log(skipAudit ? "\nCI gate passed\n" : "\npackage is ready to publish\n");
  process.exit(0);
}

console.log(`\nfailed at: ${failed.map((result) => result.label).join(", ")}\n`);
process.exit(1);
