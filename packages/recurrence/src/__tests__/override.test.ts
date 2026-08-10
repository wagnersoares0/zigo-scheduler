import { describe, expect, it } from "vitest";
import { zonedMinutesOfDay, zonedTimeToUtc } from "@zigoschedule/scheduler-core";
import { expandRecurrence } from "../expand";

/**
 * Moving **one** occurrence.
 *
 * This is what every scheduler user tries first: "this week Maya can only do
 * 17:00". Cancelling an occurrence plus creating a one-off appointment breaks
 * the series in the operator's head, so rescheduling must be first-class.
 *
 * The rule that keeps it stable: **the original slot is the identity**. The
 * occurrence may change time, duration, or even day; the generated day still
 * says *which* repetition it is.
 */

const SP = "America/Sao_Paulo";

const at = (dayKey: string, hhmm: string, zone = SP) => {
  const [h, m] = hhmm.split(":").map(Number);
  return zonedTimeToUtc(dayKey, h * 60 + m, zone).toISOString();
};

const windowFor = (from: string, to: string) => ({
  from: new Date(`${from}T00:00:00Z`),
  to: new Date(`${to}T23:59:59Z`),
});

/** Every Thursday at 15:00 for the whole month of August. */
const base = {
  rule: "FREQ=WEEKLY;BYDAY=TH",
  startsAt: at("2026-08-06", "15:00"),
  durationMinutes: 60,
  timeZone: SP,
  range: windowFor("2026-08-01", "2026-08-31"),
};

describe("changing one occurrence time", () => {
  it("moves only the changed occurrence", () => {
    const occurrences = expandRecurrence({
      ...base,
      overrides: { "2026-08-13": { startsAt: at("2026-08-13", "17:00") } },
    });

    expect(occurrences.map((o) => zonedMinutesOfDay(o.startsAt, SP))).toEqual([
      15 * 60, // 06, unchanged
      17 * 60, // 13, moved
      15 * 60, // 20, unchanged
      15 * 60, // 27, unchanged
    ]);
  });

  it("marks which occurrence was changed", () => {
    const occurrences = expandRecurrence({
      ...base,
      overrides: { "2026-08-13": { startsAt: at("2026-08-13", "17:00") } },
    });
    expect(occurrences.map((o) => o.moved)).toEqual([false, true, false, false]);
  });

  it("keeps the original slot after moving", () => {
    const occurrences = expandRecurrence({
      ...base,
      overrides: { "2026-08-13": { startsAt: at("2026-08-13", "17:00") } },
    });
    const moved = occurrences.find((o) => o.moved)!;
    expect(moved.slotDayKey).toBe("2026-08-13");
    expect(moved.dayKey).toBe("2026-08-13");
  });

  it("changes duration independently", () => {
    const occurrences = expandRecurrence({
      ...base,
      overrides: { "2026-08-20": { durationMinutes: 120 } },
    });
    const durations = occurrences.map(
      (o) => (new Date(o.endsAt).getTime() - new Date(o.startsAt).getTime()) / 60_000
    );
    expect(durations).toEqual([60, 60, 120, 60]);
    // Without `startsAt` in the override, the time stays on the rule value.
    expect(zonedMinutesOfDay(occurrences[2].startsAt, SP)).toBe(15 * 60);
  });
});

describe("changing one occurrence day", () => {
  it("appears on the new day with the old slot as identity", () => {
    // It moved from Thursday the 13th to Saturday the 15th; the series did not change.
    const occurrences = expandRecurrence({
      ...base,
      overrides: { "2026-08-13": { startsAt: at("2026-08-15", "10:00") } },
    });

    const moved = occurrences.find((o) => o.moved)!;
    expect(moved.dayKey).toBe("2026-08-15"); // where it is
    expect(moved.slotDayKey).toBe("2026-08-13"); // which occurrence it is
    expect(occurrences.map((o) => o.dayKey)).toEqual([
      "2026-08-06", "2026-08-15", "2026-08-20", "2026-08-27",
    ]);
  });

  it("leaves the window when moved outside it", () => {
    const occurrences = expandRecurrence({
      ...base,
      range: windowFor("2026-08-10", "2026-08-16"),
      overrides: { "2026-08-13": { startsAt: at("2026-09-10", "15:00") } },
    });
    expect(occurrences).toEqual([]);
  });

  it("enters the window when moved inside it", () => {
    // The original slot (2026-08-06) is outside the requested period; the new
    // time is inside it. Without slack proportional to the jump, search would
    // stop before the slot and this occurrence would disappear.
    const occurrences = expandRecurrence({
      ...base,
      range: windowFor("2026-08-24", "2026-08-26"),
      overrides: { "2026-08-06": { startsAt: at("2026-08-25", "11:00") } },
    });
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].slotDayKey).toBe("2026-08-06");
    expect(occurrences[0].dayKey).toBe("2026-08-25");
  });

  it("handles a multi-month jump and stays sorted by actual time", () => {
    // The series does not stop: December has its own Thursdays. The August
    // occurrence rescheduled to a Tuesday in December lands among them and
    // sorts by actual date, not by the original August slot.
    const occurrences = expandRecurrence({
      ...base,
      range: windowFor("2026-12-01", "2026-12-31"),
      overrides: { "2026-08-06": { startsAt: at("2026-12-08", "09:00") } },
    });

    expect(occurrences.map((o) => o.dayKey)).toEqual([
      "2026-12-03", "2026-12-08", "2026-12-10", "2026-12-17", "2026-12-24", "2026-12-31",
    ]);
    const rescheduled = occurrences.find((o) => o.moved)!;
    expect(rescheduled.slotDayKey).toBe("2026-08-06");
    expect(rescheduled.index).toBe(0); // still the first occurrence in the series
  });
});

describe("override and cancellation together", () => {
  it("cancellation wins, so the occurrence stays removed even with an override", () => {
    // Order matters. A rescheduled and then cancelled occurrence must disappear,
    // not reappear at the new time.
    const occurrences = expandRecurrence({
      ...base,
      exceptions: ["2026-08-13"],
      overrides: { "2026-08-13": { startsAt: at("2026-08-13", "17:00") } },
    });
    expect(occurrences.map((o) => o.slotDayKey)).toEqual([
      "2026-08-06", "2026-08-20", "2026-08-27",
    ]);
  });

  it("does not renumber the remaining occurrences", () => {
    const occurrences = expandRecurrence({
      ...base,
      exceptions: ["2026-08-13"],
      overrides: { "2026-08-20": { startsAt: at("2026-08-20", "18:00") } },
    });
    expect(occurrences.map((o) => o.index)).toEqual([0, 2, 3]);
  });
});

describe("malformed override", () => {
  it("ignores an invalid date instead of throwing", () => {
    const occurrences = expandRecurrence({
      ...base,
      overrides: { "2026-08-13": { startsAt: "not a date" } },
    });
    // The bad occurrence is removed; the good ones remain.
    expect(occurrences.map((o) => o.slotDayKey)).toEqual([
      "2026-08-06", "2026-08-20", "2026-08-27",
    ]);
  });

  it("ignores a key that is not a day", () => {
    const occurrences = expandRecurrence({
      ...base,
      overrides: { tomorrow: { startsAt: at("2026-08-13", "17:00") } },
    });
    expect(occurrences).toHaveLength(4);
    expect(occurrences.every((o) => !o.moved)).toBe(true);
  });
});

describe("without overrides", () => {
  it("uses the day itself as the slot identity", () => {
    const occurrences = expandRecurrence(base);
    expect(occurrences.every((o) => o.dayKey === o.slotDayKey)).toBe(true);
    expect(occurrences.every((o) => o.moved === false)).toBe(true);
  });
});
