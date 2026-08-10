import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIME_ZONE,
  isValidTimeZone,
  nextDateKey,
  splitZonedRangeByDay,
  zonedDateKey,
  zonedDayOfWeek,
  zonedDayRangeUtc,
  zonedMinutesOfDay,
  zonedNow,
  zonedTimeToUtc,
} from "../timezone";

const SAO_PAULO = "America/Sao_Paulo"; // UTC-3, no DST since 2019
const MANAUS = "America/Manaus"; // UTC-4
const RIO_BRANCO = "America/Rio_Branco"; // UTC-5
const NEW_YORK = "America/New_York"; // UTC-5 / UTC-4 with DST
const LISBON = "Europe/Lisbon"; // UTC+0 / UTC+1 with DST
const KIRITIMATI = "Pacific/Kiritimati"; // UTC+14, the far edge

describe("zonedTimeToUtc", () => {
  it("converts wall-clock time to the matching UTC instant", () => {
    // 09:00 in São Paulo (UTC-3) is 12:00 UTC
    expect(zonedTimeToUtc("2026-08-06", 9 * 60, SAO_PAULO).toISOString()).toBe(
      "2026-08-06T12:00:00.000Z"
    );
  });

  it("gives a different instant for the same wall clock in different zones", () => {
    const wall = 9 * 60;
    const sp = zonedTimeToUtc("2026-08-06", wall, SAO_PAULO);
    const manaus = zonedTimeToUtc("2026-08-06", wall, MANAUS);
    const rioBranco = zonedTimeToUtc("2026-08-06", wall, RIO_BRANCO);

    // Each hour further west pushes the UTC instant one hour later
    expect(manaus.getTime() - sp.getTime()).toBe(3_600_000);
    expect(rioBranco.getTime() - manaus.getTime()).toBe(3_600_000);
  });

  it("handles zones ahead of UTC", () => {
    // 09:00 at UTC+14 is 19:00 UTC the *previous* day
    expect(zonedTimeToUtc("2026-08-06", 9 * 60, KIRITIMATI).toISOString()).toBe(
      "2026-08-05T19:00:00.000Z"
    );
  });

  it("survives the spring-forward DST transition", () => {
    // New York springs forward 2026-03-08: 02:00 does not exist, clocks jump to 03:00.
    // 01:00 is still EST (UTC-5) → 06:00 UTC
    expect(zonedTimeToUtc("2026-03-08", 60, NEW_YORK).toISOString()).toBe(
      "2026-03-08T06:00:00.000Z"
    );
    // 03:00 is already EDT (UTC-4) → 07:00 UTC
    expect(zonedTimeToUtc("2026-03-08", 3 * 60, NEW_YORK).toISOString()).toBe(
      "2026-03-08T07:00:00.000Z"
    );
  });

  it("rejects a wall-clock time that does not exist during spring-forward DST", () => {
    expect(() => zonedTimeToUtc("2026-03-08", 2 * 60 + 30, NEW_YORK)).toThrow(
      /does not exist/
    );
  });

  it("survives the fall-back DST transition", () => {
    // New York falls back 2026-11-01. 01:00 happens twice; we resolve to the
    // first occurrence (still EDT, UTC-4) — deterministic, which is what matters.
    const instant = zonedTimeToUtc("2026-11-01", 60, NEW_YORK);
    expect(zonedMinutesOfDay(instant, NEW_YORK)).toBe(60);
  });

  it("round-trips through the zone it came from", () => {
    for (const zone of [SAO_PAULO, MANAUS, NEW_YORK, LISBON, KIRITIMATI]) {
      for (const minutes of [0, 1, 9 * 60, 13 * 60 + 37, 23 * 60 + 59]) {
        const instant = zonedTimeToUtc("2026-06-15", minutes, zone);
        expect(zonedMinutesOfDay(instant, zone)).toBe(minutes);
        expect(zonedDateKey(instant, zone)).toBe("2026-06-15");
      }
    }
  });

  it("round-trips the safe wall-clock slots on DST boundary days", () => {
    for (const [zone, dayKey, minutes] of [
      [NEW_YORK, "2026-03-08", [0, 60, 3 * 60, 12 * 60, 23 * 60 + 30]],
      [NEW_YORK, "2026-11-01", [0, 60, 2 * 60, 12 * 60, 23 * 60 + 30]],
      [LISBON, "2026-03-29", [0, 2 * 60, 12 * 60, 23 * 60 + 30]],
      [LISBON, "2026-10-25", [0, 60, 2 * 60, 12 * 60, 23 * 60 + 30]],
    ] as const) {
      for (const minute of minutes) {
        const instant = zonedTimeToUtc(dayKey, minute, zone);
        expect(zonedDateKey(instant, zone)).toBe(dayKey);
        expect(zonedMinutesOfDay(instant, zone)).toBe(minute);
      }
    }
  });

  it("rejects a malformed date key", () => {
    expect(() => zonedTimeToUtc("06/08/2026", 0, SAO_PAULO)).toThrow(RangeError);
    expect(() => zonedTimeToUtc("2026-8-6", 0, SAO_PAULO)).toThrow(RangeError);
  });
});

describe("zonedDayOfWeek", () => {
  it("returns the weekday of the calendar date", () => {
    // 2026-08-06 is a Thursday
    expect(zonedDayOfWeek("2026-08-06", SAO_PAULO)).toBe(4);
    expect(zonedDayOfWeek("2026-08-09", SAO_PAULO)).toBe(0); // Sunday
  });

  it("does not slip to the neighbouring day in any zone", () => {
    // The noon anchor is what guarantees this. With a midnight anchor, zones
    // behind UTC would report the previous day.
    for (const zone of [SAO_PAULO, MANAUS, RIO_BRANCO, NEW_YORK, LISBON, KIRITIMATI]) {
      expect(zonedDayOfWeek("2026-08-06", zone)).toBe(4);
    }
  });

  it("is stable across a DST boundary", () => {
    expect(zonedDayOfWeek("2026-03-08", NEW_YORK)).toBe(0); // Sunday
    expect(zonedDayOfWeek("2026-11-01", NEW_YORK)).toBe(0); // Sunday
  });
});

describe("zonedDayRangeUtc", () => {
  it("covers exactly one local day as a half-open range", () => {
    const { start, end } = zonedDayRangeUtc("2026-08-06", SAO_PAULO);
    expect(start.toISOString()).toBe("2026-08-06T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-07T03:00:00.000Z");
    expect(end.getTime() - start.getTime()).toBe(24 * 3_600_000);
  });

  it("shifts with the zone", () => {
    const manaus = zonedDayRangeUtc("2026-08-06", MANAUS);
    expect(manaus.start.toISOString()).toBe("2026-08-06T04:00:00.000Z");
  });

  it("is 23 hours long on a spring-forward day", () => {
    const { start, end } = zonedDayRangeUtc("2026-03-08", NEW_YORK);
    expect(end.getTime() - start.getTime()).toBe(23 * 3_600_000);
  });

  it("is 25 hours long on a fall-back day", () => {
    const { start, end } = zonedDayRangeUtc("2026-11-01", NEW_YORK);
    expect(end.getTime() - start.getTime()).toBe(25 * 3_600_000);
  });

  it("excludes the first instant of the next day", () => {
    const { end } = zonedDayRangeUtc("2026-08-06", SAO_PAULO);
    // Midnight on the 7th is the exclusive upper bound, so it belongs to the 7th
    expect(zonedDateKey(end, SAO_PAULO)).toBe("2026-08-07");
    expect(zonedMinutesOfDay(end, SAO_PAULO)).toBe(0);
  });

  it("does not throw when local midnight does not exist", () => {
    const santiago = zonedDayRangeUtc("2025-09-07", "America/Santiago");
    const cairo = zonedDayRangeUtc("2025-04-25", "Africa/Cairo");

    expect(zonedDateKey(santiago.start, "America/Santiago")).toBe("2025-09-07");
    expect(zonedDateKey(cairo.start, "Africa/Cairo")).toBe("2025-04-25");
    expect(santiago.start < santiago.end).toBe(true);
    expect(cairo.start < cairo.end).toBe(true);
  });
});

describe("splitZonedRangeByDay", () => {
  it("splits a range that crosses local midnight", () => {
    const start = zonedTimeToUtc("2030-08-12", 23 * 60 + 30, NEW_YORK);

    expect(splitZonedRangeByDay(start, 90, NEW_YORK)).toEqual([
      { dayKey: "2030-08-12", startMinute: 23 * 60 + 30, endMinute: 24 * 60 },
      { dayKey: "2030-08-13", startMinute: 0, endMinute: 60 },
    ]);
  });

  it("uses the real wall-clock end on a spring-forward day", () => {
    const start = zonedTimeToUtc("2026-03-08", 90, NEW_YORK);

    expect(splitZonedRangeByDay(start, 60, NEW_YORK)).toEqual([
      { dayKey: "2026-03-08", startMinute: 90, endMinute: 210 },
    ]);
  });
});

describe("zonedDateKey and zonedMinutesOfDay", () => {
  it("reads an instant in the requested zone", () => {
    const instant = new Date("2026-08-06T02:30:00.000Z");
    // 02:30 UTC is still the previous evening in São Paulo
    expect(zonedDateKey(instant, SAO_PAULO)).toBe("2026-08-05");
    expect(zonedMinutesOfDay(instant, SAO_PAULO)).toBe(23 * 60 + 30);
    // ...and already midday in Kiritimati
    expect(zonedDateKey(instant, KIRITIMATI)).toBe("2026-08-06");
  });

  it("accepts an ISO string as well as a Date", () => {
    const iso = "2026-08-06T15:45:00.000Z";
    expect(zonedDateKey(iso, SAO_PAULO)).toBe(zonedDateKey(new Date(iso), SAO_PAULO));
    expect(zonedMinutesOfDay(iso, SAO_PAULO)).toBe(12 * 60 + 45);
  });

  it("reports midnight as minute 0, not 1440", () => {
    const midnight = zonedTimeToUtc("2026-08-06", 0, SAO_PAULO);
    expect(zonedMinutesOfDay(midnight, SAO_PAULO)).toBe(0);
  });
});

describe("zonedNow", () => {
  it("reads the injected instant instead of the wall clock", () => {
    const fixed = new Date("2026-08-06T12:00:00.000Z");
    expect(zonedNow(SAO_PAULO, fixed)).toEqual({ dateKey: "2026-08-06", minute: 9 * 60 });
    expect(zonedNow(MANAUS, fixed)).toEqual({ dateKey: "2026-08-06", minute: 8 * 60 });
  });
});

describe("nextDateKey", () => {
  it("advances one day", () => {
    expect(nextDateKey("2026-08-06")).toBe("2026-08-07");
  });

  it("crosses month and year boundaries", () => {
    expect(nextDateKey("2026-08-31")).toBe("2026-09-01");
    expect(nextDateKey("2026-12-31")).toBe("2027-01-01");
  });

  it("handles leap years", () => {
    expect(nextDateKey("2028-02-28")).toBe("2028-02-29");
    expect(nextDateKey("2028-02-29")).toBe("2028-03-01");
    expect(nextDateKey("2026-02-28")).toBe("2026-03-01");
  });

  it("rejects a malformed date key", () => {
    expect(() => nextDateKey("2026/08/06")).toThrow(RangeError);
  });
});

describe("isValidTimeZone", () => {
  it("accepts real IANA identifiers", () => {
    for (const zone of [SAO_PAULO, MANAUS, NEW_YORK, LISBON, KIRITIMATI, "UTC"]) {
      expect(isValidTimeZone(zone)).toBe(true);
    }
  });

  it("rejects unknown or non-IANA names", () => {
    expect(isValidTimeZone("America/Nowhere")).toBe(false);
    expect(isValidTimeZone("BRT")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("rejects fixed offsets even though Intl accepts them", () => {
    // An offset cannot know about daylight saving. Allowing it here would let a
    // caller reintroduce the exact bug this module exists to prevent.
    expect(isValidTimeZone("-03:00")).toBe(false);
    expect(isValidTimeZone("+05:30")).toBe(false);
    expect(isValidTimeZone("-0300")).toBe(false);
  });
});

describe("DEFAULT_TIME_ZONE", () => {
  it("is a valid zone", () => {
    expect(isValidTimeZone(DEFAULT_TIME_ZONE)).toBe(true);
  });
});
