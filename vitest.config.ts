import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const pkg = (name: string) =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@zigoschedule/scheduler-core": pkg("core"),
      "@zigoschedule/scheduler-engine": pkg("engine"),
      "@zigoschedule/scheduler-recurrence": pkg("recurrence"),
      "@zigoschedule/scheduler-layout": pkg("layout"),
      "@zigoschedule/scheduler-interaction": pkg("interaction"),
      "@zigoschedule/scheduler-element": pkg("element"),
      "@zigoschedule/scheduler-react": pkg("react"),
    },
  },
  test: {
    include: ["packages/**/*.test.ts", "packages/**/*.test.tsx"],
    environment: "node",
  },
});
