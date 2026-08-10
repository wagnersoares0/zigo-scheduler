import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEEK_START,
  normalizeWeekStart,
  weekDays,
  weekStart,
  weekdayOrder,
  type BusinessHours,
  type Professional,
} from "@zigoschedule/scheduler-engine";
import { buildAgendaLayout, buildAgendaMonthLayout, monthGridStart } from "../index";

/**
 * Which day the week starts on.
 *
 * This is not just preference; it is country convention. A scheduler that
 * forces Monday looks broken in the United States, and one that forces Sunday
 * looks broken in markets that expect Monday-first weeks.
 */

const SP = "America/Sao_Paulo";
const PROFESSIONALS: Professional[] = [{ id: "ana", nome: "Ana" }];
const OPEN = { ativo: true, abertura: "09:00", fechamento: "17:00" };
const BUSINESS_HOURS: BusinessHours = {
  domingo: OPEN, segunda: OPEN, terca: OPEN, quarta: OPEN,
  quinta: OPEN, sexta: OPEN, sabado: OPEN,
};

/** Wednesday, 2026-08-12, intentionally in the middle of the week. */
const WEDNESDAY = new Date(2026, 7, 12);

const week = (weekStartsOn: 0 | 1) =>
  buildAgendaLayout({
    date: WEDNESDAY,
    view: "week",
    weekStartsOn,
    appointments: [],
    professionals: PROFESSIONALS,
    businessHours: BUSINESS_HOURS,
    timeZone: SP,
    locale: "en-US",
    width: 1400,
    height: 600,
  });

const month = (weekStartsOn: 0 | 1) =>
  buildAgendaMonthLayout({
    date: WEDNESDAY,
    weekStartsOn,
    appointments: [],
    professionals: PROFESSIONALS,
    timeZone: SP,
    locale: "en-US",
    width: 700,
    height: 600,
  });

describe("default", () => {
  it("is Sunday, the initial international default", () => {
    expect(DEFAULT_WEEK_START).toBe(0);
    expect(weekStart(WEDNESDAY).getDay()).toBe(0);
  });

  it("does not change when nothing is requested", () => {
    expect(week(0).columns[0].dayKey).toBe(week(DEFAULT_WEEK_START).columns[0].dayKey);
  });
});

describe("week", () => {
  it("starts on Monday when requested", () => {
    expect(week(1).columns.map((c) => c.dayKey)).toEqual([
      "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13",
      "2026-08-14", "2026-08-15", "2026-08-16",
    ]);
  });

  it("starts on Sunday when requested", () => {
    expect(week(0).columns.map((c) => c.dayKey)).toEqual([
      "2026-08-09", "2026-08-10", "2026-08-11", "2026-08-12",
      "2026-08-13", "2026-08-14", "2026-08-15",
    ]);
  });

  it("shows seven days in both modes", () => {
    expect(week(0).columns).toHaveLength(7);
    expect(week(1).columns).toHaveLength(7);
  });

  it("labels the first column with the right day", () => {
    expect(week(1).columns[0].label.toLowerCase()).toContain("mon");
    expect(week(0).columns[0].label.toLowerCase()).toContain("sun");
  });
});

describe("month", () => {
  it("starts the grid on Monday", () => {
    // August 2026 starts on a Saturday, so the grid opens on 2026-07-27.
    expect(monthGridStart(WEDNESDAY, 1).getDate()).toBe(27);
    expect(month(1).cells[0].dayKey).toBe("2026-07-27");
  });

  it("starts the grid on Sunday", () => {
    expect(monthGridStart(WEDNESDAY, 0).getDate()).toBe(26);
    expect(month(0).cells[0].dayKey).toBe("2026-07-26");
  });

  it("keeps six rows in both modes", () => {
    expect(month(0).cells).toHaveLength(42);
    expect(month(1).cells).toHaveLength(42);
  });

  it("reorders labels with the grid", () => {
    expect(month(1).weekdayLabels).toEqual([
      "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun",
    ]);
    expect(month(0).weekdayLabels).toEqual([
      "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
    ]);
  });

  it("keeps each label matched to the day below it", () => {
    // The classic bug: reorder the grid and forget the header, or the opposite.
    for (const start of [0, 1] as const) {
      const model = month(start);
      const NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (const cell of model.cells.slice(0, 14)) {
        const weekday = new Date(`${cell.dayKey}T12:00:00`).getDay();
        expect(model.weekdayLabels[cell.column]).toBe(NAMES[weekday]);
      }
    }
  });
});

describe("unexpected input", () => {
  it("falls back to Sunday instead of breaking", () => {
    // The value can come from an HTML attribute, which means any string.
    expect(normalizeWeekStart(undefined)).toBe(0);
    expect(normalizeWeekStart("wednesday")).toBe(0);
    expect(normalizeWeekStart(9)).toBe(0);
    expect(normalizeWeekStart(null)).toBe(0);
  });

  it("accepts Sunday as a number or string", () => {
    // HTML attributes always arrive as strings.
    expect(normalizeWeekStart(0)).toBe(0);
    expect(normalizeWeekStart("0")).toBe(0);
  });

  it("accepts Monday as a number or string", () => {
    expect(normalizeWeekStart(1)).toBe(1);
    expect(normalizeWeekStart("1")).toBe(1);
  });
});

describe("lower-level helpers", () => {
  it("weekDays returns seven days from the right start", () => {
    expect(weekDays(WEDNESDAY, 0)[0].getDay()).toBe(0);
    expect(weekDays(WEDNESDAY, 1)[0].getDay()).toBe(1);
  });

  it("weekStart does not move backward when already on the start day", () => {
    const sunday = new Date(2026, 7, 9);
    expect(weekStart(sunday, 0).getDate()).toBe(9);
    // Starting on Monday, this Sunday belongs to the previous week.
    expect(weekStart(sunday, 1).getDate()).toBe(3);
  });

  it("weekdayOrder rotates the list without losing any day", () => {
    expect(weekdayOrder(1)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(weekdayOrder(0)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(new Set(weekdayOrder(0))).toEqual(new Set(weekdayOrder(1)));
  });
});
