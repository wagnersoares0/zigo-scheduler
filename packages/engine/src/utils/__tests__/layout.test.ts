import { describe, expect, it } from "vitest";
import {
  agendaMinuteToPx,
  getAgendaResourceColumnMetrics,
  buildOverlapLayout,
  calculateAgendaDynamicSlotHeight,
  getAgendaBottomBlockedStartMinute,
  getAgendaVisualEndMinute,
  getAgendaSelectionExclusiveRange,
  getAgendaSelectionOverlayVisualRange,
  getAgendaSelectionVisualRange,
  getAgendaTimedItemBox,
} from "../layout";

describe("buildOverlapLayout", () => {
  it("rounds dynamic slot heights to whole pixels", () => {
    expect(calculateAgendaDynamicSlotHeight({
      baseSlotHeight: 18,
      availableHeight: 763,
      slotCount: 26,
    })).toBe(29);
  });

  it.each([5, 10, 15, 20, 25, 30, 60])(
    "keeps visual slot spacing stable for %i minute granularity",
    (snapMinutes) => {
      const startMinute = 10 * 60 + 30;
      const endMinute = 19 * 60;
      const slotHeight = 23;
      const slots: number[] = [];

      for (let minute = startMinute; minute < endMinute; minute += snapMinutes) {
        slots.push(minute);
      }

      const visualEndMinute = getAgendaVisualEndMinute({
        startMinute,
        endMinute,
        snapMinutes,
      });
      const gridHeight = slots.length * slotHeight;

      expect(visualEndMinute).toBeGreaterThanOrEqual(endMinute);
      expect((visualEndMinute - startMinute) % snapMinutes).toBe(0);
      expect(visualEndMinute - endMinute).toBeLessThan(snapMinutes);

      slots.forEach((minute, index) => {
        expect(agendaMinuteToPx({
          minute,
          startMinute,
          visualEndMinute,
          height: gridHeight,
        })).toBeCloseTo(index * slotHeight, 8);
      });
    },
  );

  it("keeps a partial final business slot without shrinking previous rows", () => {
    const startMinute = 10 * 60 + 30;
    const endMinute = 19 * 60;
    const snapMinutes = 20;
    const slotHeight = 18;
    const visualEndMinute = getAgendaVisualEndMinute({
      startMinute,
      endMinute,
      snapMinutes,
    });
    const gridHeight = 26 * slotHeight;

    expect(visualEndMinute).toBe(19 * 60 + 10);
    expect(agendaMinuteToPx({
      minute: 18 * 60 + 50,
      startMinute,
      visualEndMinute,
      height: gridHeight,
    })).toBe(25 * slotHeight);
    expect(agendaMinuteToPx({
      minute: endMinute,
      startMinute,
      visualEndMinute,
      height: gridHeight,
    })).toBe(25.5 * slotHeight);
  });

  it("keeps adjacent events in a single lane", () => {
    const layout = buildOverlapLayout([
      { id: "a", start: 9 * 60, end: 10 * 60 },
      { id: "b", start: 10 * 60, end: 11 * 60 },
    ]);

    expect(layout.get("a")).toEqual({ col: 0, cols: 1 });
    expect(layout.get("b")).toEqual({ col: 0, cols: 1 });
  });

  it("keeps a 10:30-12:00 card ending exactly on the noon boundary", () => {
    const startDay = 8 * 60;
    const minuteToPx = (minute: number) => minute - startDay;
    const box = getAgendaTimedItemBox({
      startMinute: 10 * 60 + 30,
      endMinute: 12 * 60,
      dayEndMinute: 18 * 60,
      minuteToPx,
      minHeight: 22,
    });

    expect(box.top).toBe(150);
    expect(box.height).toBe(90);
    expect(box.top + box.height).toBe(minuteToPx(12 * 60));
  });

  it("lets a 12:00-13:00 card start exactly where 10:30-12:00 ends", () => {
    const startDay = 8 * 60;
    const minuteToPx = (minute: number) => minute - startDay;
    const first = getAgendaTimedItemBox({
      startMinute: 10 * 60 + 30,
      endMinute: 12 * 60,
      dayEndMinute: 18 * 60,
      minuteToPx,
      minHeight: 22,
    });
    const second = getAgendaTimedItemBox({
      startMinute: 12 * 60,
      endMinute: 13 * 60,
      dayEndMinute: 18 * 60,
      minuteToPx,
      minHeight: 22,
    });

    expect(first.top + first.height).toBe(second.top);
    expect(buildOverlapLayout([
      { id: "first", start: 10 * 60 + 30, end: 12 * 60 },
      { id: "second", start: 12 * 60, end: 13 * 60 },
    ])).toEqual(new Map([
      ["first", { col: 0, cols: 1 }],
      ["second", { col: 0, cols: 1 }],
    ]));
  });

  it("places overlapping events side by side", () => {
    const layout = buildOverlapLayout([
      { id: "a", start: 9 * 60, end: 10 * 60 },
      { id: "b", start: 9 * 60 + 30, end: 10 * 60 + 30 },
    ]);

    expect(layout.get("a")).toEqual({ col: 0, cols: 2 });
    expect(layout.get("b")).toEqual({ col: 1, cols: 2 });
  });

  it("renders drag selection with a visual slot without changing exclusive end", () => {
    const exclusive = getAgendaSelectionExclusiveRange({
      startMinute: 10 * 60 + 30,
      endMinute: 11 * 60 + 30,
      maxMinute: 18 * 60,
      snapMinutes: 5,
      isDrag: true,
    });
    const visual = getAgendaSelectionVisualRange({
      startMinute: 10 * 60 + 30,
      endMinute: 11 * 60 + 30,
      maxMinute: 18 * 60,
      snapMinutes: 5,
      isDrag: true,
    });

    expect(exclusive).toEqual({ startMinute: 10 * 60 + 30, endMinute: 11 * 60 + 30 });
    expect(visual).toEqual({ startMinute: 10 * 60 + 30, endMinute: 11 * 60 + 35 });
  });

  it("lets drag selection end at the exact final business boundary", () => {
    const range = getAgendaSelectionExclusiveRange({
      startMinute: 19 * 60,
      endMinute: 19 * 60 + 25,
      maxMinute: 19 * 60 + 30,
      snapMinutes: 5,
      isDrag: true,
    });

    expect(range).toEqual({ startMinute: 19 * 60, endMinute: 19 * 60 + 30 });
  });

  it("paints the final drag cell without extending the real selected time", () => {
    const range = getAgendaSelectionExclusiveRange({
      startMinute: 19 * 60,
      endMinute: 19 * 60 + 25,
      maxMinute: 19 * 60 + 30,
      snapMinutes: 5,
      isDrag: true,
    });
    const visual = getAgendaSelectionOverlayVisualRange({
      startMinute: 19 * 60,
      endMinute: 19 * 60 + 25,
      maxMinute: 19 * 60 + 30,
      visualMaxMinute: 19 * 60 + 35,
      snapMinutes: 5,
      isDrag: true,
    });

    expect(range).toEqual({ startMinute: 19 * 60, endMinute: 19 * 60 + 30 });
    expect(visual).toEqual({ startMinute: 19 * 60, endMinute: 19 * 60 + 35 });
  });

  it.each([
    { endMinute: 17 * 60, snapMinutes: 5 },
    { endMinute: 19 * 60 + 30, snapMinutes: 5 },
    { endMinute: 20 * 60 + 30, snapMinutes: 10 },
    { endMinute: 21 * 60, snapMinutes: 30 },
  ])(
    "starts the blocked area after the final visual boundary at $endMinute with $snapMinutes minutes",
    ({ endMinute, snapMinutes }) => {
      expect(getAgendaBottomBlockedStartMinute({
        columnEndMinute: endMinute,
        dayEndMinute: 22 * 60,
        axisEndMinute: 22 * 60 + snapMinutes,
        snapMinutes,
      })).toBe(endMinute + snapMinutes);
    },
  );

  it("does not add an extra blocked area when the column already reaches the day end", () => {
    expect(getAgendaBottomBlockedStartMinute({
      columnEndMinute: 19 * 60 + 30,
      dayEndMinute: 19 * 60 + 30,
      axisEndMinute: 19 * 60 + 35,
      snapMinutes: 5,
    })).toBe(19 * 60 + 35);
  });

  it("does not extend internal drag selection to the next slot boundary", () => {
    const range = getAgendaSelectionExclusiveRange({
      startMinute: 10 * 60,
      endMinute: 11 * 60,
      maxMinute: 19 * 60 + 30,
      snapMinutes: 5,
      isDrag: true,
    });

    expect(range).toEqual({ startMinute: 10 * 60, endMinute: 11 * 60 });
  });

  it("keeps connected overlap chains in the same width group", () => {
    const layout = buildOverlapLayout([
      { id: "a", start: 9 * 60, end: 10 * 60 },
      { id: "b", start: 9 * 60 + 30, end: 10 * 60 + 30 },
      { id: "c", start: 10 * 60, end: 11 * 60 },
    ]);

    expect(layout.get("a")?.cols).toBe(2);
    expect(layout.get("b")?.cols).toBe(2);
    expect(layout.get("c")).toEqual({ col: 0, cols: 2 });
  });
});

describe("getAgendaResourceColumnMetrics", () => {
  it("gives a day-view resource column more room than a week column", () => {
    const week = getAgendaResourceColumnMetrics({
      axisWidth: 50,
      columnCount: 7,
      isSingleDayGrid: false,
      isMultiResource: true,
    });
    const day = getAgendaResourceColumnMetrics({
      axisWidth: 54,
      columnCount: 4,
      isSingleDayGrid: true,
      isMultiResource: true,
    });
    expect(week.columnMinWidth).toBe(180);
    expect(day.columnMinWidth).toBe(220);
  });

  it("lets the host widen columns when cards would be too narrow", () => {
    // A week column holds every professional at once, so overlapping cards split
    // its width. Hosts with a busy calendar need to be able to raise the floor.
    const metrics = getAgendaResourceColumnMetrics({
      axisWidth: 50,
      columnCount: 7,
      isSingleDayGrid: false,
      isMultiResource: true,
      columnMinWidth: 300,
    });
    expect(metrics.columnMinWidth).toBe(300);
    expect(metrics.minWidth).toBe(`${50 + 7 * 300}px`);
    expect(metrics.gridTemplate).toContain("minmax(300px, 1fr)");
  });

  it("ignores a nonsensical override", () => {
    const metrics = getAgendaResourceColumnMetrics({
      axisWidth: 50,
      columnCount: 7,
      isSingleDayGrid: false,
      isMultiResource: true,
      columnMinWidth: 0,
    });
    expect(metrics.columnMinWidth).toBe(180);
  });
});

describe("calculateAgendaDynamicSlotHeight", () => {
  it("stretches rows to fill a viewport with room to spare", () => {
    // 16 slots in a 800px viewport: each row grows to 50px and nothing scrolls.
    expect(
      calculateAgendaDynamicSlotHeight({ baseSlotHeight: 32, availableHeight: 800, slotCount: 16 })
    ).toBe(50);
  });

  it("never shrinks a row below the base height", () => {
    // 32 slots would need 25px each to fit; the floor keeps them readable and
    // the grid becomes taller than the viewport — which is what makes it scroll.
    expect(
      calculateAgendaDynamicSlotHeight({ baseSlotHeight: 32, availableHeight: 800, slotCount: 32 })
    ).toBe(32);
  });

  it("lets a taller base force a scrollbar on a short day", () => {
    expect(
      calculateAgendaDynamicSlotHeight({ baseSlotHeight: 64, availableHeight: 800, slotCount: 16 })
    ).toBe(64);
  });

  it("falls back to the base when the viewport has not been measured yet", () => {
    expect(
      calculateAgendaDynamicSlotHeight({ baseSlotHeight: 32, availableHeight: 0, slotCount: 16 })
    ).toBe(32);
  });
});
