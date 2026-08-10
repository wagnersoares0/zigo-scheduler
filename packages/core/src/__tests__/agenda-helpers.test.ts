import { describe, expect, it } from "vitest";
import {
  arredondarSlot,
  calculateAvailableSlots,
  calcularNumSlots,
  calcularSlotsDisponiveis,
  countSlots,
  generateTimeSlots,
  roundSlot,
} from "../agenda-helpers";
import { zonedTimeToUtc } from "../timezone";

const SAO_PAULO = "America/Sao_Paulo";
const MANAUS = "America/Manaus";

/** Books an appointment at a wall-clock time in the given zone. */
const at = (hhmm: string, duration: number, timeZone = SAO_PAULO) => {
  const [h, m] = hhmm.split(":").map(Number);
  return {
    data_hora: zonedTimeToUtc("2026-08-06", h * 60 + m, timeZone).toISOString(),
    duracao_minutos: duration,
  };
};

const freeAt = (slots: Array<{ time: string; free: boolean }>, time: string) =>
  slots.find((slot) => slot.time === time)?.free;

describe("generateTimeSlots", () => {
  it("walks from opening to closing in granularity steps", () => {
    expect(generateTimeSlots("08:00", "10:00", 30)).toEqual([
      "08:00",
      "08:30",
      "09:00",
      "09:30",
    ]);
  });

  it("excludes the closing time itself", () => {
    // A slot starting at closing time could never be served.
    expect(generateTimeSlots("08:00", "09:00", 30)).toEqual(["08:00", "08:30"]);
  });

  it("honours a finer granularity", () => {
    expect(generateTimeSlots("08:00", "08:45", 15)).toEqual(["08:00", "08:15", "08:30"]);
  });

  it("returns nothing when closing is not after opening", () => {
    expect(generateTimeSlots("10:00", "10:00", 30)).toEqual([]);
    expect(generateTimeSlots("10:00", "09:00", 30)).toEqual([]);
  });

  it("pads hours and minutes to two digits", () => {
    expect(generateTimeSlots("08:00", "09:10", 65)).toEqual(["08:00", "09:05"]);
  });

  it("falls back instead of looping forever on invalid granularity", () => {
    expect(generateTimeSlots("08:00", "09:00", 0)).toEqual(["08:00", "08:30"]);
    expect(generateTimeSlots("08:00", "09:00", -15)).toEqual(["08:00", "08:30"]);
  });
});

describe("roundSlot", () => {
  it("rounds a duration up to the next multiple of the granularity", () => {
    expect(roundSlot(45, 30)).toBe(60);
    expect(roundSlot(45, 15)).toBe(45);
    expect(roundSlot(20, 15)).toBe(30);
  });

  it("leaves an exact multiple untouched", () => {
    expect(roundSlot(60, 30)).toBe(60);
    expect(roundSlot(0, 30)).toBe(0);
  });

  it("uses the default step when granularity is invalid", () => {
    expect(roundSlot(45, 0)).toBe(60);
    expect(countSlots(45, -5)).toBe(2);
  });
});

describe("countSlots", () => {
  it("counts how many slots a duration occupies", () => {
    expect(countSlots(60, 30)).toBe(2);
    expect(countSlots(45, 15)).toBe(3);
  });

  it("always occupies at least one slot", () => {
    // A 20-minute service on a 30-minute grid still blocks the whole slot.
    expect(countSlots(20, 30)).toBe(1);
    expect(countSlots(0, 30)).toBe(1);
  });
});

describe("calculateAvailableSlots", () => {
  it("marks every slot free when there is nothing booked", () => {
    const slots = calculateAvailableSlots("09:00", "11:00", 30, [], 30);
    expect(slots.map((s) => s.time)).toEqual(["09:00", "09:30", "10:00", "10:30"]);
    expect(slots.every((s) => s.free)).toBe(true);
  });

  it("stops early so the service still fits before closing", () => {
    // A 60-minute service cannot start at 10:30 if the day ends at 11:00.
    const slots = calculateAvailableSlots("09:00", "11:00", 60, [], 30);
    expect(slots.map((s) => s.time)).toEqual(["09:00", "09:30", "10:00"]);
  });

  it("blocks the slots an existing appointment covers", () => {
    const slots = calculateAvailableSlots("09:00", "12:00", 30, [at("10:00", 60)], 30, null, null, SAO_PAULO);
    expect(freeAt(slots, "09:30")).toBe(true);
    expect(freeAt(slots, "10:00")).toBe(false);
    expect(freeAt(slots, "10:30")).toBe(false);
    expect(freeAt(slots, "11:00")).toBe(true);
  });

  it("accepts English appointment field aliases", () => {
    const legacy = at("10:00", 60);
    const slots = calculateAvailableSlots(
      "09:00",
      "12:00",
      30,
      [{ startsAt: legacy.data_hora, durationMinutes: 60 }],
      30,
      null,
      null,
      SAO_PAULO,
    );
    expect(freeAt(slots, "10:00")).toBe(false);
  });

  it("does not block a slot that merely touches an appointment", () => {
    // 09:00–10:00 booked: a 30-minute service at 08:30 ends exactly at 09:00.
    const slots = calculateAvailableSlots("08:00", "12:00", 30, [at("09:00", 60)], 30, null, null, SAO_PAULO);
    expect(freeAt(slots, "08:30")).toBe(true);
    expect(freeAt(slots, "09:00")).toBe(false);
    expect(freeAt(slots, "10:00")).toBe(true);
  });

  it("rounds an odd appointment duration up to the grid", () => {
    // A 40-minute appointment at 09:00 on a 30-minute grid occupies until 10:00,
    // because leaving a 20-minute stub nobody can book is worse than losing it.
    const slots = calculateAvailableSlots("09:00", "12:00", 30, [at("09:00", 40)], 30, null, null, SAO_PAULO);
    expect(freeAt(slots, "09:30")).toBe(false);
    expect(freeAt(slots, "10:00")).toBe(true);
  });

  it("blocks slots that overlap the lunch break", () => {
    const slots = calculateAvailableSlots("09:00", "15:00", 30, [], 30, "12:00", "13:00");
    expect(freeAt(slots, "11:30")).toBe(true);
    expect(freeAt(slots, "12:00")).toBe(false);
    expect(freeAt(slots, "12:30")).toBe(false);
    expect(freeAt(slots, "13:00")).toBe(true);
  });

  it("blocks a slot whose service would run into the break", () => {
    // 60-minute service at 11:30 would end at 12:30, inside a 12:00 break.
    const slots = calculateAvailableSlots("09:00", "15:00", 60, [], 30, "12:00", "13:00");
    expect(freeAt(slots, "11:30")).toBe(false);
    expect(freeAt(slots, "11:00")).toBe(true);
  });

  it("ignores the break when only one side is given", () => {
    const slots = calculateAvailableSlots("09:00", "15:00", 30, [], 30, "12:00", null);
    expect(slots.every((s) => s.free)).toBe(true);
  });

  it("reads appointment times in the business's own zone", () => {
    // The same instant is 10:00 in São Paulo and 09:00 in Manaus. A salon in
    // Manaus must see it blocking 09:00, not 10:00.
    const instant = at("10:00", 60, SAO_PAULO);

    const sp = calculateAvailableSlots("08:00", "12:00", 30, [instant], 30, null, null, SAO_PAULO);
    expect(freeAt(sp, "10:00")).toBe(false);
    expect(freeAt(sp, "09:00")).toBe(true);

    const manaus = calculateAvailableSlots("08:00", "12:00", 30, [instant], 30, null, null, MANAUS);
    expect(freeAt(manaus, "09:00")).toBe(false);
    expect(freeAt(manaus, "10:00")).toBe(true);
  });

  it("returns nothing when the window cannot fit the service", () => {
    expect(calculateAvailableSlots("09:00", "09:30", 60, [], 30)).toEqual([]);
  });

  it("falls back instead of looping forever when availability granularity is invalid", () => {
    const slots = calculateAvailableSlots("09:00", "10:00", 30, [], 0);
    expect(slots.map((slot) => slot.time)).toEqual(["09:00", "09:30"]);
  });

  it("keeps Portuguese aliases for legacy callers", () => {
    expect(arredondarSlot(45, 30)).toBe(roundSlot(45, 30));
    expect(calcularNumSlots(60, 30)).toBe(countSlots(60, 30));
    expect(calcularSlotsDisponiveis("09:00", "09:30", 30, [], 30)[0]).toMatchObject({
      free: true,
      livre: true,
    });
  });
});
