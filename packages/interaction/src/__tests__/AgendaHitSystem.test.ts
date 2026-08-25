import { describe, expect, it } from "vitest";
import { buildAgendaHitSystem, queryAgendaHit } from "../AgendaHitSystem";

const rect = (left: number, top: number, width: number, height: number) => ({
  left, top, right: left + width, bottom: top + height, width, height, x: left, y: top, toJSON: () => ({}),
});

const column = (dayKey: string, resourceId: string, left: number, top: number) => ({
  dataset: { dndDay: dayKey, dndProf: resourceId },
  clientHeight: 600,
  getBoundingClientRect: () => rect(left, top, 200, 600),
}) as unknown as HTMLElement;

const scroller = () => ({
  scrollTop: 0,
  scrollLeft: 0,
  getBoundingClientRect: () => rect(0, 0, 400, 600),
}) as unknown as HTMLElement;

describe("agenda hit system", () => {
  it("resolves a snapped minute inside the matching resource column", () => {
    const scrollEl = scroller();
    const hits = buildAgendaHitSystem([column("2026-06-22", "prof-a", 100, 0)], scrollEl);

    expect(queryAgendaHit({
      hitSystem: hits, scrollEl, clientX: 150, clientY: 124, snapMinutes: 5, minuteFromY: (y) => y,
    })).toEqual({
      dayKey: "2026-06-22", resourceId: "prof-a", minute: 120,
    });
  });

  it("keeps grid-origin snapping and scroll alignment", () => {
    const scrollEl = scroller();
    const hits = buildAgendaHitSystem([column("2026-06-22", "prof-a", 100, 0)], scrollEl);
    scrollEl.scrollLeft = 50;

    expect(queryAgendaHit({
      hitSystem: hits, scrollEl, clientX: 75, clientY: 350, snapMinutes: 5, minuteFromY: (y) => 600 + y,
      snapOptions: { minMinute: 600, maxMinute: 655, originMinute: 600 },
    })).toEqual({ dayKey: "2026-06-22", resourceId: "prof-a", minute: 655 });
    expect(queryAgendaHit({
      hitSystem: hits, scrollEl, clientX: 75, clientY: 700, snapMinutes: 5, minuteFromY: (y) => y,
    })).toBeNull();
  });
});
