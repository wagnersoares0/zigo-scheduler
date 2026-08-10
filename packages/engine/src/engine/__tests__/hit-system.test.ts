import { describe, expect, it } from "vitest";
import { buildAgendaHitSystem, queryAgendaHit } from "../index";
import { minuteFromAgendaGridY } from "../../utils/snap";

const makeRect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
  x: left,
  y: top,
  toJSON: () => ({}),
});

const makeColumn = (dayKey: string, resourceId: string, left: number, top: number) => ({
  dataset: { dndDay: dayKey, dndProf: resourceId },
  clientHeight: 600,
  getBoundingClientRect: () => makeRect(left, top, 200, 600),
}) as unknown as HTMLElement;

const makeScrollEl = () => ({
  scrollTop: 0,
  scrollLeft: 0,
  getBoundingClientRect: () => makeRect(0, 0, 400, 600),
}) as unknown as HTMLElement;

describe("agenda hit system", () => {
  it("resolves day, resource and snapped minute inside a column", () => {
    const scrollEl = makeScrollEl();
    const hitSystem = buildAgendaHitSystem(
      [makeColumn("2026-06-22", "prof-a", 100, 0)],
      scrollEl,
    );

    const hit = queryAgendaHit(hitSystem, scrollEl, 150, 122, 5, (y) => y);

    expect(hit).toEqual({ dayKey: "2026-06-22", resourceId: "prof-a", minute: 120 });
  });

  it("uses floor snap instead of rounding to the next slot near boundaries", () => {
    const scrollEl = makeScrollEl();
    const hitSystem = buildAgendaHitSystem(
      [makeColumn("2026-06-22", "prof-a", 100, 0)],
      scrollEl,
    );

    const hit = queryAgendaHit(hitSystem, scrollEl, 150, 124, 5, (y) => y);

    expect(hit).toEqual({ dayKey: "2026-06-22", resourceId: "prof-a", minute: 120 });
  });

  it("snaps relative to the agenda start minute", () => {
    const minute = minuteFromAgendaGridY({
      y: 59,
      height: 120,
      startMinute: 495,
      endMinute: 555,
      snapMinutes: 30,
    });

    expect(minute).toBe(495);
  });

  it("supports a 5-minute drag snap independent from a larger visual grid", () => {
    const scrollEl = makeScrollEl();
    const hitSystem = buildAgendaHitSystem(
      [makeColumn("2026-06-22", "prof-a", 100, 0)],
      scrollEl,
    );
    const minuteFromY = (y: number, height: number) =>
      minuteFromAgendaGridY({
        y,
        height,
        startMinute: 10 * 60,
        endMinute: 11 * 60,
        snapMinutes: 5,
        maxMinute: 10 * 60 + 55,
      });

    const hit = queryAgendaHit(hitSystem, scrollEl, 150, 350, 5, minuteFromY, {
      minMinute: 10 * 60,
      maxMinute: 10 * 60 + 55,
      originMinute: 10 * 60,
    });

    expect(hit).toEqual({ dayKey: "2026-06-22", resourceId: "prof-a", minute: 10 * 60 + 35 });
  });

  it("keeps hit testing aligned after horizontal scroll", () => {
    const scrollEl = makeScrollEl();
    const hitSystem = buildAgendaHitSystem(
      [makeColumn("2026-06-22", "prof-a", 100, 0)],
      scrollEl,
    );
    scrollEl.scrollLeft = 50;

    const hit = queryAgendaHit(hitSystem, scrollEl, 75, 120, 5, (y) => y);

    expect(hit).toEqual({ dayKey: "2026-06-22", resourceId: "prof-a", minute: 120 });
  });

  it("rejects points outside the visible scroll viewport", () => {
    const scrollEl = makeScrollEl();
    const hitSystem = buildAgendaHitSystem(
      [makeColumn("2026-06-22", "prof-a", 100, 0)],
      scrollEl,
    );

    const hit = queryAgendaHit(hitSystem, scrollEl, 150, 700, 5, (y) => y);

    expect(hit).toBeNull();
  });
});
