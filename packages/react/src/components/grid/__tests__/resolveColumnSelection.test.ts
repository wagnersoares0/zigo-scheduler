import { describe, expect, it } from "vitest";
import {
  MSG_FORA_FUNCIONAMENTO,
  MSG_HORARIO_OCUPADO,
  MSG_HORARIO_PASSADO,
  MSG_INTERVALO_ALMOCO,
  resolveColumnSelection,
  type ColumnSelectionInput,
} from "../resolveColumnSelection";

/**
 * These rules used to live inside a pointer handler, which meant nobody could
 * test them. They decide whether a click may open a new appointment — the most
 * consequential decision the grid makes, and the one a user notices instantly
 * when it is wrong.
 */

const base: ColumnSelectionInput = {
  dayKey: "2026-08-10",
  professionalId: "ana",
  minute: 600, // 10:00
  startMinute: 540, // 09:00
  endMinute: 1020, // 17:00
  pause: null,
  closedMessage: null,
  outOfHoursMessage: "Outside business hours.",
  deferResourceValidation: false,
  isDayInPast: () => false,
  isDayFinished: () => false,
  isSlotInPast: () => false,
  isSlotTaken: () => false,
  resolveSelectableStart: (_day, _prof, minute) => minute,
};

const resolve = (patch: Partial<ColumnSelectionInput> = {}) =>
  resolveColumnSelection({ ...base, ...patch });

const LUNCH = { inicioMin: 720, fimMin: 780, inicioHHMM: "12:00", fimHHMM: "13:00" };

describe("accepting", () => {
  it("accepts a free minute inside the working window", () => {
    expect(resolve()).toEqual({ ok: true, startMinute: 600 });
  });

  it("accepts the first minute of the day", () => {
    expect(resolve({ minute: 540 })).toEqual({ ok: true, startMinute: 540 });
  });

  it("uses the nudged start when the column moves it", () => {
    // A column may push the start to the next bookable minute.
    expect(resolve({ resolveSelectableStart: () => 615 })).toEqual({
      ok: true,
      startMinute: 615,
    });
  });
});

describe("refusing, with a reason", () => {
  it("refuses a closed column and repeats its own message", () => {
    expect(resolve({ closedMessage: "This day is closed." })).toEqual({
      ok: false,
      message: "This day is closed.",
    });
  });

  it("refuses before opening and after closing", () => {
    expect(resolve({ minute: 480 })).toEqual({ ok: false, message: base.outOfHoursMessage });
    expect(resolve({ minute: 1020 })).toEqual({ ok: false, message: base.outOfHoursMessage });
  });

  it("refuses a day already gone", () => {
    expect(resolve({ isDayInPast: () => true }).ok).toBe(false);
    expect(resolve({ isDayInPast: () => true })).toMatchObject({ message: MSG_HORARIO_PASSADO });
  });

  it("refuses a day the business has already closed out", () => {
    expect(resolve({ isDayFinished: () => true })).toMatchObject({
      message: MSG_HORARIO_PASSADO,
    });
  });

  it("refuses a minute already in the past today", () => {
    expect(resolve({ isSlotInPast: () => true })).toMatchObject({
      message: MSG_HORARIO_PASSADO,
    });
  });

  it("refuses the lunch break", () => {
    expect(resolve({ minute: 730, pause: LUNCH })).toMatchObject({
      message: MSG_INTERVALO_ALMOCO,
    });
  });

  it("refuses when the column has nowhere free to start", () => {
    expect(resolve({ resolveSelectableStart: () => null })).toMatchObject({
      message: MSG_HORARIO_OCUPADO,
    });
  });

  it("refuses when the slot is taken", () => {
    expect(resolve({ isSlotTaken: () => true })).toMatchObject({
      message: MSG_HORARIO_OCUPADO,
    });
  });
});

describe("re-checking the nudged start", () => {
  it("refuses when the nudge lands outside the working window", () => {
    expect(resolve({ resolveSelectableStart: () => 1030 })).toEqual({
      ok: false,
      message: MSG_FORA_FUNCIONAMENTO,
    });
  });

  it("refuses when the nudge lands in the lunch break", () => {
    // The raw minute was fine; the nudged one is not. Checking only the first
    // would book somebody into lunch.
    expect(resolve({ pause: LUNCH, resolveSelectableStart: () => 730 })).toMatchObject({
      message: MSG_INTERVALO_ALMOCO,
    });
  });

  it("refuses when the nudge lands in the past", () => {
    expect(
      resolve({
        resolveSelectableStart: () => 570,
        isSlotInPast: (_day, minute) => minute === 570,
      })
    ).toMatchObject({ message: MSG_HORARIO_PASSADO });
  });

  it("prefers the column's own closed message when it has one", () => {
    expect(
      resolve({ closedMessage: null, resolveSelectableStart: () => 1030 })
    ).toMatchObject({ message: MSG_FORA_FUNCIONAMENTO });
  });
});

describe("deferred resource validation", () => {
  it("skips the per-professional checks in a shared column", () => {
    // A week column belongs to every professional at once, so "is this slot
    // taken" has no answer yet — the drawer asks it later.
    expect(
      resolve({
        deferResourceValidation: true,
        isSlotTaken: () => true,
        resolveSelectableStart: () => null,
      })
    ).toEqual({ ok: true, startMinute: 600 });
  });

  it("still enforces the rules that do not depend on a professional", () => {
    expect(
      resolve({ deferResourceValidation: true, minute: 730, pause: LUNCH })
    ).toMatchObject({ message: MSG_INTERVALO_ALMOCO });
    expect(
      resolve({ deferResourceValidation: true, isDayInPast: () => true })
    ).toMatchObject({ message: MSG_HORARIO_PASSADO });
  });
});
