import { describe, expect, it } from "vitest";
import { zonedDateKey, zonedMinutesOfDay } from "@zigoschedule/scheduler-core";
import { monthGridWindow, visibleDaysWindow } from "../visible-window";

const NY = "America/New_York";

const day = (year: number, monthIndex: number, date: number) =>
  new Date(year, monthIndex, date, 12, 0, 0, 0);

describe("visibleDaysWindow", () => {
  it("opens and closes at local midnight instead of fixed 24h chunks", () => {
    const spring = visibleDaysWindow([day(2026, 2, 8)], NY);
    expect(zonedDateKey(spring.from, NY)).toBe("2026-03-08");
    expect(zonedMinutesOfDay(spring.from, NY)).toBe(0);
    expect(zonedDateKey(spring.to, NY)).toBe("2026-03-09");
    expect(zonedMinutesOfDay(spring.to, NY)).toBe(0);
    expect(spring.to.getTime() - spring.from.getTime()).toBe(23 * 60 * 60 * 1000);

    const fall = visibleDaysWindow([day(2026, 10, 1)], NY);
    expect(zonedDateKey(fall.from, NY)).toBe("2026-11-01");
    expect(zonedMinutesOfDay(fall.from, NY)).toBe(0);
    expect(zonedDateKey(fall.to, NY)).toBe("2026-11-02");
    expect(zonedMinutesOfDay(fall.to, NY)).toBe(0);
    expect(fall.to.getTime() - fall.from.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it("covers every visible day in a week that crosses DST", () => {
    const days = [
      day(2026, 2, 2),
      day(2026, 2, 3),
      day(2026, 2, 4),
      day(2026, 2, 5),
      day(2026, 2, 6),
      day(2026, 2, 7),
      day(2026, 2, 8),
    ];
    const window = visibleDaysWindow(days, NY);

    expect(zonedDateKey(window.from, NY)).toBe("2026-03-02");
    expect(zonedMinutesOfDay(window.from, NY)).toBe(0);
    expect(zonedDateKey(window.to, NY)).toBe("2026-03-09");
    expect(zonedMinutesOfDay(window.to, NY)).toBe(0);
    expect(window.to.getTime() - window.from.getTime()).toBe((7 * 24 - 1) * 60 * 60 * 1000);
  });
});

describe("monthGridWindow", () => {
  it("keeps all 42 local days when the month grid crosses DST", () => {
    const window = monthGridWindow(day(2026, 2, 15), NY, 0);

    expect(zonedDateKey(window.from, NY)).toBe("2026-03-01");
    expect(zonedMinutesOfDay(window.from, NY)).toBe(0);
    expect(zonedDateKey(window.to, NY)).toBe("2026-04-12");
    expect(zonedMinutesOfDay(window.to, NY)).toBe(0);
    expect(window.to.getTime() - window.from.getTime()).toBe((42 * 24 - 1) * 60 * 60 * 1000);
  });
});
