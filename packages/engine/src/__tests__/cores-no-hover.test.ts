import { describe, expect, it } from "vitest";
import { DAY_PROF_CARD_THEMES, DAY_CANCELED_CARD_THEME } from "../constants";

/**
 * The card background color does not change on hover or while the user holds it
 * to drag.
 *
 * The background says **whose** appointment it is: the professional color,
 * chosen in the host app. Changing it on hover makes the card look like it
 * belongs to someone else at the exact moment the user is moving it.
 *
 * The old palette used `hover:bg-[...]`, a darker shade. Picking up a light
 * purple card made it look medium purple, so the user could think something
 * changed. Hover now uses ring and shadow, which do not touch the fill.
 */

const THEMES = [...DAY_PROF_CARD_THEMES, DAY_CANCELED_CARD_THEME];

describe("hover does not repaint the card background", () => {
  it.each(THEMES.map((theme, index) => [index, theme] as const))(
    "theme %i marks without repainting",
    (_index, theme) => {
      expect(theme.hoverClass, `"${theme.hoverClass}" repaints the background`).not.toMatch(/hover:bg-/);
    }
  );

  it("every theme still has a hover affordance", () => {
    // Removing `hover:bg` without replacing it would leave the card with no
    // pointer response, which is worse than the original problem.
    for (const theme of THEMES) {
      expect(theme.hoverClass.trim().length, "empty hover").toBeGreaterThan(0);
      expect(theme.hoverClass).toMatch(/hover:(ring|shadow|outline|brightness)/);
    }
  });

  it("every theme background remains declared and unique enough", () => {
    const backgrounds = DAY_PROF_CARD_THEMES.map((theme) => theme.bgClass);
    for (const background of backgrounds) expect(background).toMatch(/^bg-\[#[0-9A-Fa-f]{6}\]$/);
    // Repeated colors would make two professionals look like the same one.
    expect(new Set(backgrounds).size).toBe(backgrounds.length);
  });
});
