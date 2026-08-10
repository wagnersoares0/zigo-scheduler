import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const measureDebt = process.env.LINT_DEBT === "1";

/**
 * Size and complexity are measured, not argued.
 *
 * The numbers are the common ones: ESLint's own default for `max-lines` is 300,
 * a function should fit on a screen, and past four levels of nesting nobody
 * follows the reasoning. They are warnings, not errors — the point is to see
 * the debt, not to block a commit on it.
 */
export default tseslint.config(
  // Generated code is not linted: `dist` is minified build output with patterns
  // human rules do not apply to. Linting it buries real problems in noise and
  // makes `npm run lint` useless.
  {
    ignores: [
      "node_modules",
      "demo",
      "exemplos",
      "website",
      "dist-demo",
      "dist-website",
      "dist-types",
      "origem",
      "reference",
      "vite.config.ts",
      "vite.exemplos.config.ts",
      "scripts/fc-audit.mjs",
      "scripts/shot-element.mjs",
      "scripts/verify-all.mjs",
      "scripts/verify-controls.mjs",
      "scripts/verify-demos.mjs",
      "scripts/verify-gestures.mjs",
      "scripts/verify-portal.mjs",
      "scripts/verify-recurrence.mjs",
      "scripts/verify-scroll.mjs",
      "scripts/verify-visual.mjs",
      "packages/*/dist/**",
      "**/*.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Without browser/node globals, `no-undef` reports DOM and console usage as
    // errors. That noise makes `npm run lint` untrustworthy.
    files: ["**/*.{ts,tsx,js,mjs}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ["packages/**/*.ts", "packages/**/*.tsx"],
    rules: {
      ...(measureDebt
        ? {
            "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }],
            "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],
            "max-depth": ["warn", 4],
            "max-params": ["warn", 4],
            complexity: ["warn", 15],
            "@typescript-eslint/no-explicit-any": "warn",
          }
        : {}),
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Tests describe scenarios; long files there are a feature, not debt.
    files: ["**/__tests__/**"],
    rules: { "max-lines": "off", "max-lines-per-function": "off" },
  },
);
