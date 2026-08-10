import { describe, expect, it } from "vitest";
import { isOccurrenceId, occurrenceId, parseOccurrenceId, seriesIdOf } from "../occurrence-id";

/**
 * The convention the backend receives. If it is ambiguous, the server saves the
 * change on the wrong appointment, and nobody notices until the client arrives
 * on the wrong day.
 */

describe("building", () => {
  it("joins series and slot", () => {
    expect(occurrenceId("maria", "2026-08-11")).toBe("maria@2026-08-11");
  });

  it("round-trips", () => {
    const id = occurrenceId("maria", "2026-08-11");
    expect(parseOccurrenceId(id)).toEqual({ seriesId: "maria", slotDayKey: "2026-08-11" });
  });
});

describe("reading", () => {
  it("splits series and slot", () => {
    expect(parseOccurrenceId("maria@2026-08-11")).toEqual({
      seriesId: "maria",
      slotDayKey: "2026-08-11",
    });
  });

  it("accepts uuid as the series", () => {
    const uuid = "8f14e45f-ceea-467a-9d4b-3f1a2c7d5e60";
    expect(parseOccurrenceId(`${uuid}@2026-08-11`)?.seriesId).toBe(uuid);
  });

  it("returns null for a plain appointment", () => {
    expect(parseOccurrenceId("maria")).toBeNull();
    expect(parseOccurrenceId("123")).toBeNull();
  });

  it("does not confuse email with an occurrence", () => {
    // A system that uses email as a key must not see a series where there is none.
    expect(parseOccurrenceId("cliente@exemplo.com")).toBeNull();
    expect(isOccurrenceId("cliente@exemplo.com")).toBe(false);
  });

  it("splits on the last at-sign", () => {
    // Id with an at-sign and a slot suffix: the slot is the tail, the rest is the series.
    expect(parseOccurrenceId("cliente@exemplo.com@2026-08-11")).toEqual({
      seriesId: "cliente@exemplo.com",
      slotDayKey: "2026-08-11",
    });
  });

  it("requires a real date in the tail", () => {
    expect(parseOccurrenceId("maria@tomorrow")).toBeNull();
    expect(parseOccurrenceId("maria@2026-8-1")).toBeNull();
    expect(parseOccurrenceId("maria@")).toBeNull();
  });

  it("does not treat a leading at-sign as a separator", () => {
    expect(parseOccurrenceId("@2026-08-11")).toBeNull();
  });
});

describe("series id", () => {
  it("returns the clean id for an occurrence", () => {
    expect(seriesIdOf("maria@2026-08-11")).toBe("maria");
  });

  it("returns the original id for a plain appointment", () => {
    // This makes `seriesIdOf(event.id)` safe without checking first.
    expect(seriesIdOf("maria")).toBe("maria");
    expect(seriesIdOf("cliente@exemplo.com")).toBe("cliente@exemplo.com");
  });
});
