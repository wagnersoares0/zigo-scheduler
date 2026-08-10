import { describe, expect, it } from "vitest";
import { isValidHHMM, normalizeHHMM, toMin } from "../time";

describe("time helpers", () => {
  it("normalizes database time values to HH:mm", () => {
    expect(normalizeHHMM("08:30:00")).toBe("08:30");
    expect(normalizeHHMM("18:00")).toBe("18:00");
    expect(normalizeHHMM("24:00:00")).toBe("24:00");
    expect(toMin("08:30:00")).toBe(8 * 60 + 30);
  });

  it("rejects invalid time values", () => {
    expect(isValidHHMM("25:00")).toBe(false);
    expect(isValidHHMM("08:75")).toBe(false);
    expect(isValidHHMM("8:00")).toBe(false);
    expect(normalizeHHMM(null)).toBeNull();
  });
});
