import { describe, expect, it } from "vitest";

/**
 * Importing the package must not crash in a DOM-free environment.
 *
 * `class X extends HTMLElement` runs as soon as the module loads. Without a DOM,
 * `HTMLElement` does not exist and the import fails before any of our code can
 * run. Next.js users, server renderers and sandbox users are the ones who pay
 * for that mistake.
 *
 * This file intentionally runs in `environment: node`. A jsdom test would pass
 * and prove nothing.
 */

describe("importing without DOM", () => {
  it("has no DOM here", () => {
    // If this fails, the whole test lost its meaning: someone enabled jsdom.
    expect(typeof HTMLElement).toBe("undefined");
    expect(typeof document).toBe("undefined");
  });

  it("loads the element package", async () => {
    const module = await import("../index");
    expect(module.ZigoSchedulerElement).toBeTypeOf("function");
    expect(module.TAG_NAME).toBe("zigo-scheduler");
  });

  it("registering the element without a browser is a no-op", async () => {
    const { defineZigoScheduler } = await import("../index");
    expect(() => defineZigoScheduler()).not.toThrow();
  });

  it("keeps the layout model usable on the server", async () => {
    // This allows a backend to calculate the schedule for an email or PDF.
    const { buildAgendaLayout } = await import("@zigoschedule/scheduler-layout");
    const model = buildAgendaLayout({
      date: new Date(2026, 7, 10),
      view: "day",
      appointments: [],
      professionals: [{ id: "ana", nome: "Ana" }],
      width: 800,
      height: 600,
    });
    expect(model.columns).toHaveLength(1);
  });
});
