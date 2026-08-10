import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The package boundaries, enforced.
 *
 * A layered library only stays layered if something checks. Comments and good
 * intentions lose to a deadline; this test does not. Two rules matter:
 *
 *  1. A package may only import from packages below it. `core` importing from
 *     `react` would drag React into the layer meant to be portable.
 *  2. Every published package must stay explicitly MIT.
 */

const ROOT = new URL("../../../..", import.meta.url).pathname;

/** Lower number = deeper layer. A package may only import strictly below it. */
const LAYER: Record<string, number> = {
  "@zigoschedule/scheduler-core": 0,
  "@zigoschedule/scheduler-interaction": 0,
  "@zigoschedule/scheduler-engine": 1,
  "@zigoschedule/scheduler-recurrence": 3,
  "@zigoschedule/scheduler-layout": 2,
  "@zigoschedule/scheduler-element": 3,
  "@zigoschedule/scheduler-react": 3,
};

const PACKAGE_OF: Record<string, string> = {
  core: "@zigoschedule/scheduler-core",
  interaction: "@zigoschedule/scheduler-interaction",
  engine: "@zigoschedule/scheduler-engine",
  recurrence: "@zigoschedule/scheduler-recurrence",
  layout: "@zigoschedule/scheduler-layout",
  element: "@zigoschedule/scheduler-element",
  react: "@zigoschedule/scheduler-react",
};

const sourceFiles = (dir: string): string[] => {
  let found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found = found.concat(sourceFiles(full));
    } else if (/\.tsx?$/.test(entry) && !full.includes("__tests__")) {
      found.push(full);
    }
  }
  return found;
};

// Quotes of both kinds and optional subpaths (`@zigoschedule/scheduler-core/foo`).
// Only the package name matters. This regex was once tied to a prefix that was
// later renamed, turning the whole test into an `expect([])` that never looked
// at anything. The "found imports" assertion below prevents that.
const importsIn = (file: string): string[] =>
  [
    ...readFileSync(file, "utf8").matchAll(
      /from\s+['"](@zigoschedule\/scheduler-[a-z-]+)(?:\/[^'"]*)?['"]/g
    ),
  ].map((m) => m[1]);

const packageDirs = (base: string): string[] => {
  try {
    return readdirSync(join(ROOT, base)).filter((entry) => {
      const full = join(ROOT, base, entry, "src");
      try {
        return statSync(full).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    return [];
  }
};

describe("layer order", () => {
  it("never imports upwards", () => {
    const offences: string[] = [];
    let seen = 0;

    for (const name of packageDirs("packages")) {
      const self = PACKAGE_OF[name];
      if (self === undefined) continue;

      for (const file of sourceFiles(join(ROOT, "packages", name, "src"))) {
        for (const dep of importsIn(file)) {
          seen++;
          const depLayer = LAYER[dep];
          if (depLayer === undefined) continue;
          if (depLayer >= LAYER[self]) {
            offences.push(`${file.replace(ROOT, "")} (${self}) imports ${dep}`);
          }
        }
      }
    }

    expect(offences).toEqual([]);
    // A boundary test that sees no imports always passes. These layers really
    // talk to each other; zero here means the regex stopped matching, not that
    // the code became clean.
    expect(seen).toBeGreaterThan(10);
  });
});

describe("package licenses", () => {
  it("keeps every published package under MIT", () => {
    for (const name of packageDirs("packages")) {
      const manifest = JSON.parse(
        readFileSync(join(ROOT, "packages", name, "package.json"), "utf8")
      );
      expect(manifest.license, `${name} should be MIT`).toBe("MIT");
    }
  });
});

describe("public package vocabulary", () => {
  it("keeps the engine root API on the English contract", () => {
    const publicIndex = readFileSync(join(ROOT, "packages", "engine", "src", "index.ts"), "utf8");
    const forbiddenExports = [
      "Ag",
      "Bloq",
      "Prof",
      "Serv",
      "Props",
      "HorariosSemanaTenant",
      "PausaIntervalo",
      "DiaSemanaKey",
      "HorarioDiaSemana",
      "normalizeAppointment",
      "normalizeProfessional",
      "normalizeService",
      "normalizeBusinessHours",
      "normalizeWeekdayBusinessHours",
      "normalizeProfessionalDaySchedule",
    ];

    expect(publicIndex).not.toMatch(/export\s+type\s+\*\s+from\s+["']\.\/types["']/);
    for (const name of forbiddenExports) {
      expect(publicIndex, `${name} must stay in legacy compatibility, not the root API`).not.toMatch(
        new RegExp(`\\b${name}\\b`),
      );
    }
  });

  it("keeps React's root entry focused on the supported public component", () => {
    const publicIndex = readFileSync(join(ROOT, "packages", "react", "src", "index.ts"), "utf8");

    expect(publicIndex).toMatch(/export\s+\{\s*Agenda,\s*type\s+AgendaProps\s*\}/);
    expect(publicIndex).not.toMatch(/\bAgendaGrid\b/);
    expect(publicIndex).not.toMatch(/\bAgendaMonthView\b/);
  });

  it("keeps npm READMEs on the English-first examples", () => {
    const docs = [
      readFileSync(join(ROOT, "README.md"), "utf8"),
      ...packageDirs("packages").map((name) =>
        readFileSync(join(ROOT, "packages", name, "README.md"), "utf8")
      ),
    ].join("\n");

    for (const name of ["Ag", "Prof", "Serv", "Bloq", "HorariosSemanaTenant", "PausaIntervalo", "lista"]) {
      expect(docs, `${name} must not be used in the published examples`).not.toMatch(
        new RegExp(`\\b${name}\\b`),
      );
    }
  });
});

/**
 * The packages the README promises can run in any JavaScript environment.
 *
 * This test used to inspect only `core`, so three `engine` files importing
 * `ReactNode` slipped through. The real effect: installing `layout` or `engine`
 * in a Vue project required `@types/react` just to compile types, the opposite
 * of the promise.
 */
const FRAMEWORK_FREE = ["core", "engine", "layout", "interaction"];

describe("framework-free layer portability", () => {
  it.each(FRAMEWORK_FREE)("%s does not depend on React", (pkg) => {
    const offences: string[] = [];
    for (const file of sourceFiles(join(ROOT, "packages", pkg, "src"))) {
      const raw = readFileSync(file, "utf8");
      // Double and single quotes, `import` and `import type`, subpaths
      // (`react/jsx-runtime`) and `react-dom`. The previous regex only covered
      // one shape; a loose regex is the easiest way to punch through a boundary.
      if (/\bfrom\s+['"]react(-dom)?(\/[\w./-]+)?['"]/.test(raw)) {
        offences.push(`${file.replace(ROOT, "")}: react import`);
      }
      // Side-effect-only import: `import "react"`.
      if (/\bimport\s+['"]react(-dom)?(\/[\w./-]+)?['"]/.test(raw)) {
        offences.push(`${file.replace(ROOT, "")}: side-effect react import`);
      }
      if (/\bimport\s*\(\s*['"]react/.test(raw)) {
        offences.push(`${file.replace(ROOT, "")}: dynamic react import`);
      }
      // JSX in a framework-free layer is the same problem in different clothes.
      if (file.endsWith(".tsx")) offences.push(`${file.replace(ROOT, "")}: .tsx file`);
    }
    expect(offences).toEqual([]);
  });

  it("none of them declares react in the manifest", () => {
    // The import can disappear from code and remain in `package.json`, which is
    // what npm reads at install time.
    for (const pkg of FRAMEWORK_FREE) {
      const manifest = JSON.parse(
        readFileSync(join(ROOT, "packages", pkg, "package.json"), "utf8")
      );
      const all = { ...manifest.dependencies, ...manifest.peerDependencies };
      expect(Object.keys(all), `${pkg} must not depend on react`).not.toContain("react");
    }
  });

  it("core does not touch the DOM either", () => {
    // Core is the layer that should make sense to port to PHP, Python or Go.
    // The other three can calculate geometry; core should not even do that.
    const offences: string[] = [];
    for (const file of sourceFiles(join(ROOT, "packages", "core", "src"))) {
      const raw = readFileSync(file, "utf8");
      // Not preceded by a dot or word character: `input.window.startMin` is one
      // of our fields, while `window.innerHeight` is the browser.
      if (/(^|[^.\w])(document|window|navigator)\./m.test(raw)) {
        offences.push(`${file.replace(ROOT, "")}: DOM`);
      }
    }
    expect(offences).toEqual([]);
  });
});

describe("recurrence standalone build", () => {
  it("does not reach layout through source imports", () => {
    // The standalone bundle talks to the scheduler through the browser window,
    // because every bundle is closed. Importing layout here would create a
    // second copy of the registry, and the expander would land in a copy the
    // scheduler never reads.
    //
    // This worked by luck once: `standalone -> install -> layout` existed and
    // the bundler removed the dead weight. More conservative tree-shaking would
    // turn it into a silent failure.
    const visited = new Set<string>();
    const offences: string[] = [];

    const follow = (file: string) => {
      if (visited.has(file) || !existsSync(file)) return;
      visited.add(file);

      const raw = readFileSync(file, "utf8");
      // Value import, not type import: `import type` disappears from the build.
      for (const [, specifier] of raw.matchAll(
        /^\s*import\s+(?!type\s)[^;]*?from\s+['"]([^'"]+)['"]/gm
      )) {
        if (specifier.startsWith("@zigoschedule/scheduler-layout")) {
          offences.push(`${file.replace(ROOT, "")} imports layout`);
          continue;
        }
        if (!specifier.startsWith(".")) continue;
        const base = join(dirname(file), specifier);
        follow(base.endsWith(".ts") ? base : `${base}.ts`);
      }
    };

    follow(join(ROOT, "packages", "recurrence", "src", "standalone.ts"));

    expect(offences).toEqual([]);
    // Proof that the traversal actually walked through files.
    expect(visited.size).toBeGreaterThan(2);
  });
});
