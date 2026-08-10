import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";

/**
 * Packs the npm artifacts and installs them into clean framework projects
 * outside the monorepo. This catches the class of bugs workspace aliases hide:
 * broken package exports, CSS paths, peer deps and SSR-unsafe imports.
 */

const rootDir = process.cwd();
const fixtureRoot = path.join(rootDir, "tests/frameworks");
const PACKAGES = ["core", "engine", "layout", "interaction", "element", "react", "recurrence"];

const ok = (label, detail = "") => console.log(`OK      ${label.padEnd(34)} ${detail}`);

const run = (label, command, args, cwd, env = {}) => {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")}\n${result.stdout}${result.stderr}`.trim());
  }
  ok(label, result.stdout.trim().split("\n").pop() ?? "");
  return result.stdout;
};

const packPackages = (tarballDir) =>
  PACKAGES.map((name) => {
    const result = spawnSync("npm", ["pack", "--pack-destination", tarballDir, "--json"], {
      cwd: path.join(rootDir, "packages", name),
      encoding: "utf8",
      stdio: "pipe",
    });
    if (result.status !== 0) throw new Error(`npm pack failed for ${name}\n${result.stdout}${result.stderr}`);
    const [entry] = JSON.parse(result.stdout);
    ok(`pack ${name}`, entry.filename);
    return path.join(tarballDir, entry.filename);
  });

const copyFixture = (name, target) => {
  cpSync(path.join(fixtureRoot, name), target, { recursive: true });
};

const assertExternalInstall = (projectDir, label) => {
  const resolved = run(
    `${label} resolves scheduler-react`,
    "node",
    ["-p", "require.resolve('@zigoschedule/scheduler-react/package.json')"],
    projectDir,
  ).trim();
  if (resolved.startsWith(rootDir)) throw new Error(`${label} resolved the workspace package`);
};

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("No free port found"));
      });
    });
  });

const waitForOutput = (child, pattern, label) =>
  new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`${label} did not start\n${output}`)), 30_000);
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(pattern);
      if (!match) return;
      clearTimeout(timeout);
      resolve(match[1]);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => {
      if (code !== null && code !== 0) reject(new Error(`${label} exited with ${code}\n${output}`));
    });
  });

const withServer = async (label, command, args, cwd, readyPattern, test) => {
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const url = await waitForOutput(child, readyPattern, label);
    await test(url);
    ok(label, url);
  } finally {
    child.kill("SIGTERM");
  }
};

const browserSmoke = async (url, assertions) => {
  const browser = await chromium.launch();
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on("pageerror", (error) => errors.push(error));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(new Error(message.text()));
    });
    await page.goto(url);
    await assertions(page);
    if (errors.length > 0) throw errors[0];
  } finally {
    await browser.close();
  }
};

const dragDown = async (page, locator, dy) => {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("Drag target is not visible");
  const x = box.x + box.width / 2;
  const y = box.y + Math.min(24, Math.max(8, box.height / 2));
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps: 10 });
  await page.mouse.up();
};

const installVite = (projectDir, tarballs) => {
  run("Vite install", "npm", [
    "install", "--no-audit", "--no-fund",
    ...tarballs,
    "react@18.3.1", "react-dom@18.3.1", "vite@8.2.1", "@vitejs/plugin-react@6.0.5",
  ], projectDir);
};

const installNext = (projectDir, tarballs) => {
  run("Next install", "npm", [
    "install", "--no-audit", "--no-fund",
    ...tarballs,
    "next@16.3.0", "react@19.2.8", "react-dom@19.2.8",
  ], projectDir);
};

const verifyVite = async (tempDir, tarballs) => {
  const projectDir = path.join(tempDir, "vite-consumer");
  copyFixture("vite", projectDir);
  installVite(projectDir, tarballs);
  assertExternalInstall(projectDir, "Vite");
  run("Vite build", "npm", ["run", "build"], projectDir);
  await withServer("Vite browser smoke", "node", ["server.mjs"], projectDir, /READY (http:\/\/[^\s]+)/, async (url) => {
    await browserSmoke(url, async (page) => {
      await page.getByTestId("vite-ready").waitFor();
      const card = page.getByRole("button", { name: /Olivia Carter/i });
      await dragDown(page, card, 136);
      const log = await page.getByTestId("last-change").textContent();
      if (log !== "move:appt_1") throw new Error(`Vite drag did not update host state: ${log}`);
      await card.click();
      await page.getByRole("dialog", { name: /Olivia Carter/i }).waitFor();
    });
  });
};

const verifyNext = async (tempDir, tarballs) => {
  const projectDir = path.join(tempDir, "next-consumer");
  copyFixture("next", projectDir);
  installNext(projectDir, tarballs);
  assertExternalInstall(projectDir, "Next");
  run("Next build", "npm", ["run", "build"], projectDir, { NEXT_TELEMETRY_DISABLED: "1" });
  const port = await freePort();
  await withServer(
    "Next SSR browser smoke",
    "npm",
    ["run", "start", "--", "--hostname", "127.0.0.1", "--port", String(port)],
    projectDir,
    new RegExp(`(http://127\\.0\\.0\\.1:${port})`),
    async (url) => {
      await browserSmoke(url, async (page) => {
        await page.getByText("SSR columns: 2; events: 2").waitFor();
        await page.getByRole("button", { name: /Olivia Carter/i }).click();
        await page.getByRole("dialog", { name: /Olivia Carter/i }).waitFor();
      });
    },
  );
};

const tempDir = mkdtempSync(path.join(tmpdir(), "zigo-frameworks-"));

try {
  const tarballDir = path.join(tempDir, "tarballs");
  mkdirSync(tarballDir);
  const tarballs = packPackages(tarballDir);
  await verifyVite(tempDir, tarballs);
  await verifyNext(tempDir, tarballs);
  console.log("\nexternal framework checks passed\n");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`FAILED  external framework verification ${message.slice(0, 220)}`);
  process.exitCode = 1;
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

if (process.exitCode) process.exit(process.exitCode);
