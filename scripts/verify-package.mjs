import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Installs the packages from outside the monorepo and uses them like a stranger
 * would.
 *
 * Testing inside the workspace does not prove distribution correctness: aliases
 * can hide broken `exports`, wrong dependency ranges and missing files. This
 * script runs real `npm pack`, installs into a clean folder, then exercises both
 * package entry points: `require()` and `import`.
 *
 * It answers "will this open in a sandbox?" before a user has to file the issue.
 */

const PACKAGES = ["core", "engine", "layout", "interaction", "element", "react", "recurrence"];
const packageName = (name) => `@zigoschedule/scheduler-${name}`;
const listFiles = (dir, prefix = "") =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path, name) : [name];
  });

let failures = 0;
const check = (label, ok, detail = "") => {
  console.log(`${ok ? "OK     " : "FAILED "} ${label.padEnd(38)} ${detail}`);
  if (!ok) failures++;
};

const tempDir = mkdtempSync(join(tmpdir(), "zigo-package-"));

try {
  console.log("  packing...");
  for (const name of PACKAGES) {
    execSync(`npm pack --pack-destination ${tempDir}`, {
      cwd: join("packages", name),
      stdio: "pipe",
    });
  }

  // No `"type": "module"`: this is a CommonJS project, the hardest case.
  writeFileSync(join(tempDir, "package.json"), JSON.stringify({ name: "package-consumer", private: true }));

  console.log("  installing into a clean folder...");
  const output = execSync("npm install ./*.tgz --no-audit --no-fund", {
    cwd: tempDir,
    stdio: "pipe",
  }).toString();
  check("installs outside the monorepo", /added \d+ packages/.test(output), output.trim().split("\n").pop());

  const AGENDA = `{
    date: new Date(2026, 7, 10),
    view: "week",
    timeZone: "America/New_York",
    appointments: [{
      id: "1",
      startsAt: zonedTimeToUtc("2026-08-04", 540, "America/New_York").toISOString(),
      durationMinutes: 60, clientName: "Maya Carter", status: "confirmed",
      professionalId: "dr-lee", recurrence: "FREQ=WEEKLY;BYDAY=TU",
    }],
    professionals: [{ id: "dr-lee", name: "Dr. Lee" }],
    width: 900, height: 600,
  }`;

  // require(), for older projects.
  writeFileSync(
    join(tempDir, "cjs.js"),
    `const { buildAgendaLayout, hasRecurrenceExpander } = require("@zigoschedule/scheduler-layout");
     const { getAgendaMessages, zonedTimeToUtc } = require("@zigoschedule/scheduler-core");
     const { ptBRMessages } = require("@zigoschedule/scheduler-core/locales/pt-BR");
     require("@zigoschedule/scheduler-recurrence");
     require("@zigoschedule/scheduler-element");
     const m = buildAgendaLayout(${AGENDA});
     console.log(JSON.stringify({
       columns: m.columns.length,
       cards: m.events.length,
       plugin: hasRecurrenceExpander(),
       locale: getAgendaMessages("pt-BR", ptBRMessages).today,
       ids: m.events.map((event) => event.id),
       days: m.events.map((event) => event.dayKey),
     }));`
  );
  const cjs = JSON.parse(execSync("node cjs.js", { cwd: tempDir, stdio: "pipe" }).toString());
  check("require() works", cjs.columns === 7, `${cjs.columns} columns`);
  check(
    "recurrence installs via require()",
    cjs.plugin && cjs.cards === 1 && cjs.days.includes("2026-08-11") && cjs.ids.some((id) => id !== "1"),
    `${cjs.cards} card · plugin ${cjs.plugin ? "yes" : "no"} · ${cjs.days.join(",") || "no days"}`
  );
  check("locale pack works via require()", cjs.locale === "Hoje", cjs.locale);

  // import(), for modern projects.
  writeFileSync(
    join(tempDir, "esm.mjs"),
    `import { buildAgendaLayout, hasRecurrenceExpander } from "@zigoschedule/scheduler-layout";
     import { getAgendaMessages, zonedTimeToUtc } from "@zigoschedule/scheduler-core";
     import { ptBRMessages } from "@zigoschedule/scheduler-core/locales/pt-BR";
     import "@zigoschedule/scheduler-recurrence";
     import "@zigoschedule/scheduler-element";
     const m = buildAgendaLayout(${AGENDA});
     console.log(JSON.stringify({
       columns: m.columns.length,
       cards: m.events.length,
       plugin: hasRecurrenceExpander(),
       locale: getAgendaMessages("pt-BR", ptBRMessages).today,
       ids: m.events.map((event) => event.id),
       days: m.events.map((event) => event.dayKey),
     }));`
  );
  const esm = JSON.parse(execSync("node esm.mjs", { cwd: tempDir, stdio: "pipe" }).toString());
  check("import works", esm.columns === 7, `${esm.columns} columns`);
  check(
    "recurrence installs via import",
    esm.plugin && esm.cards === 1 && esm.days.includes("2026-08-11") && esm.ids.some((id) => id !== "1"),
    `${esm.cards} card · plugin ${esm.plugin ? "yes" : "no"} · ${esm.days.join(",") || "no days"}`
  );
  check("locale pack works via import", esm.locale === "Hoje", esm.locale);

  const recurrenceRoot = dirname(
    execSync("node -p \"require.resolve('@zigoschedule/scheduler-recurrence/package.json')\"", {
      cwd: tempDir,
      stdio: "pipe",
    }).toString().trim()
  );
  const recurrenceBanner =
    "/*! @zigoschedule/scheduler-recurrence bundles rrule (BSD-3-Clause). See dist/rrule.LICENSE.txt in the npm package. */";
  const reactBanner =
    "/*! @zigoschedule/scheduler-react bundles lucide-react (ISC). See dist/lucide-react.LICENSE.txt in the npm package. */";
  const recurrenceBuilds = ["index.js", "index.cjs", "zigo-scheduler-recurrence.global.js"].map((file) =>
    readFileSync(join(recurrenceRoot, "dist", file), "utf8")
  );
  const recurrenceLicense = readFileSync(join(recurrenceRoot, "dist", "rrule.LICENSE.txt"), "utf8");
  check(
    "recurrence publishes rrule notice",
    recurrenceBuilds.every((content) => content.startsWith(recurrenceBanner)),
    "ESM, CJS and global"
  );
  check(
    "recurrence publishes rrule license",
    recurrenceLicense.includes("rrule.js") && recurrenceLicense.includes("Redistribution and use"),
    "dist/rrule.LICENSE.txt"
  );

  // The element must not crash server rendering.
  writeFileSync(
    join(tempDir, "no-dom.mjs"),
    `import "@zigoschedule/scheduler-element";
     console.log(JSON.stringify({ hasDom: typeof HTMLElement !== "undefined" }));`
  );
  const noDom = JSON.parse(execSync("node no-dom.mjs", { cwd: tempDir, stdio: "pipe" }).toString());
  check("element loads without DOM (Next, SSR)", noDom.hasDom === false, "no HTMLElement");

  // Both module formats must be published.
  const manifest = JSON.parse(
    execSync("node -p \"JSON.stringify(require('@zigoschedule/scheduler-core/package.json'))\"", {
      cwd: tempDir,
      stdio: "pipe",
    }).toString()
  );
  check("publishes ESM and CJS", Boolean(manifest.exports?.["."]?.require), "exports.require present");

  for (const name of PACKAGES) {
    const currentPackageName = packageName(name);
    const packageRoot = dirname(
      execSync(`node -p "require.resolve('${currentPackageName}/package.json')"`, {
        cwd: tempDir,
        stdio: "pipe",
      }).toString().trim()
    );
    const currentManifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
    const distFiles = listFiles(join(packageRoot, "dist"));
    const runtimeFiles = ["index.js", "index.cjs"]
      .map((file) => join(packageRoot, "dist", file))
      .map((file) => readFileSync(file, "utf8"));
    check(
      `${name} publishes no source maps`,
      distFiles.every((file) => !file.endsWith(".map")),
      distFiles.filter((file) => file.endsWith(".map")).join(", ") || "dist only"
    );
    const siblingImports = new Set(
      runtimeFiles
        .flatMap((content) => [...content.matchAll(/@zigoschedule\/scheduler-[a-z-]+/g)].map((match) => match[0]))
        .filter((dependencyName) => dependencyName !== currentPackageName)
    );
    const missing = [...siblingImports].filter(
      (dependencyName) => !currentManifest.dependencies?.[dependencyName]
    );
    check(
      `${name} declares sibling deps`,
      missing.length === 0,
      missing.length ? `missing ${missing.join(", ")}` : `${siblingImports.size} sibling deps`
    );
    if (name === "react") {
      const lucideLicense = readFileSync(join(packageRoot, "dist", "lucide-react.LICENSE.txt"), "utf8");
      check(
        "React publishes lucide-react notice",
        runtimeFiles.every((content) => content.startsWith(reactBanner)),
        "ESM and CJS"
      );
      check(
        "React publishes lucide-react license",
        lucideLicense.includes("ISC License") && lucideLicense.includes("Permission to use"),
        "dist/lucide-react.LICENSE.txt"
      );
    }
    if (name === "recurrence") {
      check(
        "recurrence does not install rrule separately",
        !currentManifest.dependencies?.rrule,
        "rrule is bundled with its license notice"
      );
    }
  }

  const cssPath = execSync("node -p \"require.resolve('@zigoschedule/scheduler-react/styles.css')\"", {
    cwd: tempDir,
    stdio: "pipe",
  }).toString().trim();
  const css = readFileSync(cssPath, "utf8");
  check(
    "React publishes ready CSS",
    css.includes(".flex") && css.includes(".bg-\\[\\#E9D5FF\\]"),
    `${Math.round(css.length / 1024)} KB`
  );

  // Declaring `types` means nothing if the file was not published. This check
  // compiles real TypeScript against the installed package.
  writeFileSync(
    join(tempDir, "types.ts"),
    `import { buildAgendaLayout, type AgendaLayout } from "@zigoschedule/scheduler-layout";
     import { getAgendaMessages, zonedTimeToUtc, type TimeZone } from "@zigoschedule/scheduler-core";
     import { ptBRMessages } from "@zigoschedule/scheduler-core/locales/pt-BR";
     const timeZone: TimeZone = "America/New_York";
     const startsAt: Date = zonedTimeToUtc("2026-08-11", 540, timeZone);
     const layout: AgendaLayout = buildAgendaLayout({
       date: startsAt, view: "day", appointments: [],
       professionals: [{ id: "dr-lee", name: "Dr. Lee" }], width: 800, height: 600,
     });
     const columnCount: number = layout.columns.length;
     const today: string = getAgendaMessages("pt-BR", ptBRMessages).today;
     console.log(today);
     console.log(columnCount);`
  );
  writeFileSync(
    join(tempDir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      files: ["types.ts"],
    })
  );

  // Use the workspace `tsc` by absolute path: the temporary folder does not have
  // TypeScript installed.
  const tsc = join(process.cwd(), "node_modules", ".bin", "tsc");
  let types = { ok: true, error: "" };
  try {
    execSync(`"${tsc}" -p tsconfig.json`, { cwd: tempDir, stdio: "pipe" });
  } catch (e) {
    const output = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim();
    types = { ok: false, error: output.split("\n")[0].slice(0, 130) || String(e.message).slice(0, 130) };
  }
  check("TypeScript sees the types", types.ok, types.error || "compiled in strict mode");
} catch (error) {
  check("full verification script", false, String(error.message).slice(0, 160));
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}

console.log(failures === 0 ? "\nall good" : `\n${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
