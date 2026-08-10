import { describe, expect, it } from "vitest";
import { zonedMinutesOfDay, zonedTimeToUtc } from "@zigoschedule/scheduler-core";
import { expandRecurrence } from "../expand";

/**
 * The promise of this package is one sentence: the wall clock repeats, not the
 * instant. Everything below exists to hold that line, especially across a
 * daylight saving change — which is where a naive expansion drifts by an hour
 * for half the year and nobody notices until a client shows up early.
 */

const SP = "America/Sao_Paulo"; // no daylight saving time since 2019
const NY = "America/New_York"; // has daylight saving time

const at = (dayKey: string, hhmm: string, zone = SP) => {
  const [h, m] = hhmm.split(":").map(Number);
  return zonedTimeToUtc(dayKey, h * 60 + m, zone).toISOString();
};

const windowFor = (from: string, to: string) => ({
  from: new Date(`${from}T00:00:00Z`),
  to: new Date(`${to}T23:59:59Z`),
});

describe("rule expansion", () => {
  it("repeats every Thursday at the same local time", () => {
    const occurrences = expandRecurrence({
      rule: "FREQ=WEEKLY;BYDAY=TH",
      startsAt: at("2026-08-06", "15:00"), // Thursday
      durationMinutes: 60,
      timeZone: SP,
      range: windowFor("2026-08-01", "2026-08-31"),
    });

    expect(occurrences.map((o) => o.dayKey)).toEqual([
      "2026-08-06", "2026-08-13", "2026-08-20", "2026-08-27",
    ]);
    expect(occurrences.every((o) => o.startMinute === 15 * 60)).toBe(true);
  });

  it("keeps the duration", () => {
    const [first] = expandRecurrence({
      rule: "FREQ=WEEKLY;BYDAY=TH",
      startsAt: at("2026-08-06", "15:00"),
      durationMinutes: 90,
      timeZone: SP,
      range: windowFor("2026-08-01", "2026-08-10"),
    });
    expect(new Date(first.endsAt).getTime() - new Date(first.startsAt).getTime()).toBe(
      90 * 60_000
    );
  });

  it("supports biweekly and monthly rules", () => {
    const biweekly = expandRecurrence({
      rule: "FREQ=WEEKLY;INTERVAL=2;BYDAY=TH",
      startsAt: at("2026-08-06", "15:00"),
      durationMinutes: 60,
      timeZone: SP,
      range: windowFor("2026-08-01", "2026-09-30"),
    });
    expect(biweekly.map((o) => o.dayKey)).toEqual([
      "2026-08-06", "2026-08-20", "2026-09-03", "2026-09-17",
    ]);

    const thirdFriday = expandRecurrence({
      rule: "FREQ=MONTHLY;BYDAY=+3FR",
      startsAt: at("2026-08-21", "10:00"),
      durationMinutes: 60,
      timeZone: SP,
      range: windowFor("2026-08-01", "2026-10-31"),
    });
    expect(thirdFriday.map((o) => o.dayKey)).toEqual([
      "2026-08-21", "2026-09-18", "2026-10-16",
    ]);
  });

  it("numbers the occurrences", () => {
    const occurrences = expandRecurrence({
      rule: "FREQ=DAILY;COUNT=3",
      startsAt: at("2026-08-06", "09:00"),
      durationMinutes: 30,
      timeZone: SP,
      range: windowFor("2026-08-01", "2026-08-31"),
    });
    expect(occurrences.map((o) => o.index)).toEqual([0, 1, 2]);
  });
});

describe("daylight saving time", () => {
  it("keeps the local wall clock when spring DST starts", () => {
    // New York moves clocks forward on 2026-03-08. A 15:00 appointment stays at
    // 15:00 after the change; only the UTC instant shifts.
    const occurrences = expandRecurrence({
      rule: "FREQ=WEEKLY;BYDAY=SU",
      startsAt: at("2026-03-01", "15:00", NY), // before the transition
      durationMinutes: 60,
      timeZone: NY,
      range: windowFor("2026-03-01", "2026-03-22"),
    });

    expect(occurrences.map((o) => o.dayKey)).toEqual([
      "2026-03-01", "2026-03-08", "2026-03-15", "2026-03-22",
    ]);
    // The local wall clock never drifts.
    for (const o of occurrences) {
      expect(zonedMinutesOfDay(o.startsAt, NY)).toBe(15 * 60);
    }
    // The UTC instant really does shift by one hour across March.
    const utc = (iso: string) => new Date(iso).getUTCHours();
    expect(utc(occurrences[0].startsAt)).toBe(20); // EST, UTC-5
    expect(utc(occurrences[3].startsAt)).toBe(19); // EDT, UTC-4
  });

  it("does the same when fall DST ends", () => {
    const occurrences = expandRecurrence({
      rule: "FREQ=WEEKLY;BYDAY=SU",
      startsAt: at("2026-10-25", "15:00", NY),
      durationMinutes: 60,
      timeZone: NY,
      range: windowFor("2026-10-25", "2026-11-15"),
    });
    for (const o of occurrences) {
      expect(zonedMinutesOfDay(o.startsAt, NY)).toBe(15 * 60);
    }
  });

  it("keeps a daily sequence across the transition week", () => {
    const occurrences = expandRecurrence({
      rule: "FREQ=DAILY;COUNT=10",
      startsAt: at("2026-03-04", "09:30", NY),
      durationMinutes: 45,
      timeZone: NY,
      range: windowFor("2026-03-04", "2026-03-14"),
    });

    expect(occurrences).toHaveLength(10);
    expect(occurrences.map((o) => o.dayKey)).toEqual([
      "2026-03-04",
      "2026-03-05",
      "2026-03-06",
      "2026-03-07",
      "2026-03-08",
      "2026-03-09",
      "2026-03-10",
      "2026-03-11",
      "2026-03-12",
      "2026-03-13",
    ]);
    expect(occurrences.every((o) => zonedMinutesOfDay(o.startsAt, NY) === 9 * 60 + 30)).toBe(true);
  });
});

describe("exceptions", () => {
  it("skips a cancelled occurrence", () => {
    const occurrences = expandRecurrence({
      rule: "FREQ=WEEKLY;BYDAY=TH",
      startsAt: at("2026-08-06", "15:00"),
      durationMinutes: 60,
      timeZone: SP,
      range: windowFor("2026-08-01", "2026-08-31"),
      exceptions: ["2026-08-13"],
    });
    expect(occurrences.map((o) => o.dayKey)).toEqual(["2026-08-06", "2026-08-20", "2026-08-27"]);
  });

  it("does not renumber the remaining occurrences", () => {
    // The third occurrence in the series stays the third, even after the second
    // one is cancelled. That is what lets the UI say "this is 3 of 10".
    const occurrences = expandRecurrence({
      rule: "FREQ=WEEKLY;BYDAY=TH",
      startsAt: at("2026-08-06", "15:00"),
      durationMinutes: 60,
      timeZone: SP,
      range: windowFor("2026-08-01", "2026-08-31"),
      exceptions: ["2026-08-13"],
    });
    expect(occurrences.map((o) => o.index)).toEqual([0, 2, 3]);
  });

  it("accepts an exception as an instant, not only a day key", () => {
    const occurrences = expandRecurrence({
      rule: "FREQ=WEEKLY;BYDAY=TH",
      startsAt: at("2026-08-06", "15:00"),
      durationMinutes: 60,
      timeZone: SP,
      range: windowFor("2026-08-01", "2026-08-31"),
      exceptions: [new Date(at("2026-08-20", "15:00"))],
    });
    expect(occurrences.map((o) => o.dayKey)).not.toContain("2026-08-20");
  });
});

describe("range window", () => {
  it("returns only occurrences that cross the requested period", () => {
    const occurrences = expandRecurrence({
      rule: "FREQ=WEEKLY;BYDAY=TH",
      startsAt: at("2026-08-06", "15:00"),
      durationMinutes: 60,
      timeZone: SP,
      range: windowFor("2026-08-12", "2026-08-21"),
    });
    expect(occurrences.map((o) => o.dayKey)).toEqual(["2026-08-13", "2026-08-20"]);
  });

  it("includes an occurrence that starts before the window and ends inside it", () => {
    const occurrences = expandRecurrence({
      rule: "FREQ=DAILY",
      startsAt: at("2026-08-06", "23:30"),
      durationMinutes: 60,
      timeZone: SP,
      range: {
        from: new Date(at("2026-08-07", "00:00")),
        to: new Date(at("2026-08-07", "12:00")),
      },
    });
    expect(occurrences.map((o) => o.dayKey)).toContain("2026-08-06");
  });

  it("never expands forever", () => {
    const occurrences = expandRecurrence({
      rule: "FREQ=DAILY",
      startsAt: at("2026-01-01", "09:00"),
      durationMinutes: 30,
      timeZone: SP,
      range: windowFor("2026-01-01", "2030-01-01"),
      limit: 10,
    });
    expect(occurrences).toHaveLength(10);
  });
});

describe("invalid input", () => {
  it("returns empty instead of throwing", () => {
    const base = {
      startsAt: at("2026-08-06", "15:00"),
      durationMinutes: 60,
      timeZone: SP,
      range: windowFor("2026-08-01", "2026-08-31"),
    };
    expect(expandRecurrence({ ...base, rule: "not a rule" })).toEqual([]);
    expect(expandRecurrence({ ...base, rule: "FREQ=WEEKLY", startsAt: "tomorrow" })).toEqual([]);
  });
});
