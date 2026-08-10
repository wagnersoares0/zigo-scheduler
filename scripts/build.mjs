import { build } from "esbuild";
import { execFileSync, execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Builds every package for publication.
 *
 * Until this exists the packages only work inside this repository, where Vite
 * resolves TypeScript through aliases. `npm install` needs plain JavaScript and
 * type declarations, which is what this produces.
 */

const PACKAGES = ["core", "engine", "recurrence", "layout", "interaction", "element", "react"];
const EXTERNAL = ["react", "react-dom", "react/jsx-runtime"];
const LOCALES = [
  "pt-BR",
  "en-US",
  "es-ES",
  "fr-FR",
  "de-DE",
  "ru-RU",
  "th-TH",
  "it-IT",
  "nl-NL",
  "pl-PL",
  "tr-TR",
  "id-ID",
  "ja-JP",
  "ko-KR",
  "zh-CN",
  "ar-SA",
  "hi-IN",
];

const packageName = (name) => `@zigoschedule/scheduler-${name}`;
const sizeBaseline = JSON.parse(readFileSync("scripts/bundle-size-baseline.json", "utf8"));
const sizeResults = new Map();

const alias = Object.fromEntries(
  PACKAGES.map((name) => [packageName(name), `./packages/${name}/src/index.ts`])
);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const recordSize = (key, label, bytes) => {
  sizeResults.set(key, bytes);
  console.log(`  ${label.padEnd(12)} ${kb(bytes)}`);
};
const assertSizeBaseline = () => {
  const oversized = [];
  for (const [key, limit] of Object.entries(sizeBaseline)) {
    const actual = sizeResults.get(key);
    if (actual === undefined) oversized.push(`${key} is missing from the current build output`);
    else if (actual > limit) oversized.push(`${key} grew from ${kb(limit)} to ${kb(actual)}`);
  }

  for (const key of sizeResults.keys()) {
    if (!(key in sizeBaseline)) oversized.push(`${key} is not tracked in scripts/bundle-size-baseline.json`);
  }

  if (oversized.length > 0) {
    throw new Error(`bundle size baseline failed:\n${oversized.map((item) => `  - ${item}`).join("\n")}`);
  }

  console.log("  size baseline OK");
};
const RECURRENCE_THIRD_PARTY_BANNER =
  "/*! @zigoschedule/scheduler-recurrence bundles rrule (BSD-3-Clause). See dist/rrule.LICENSE.txt in the npm package. */";
const REACT_THIRD_PARTY_BANNER =
  "/*! @zigoschedule/scheduler-react bundles lucide-react (ISC). See dist/lucide-react.LICENSE.txt in the npm package. */";

for (const name of PACKAGES) {
  const dir = join("packages", name);
  const out = join(dir, "dist");
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });

  // Sibling packages stay external so they are not inlined into every bundle:
  // a consumer installing two of them would otherwise ship the shared code twice.
  const externals = [
    ...EXTERNAL,
    ...PACKAGES.filter((other) => other !== name).map(packageName),
  ];

  const common = {
    entryPoints: [join(dir, "src/index.ts")],
    bundle: true,
    platform: "browser",
    target: "es2022",
    sourcemap: false,
    external: externals,
    jsx: "automatic",
    banner:
      name === "recurrence"
        ? { js: RECURRENCE_THIRD_PARTY_BANNER }
        : name === "react"
          ? { js: REACT_THIRD_PARTY_BANNER }
          : undefined,
    metafile: true,
    logLevel: "error",
  };

  const result = await build({ ...common, outfile: join(out, "index.js"), format: "esm" });

  // CommonJS is included for older `require()` projects and classic browser
  // sandboxes that still struggle with ESM-only packages.
  await build({ ...common, outfile: join(out, "index.cjs"), format: "cjs" });

  const bytes = Object.values(result.metafile.outputs).find((o) => o.entryPoint)?.bytes ?? 0;
  recordSize(`packages/${name}/dist/index.js`, name, bytes);

  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  // `main` points to CJS because legacy resolvers are the ones that read it.
  // Modern tools use the ESM entry through `exports.import`.
  manifest.main = "./dist/index.cjs";
  manifest.module = "./dist/index.js";
  manifest.types = "./dist/index.d.ts";
  manifest.exports = {
    ".": {
      types: "./dist/index.d.ts",
      import: "./dist/index.js",
      require: "./dist/index.cjs",
      default: "./dist/index.js",
    },
    // Declaring `exports` closes the package. Many tools still read
    // `package.json` for version metadata, so keep that path explicit.
    "./package.json": "./package.json",
  };
  if (name === "react") {
    manifest.exports["./styles.css"] = "./dist/styles.css";
  }
  if (name === "core") {
    for (const locale of LOCALES) {
      manifest.exports[`./locales/${locale}`] = {
        types: `./dist/locales/${locale}.d.ts`,
        import: `./dist/locales/${locale}.js`,
        require: `./dist/locales/${locale}.cjs`,
        default: `./dist/locales/${locale}.js`,
      };
    }
  }
  manifest.files = ["dist", "LICENSE", "README.md"];
  if (name === "recurrence") {
    cpSync("node_modules/rrule/LICENCE", join(out, "rrule.LICENSE.txt"));
  }
  if (name === "react") {
    cpSync("node_modules/lucide-react/LICENSE", join(out, "lucide-react.LICENSE.txt"));
  }

  // `"*"` resolves to the latest published sibling, which can make a breaking
  // core change affect an already-installed React package. Pin internal sibling
  // ranges to this build version instead.
  for (const packageShortName of PACKAGES) {
    const dependencyName = packageName(packageShortName);
    if (manifest.dependencies?.[dependencyName]) manifest.dependencies[dependencyName] = `^${manifest.version}`;
  }
  // These two do their job by being imported: `element` registers the custom
  // tag, `recurrence` registers itself as a plugin. Marking them side-effect
  // free would let a bundler drop the import that *is* the installation.
  manifest.sideEffects =
    name === "react"
      ? ["./dist/styles.css"]
      : name === "element" || name === "recurrence";
  writeFileSync(join(dir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  if (name === "core") {
    mkdirSync(join(out, "locales"), { recursive: true });
    for (const locale of LOCALES) {
      const localeEntry = join(dir, "src", "locales", `${locale}.ts`);
      const localeCommon = {
        ...common,
        entryPoints: [localeEntry],
        external: [...externals, packageName("core")],
      };
      await build({
        ...localeCommon,
        outfile: join(out, "locales", `${locale}.js`),
        format: "esm",
      });
      await build({
        ...localeCommon,
        outfile: join(out, "locales", `${locale}.cjs`),
        format: "cjs",
      });
    }
  }
}

console.log("\n  React styles...");
execFileSync(
  "npx",
  [
    "tailwindcss",
    "-c",
    "tailwind.config.js",
    "-i",
    "packages/react/src/styles.css",
    "-o",
    "packages/react/dist/styles.css",
    "--minify",
  ],
  {
    stdio: "inherit",
    // Tailwind v3 ships a bundled Browserslist database for its CLI path. The
    // project dependency is updated by the lockfile, but that internal snapshot
    // can still print a stale-data warning during a local build.
    env: { ...process.env, BROWSERSLIST_IGNORE_OLD_DATA: "1" },
  }
);
recordSize("packages/react/dist/styles.css", "react css", statSync("packages/react/dist/styles.css").size);

// Standalone bundles for <script type="module">, with sibling packages bundled.
// A PHP, Laravel, Django or Rails page often wants one file, not npm and a
// bundler. This is intentionally the opposite of the package build above.
//
// There are two files because recurrence is optional: projects that do not need
// repeating appointments should not download `rrule`. The files meet through the
// browser window socket published by packages/element/src/standalone.ts.
const version = JSON.parse(readFileSync("packages/element/package.json", "utf8")).version;

const standaloneBundle = async (label, entry, outfile, options = {}) => {
  const result = await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: false,
    alias,
    banner: options.banner,
    define: { __ZIGO_VERSION__: JSON.stringify(version) },
    metafile: true,
    logLevel: "error",
  });
  const bytes = Object.values(result.metafile.outputs).find((o) => o.entryPoint)?.bytes ?? 0;
  recordSize(outfile, label, bytes);
};

console.log(`\n  standalone bundles (for <script type="module">)`);
await standaloneBundle(
  "agenda",
  "packages/element/src/standalone.ts",
  "packages/element/dist/zigo-scheduler.global.js"
);
await standaloneBundle(
  "recurrence",
  "packages/recurrence/src/standalone.ts",
  "packages/recurrence/dist/zigo-scheduler-recurrence.global.js",
  { banner: { js: RECURRENCE_THIRD_PARTY_BANNER } }
);
assertSizeBaseline();

console.log("\n  type declarations...");
rmSync("dist-types", { recursive: true, force: true });
execSync("npx tsc -p tsconfig.build.json", { stdio: "inherit" });

// `tsc` emits every declaration into one tree (`dist-types/packages/<name>/src/`),
// while each package only publishes its own `dist` folder. Without this copy the
// package works in JavaScript but ships without TypeScript declarations.
//
// Copy the whole tree, not only `index.d.ts`: declarations reference each other
// through relative paths such as `export * from "./types"`.
for (const name of PACKAGES) {
  const origem = join("dist-types", "packages", name, "src");
  const destino = join("packages", name, "dist");
  if (!existsSync(origem)) {
    throw new Error(`types were not generated for ${name}: ${origem} does not exist`);
  }
  cpSync(origem, destino, { recursive: true });
}

// Verify the exact failure mode that is easy to miss: the manifest can point to
// a declaration file that was never copied.
for (const name of PACKAGES) {
  const declarations = join("packages", name, "dist", "index.d.ts");
  if (!existsSync(declarations)) throw new Error(`missing ${declarations}`);
}
console.log(`  types copied to ${PACKAGES.length} packages`);
console.log("  done");
