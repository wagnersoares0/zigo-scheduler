import { describe, expect, it } from "vitest";

import { resolveSelectableStartInVisualSlot } from "../slot-availability";

describe("resolveSelectableStartInVisualSlot", () => {
  it("uses the real appointment end inside a larger visual slot", () => {
    const result = resolveSelectableStartInVisualSlot({
      requestedMinute: 11 * 60 + 30,
      visualSlotMinutes: 15,
      dayEndMinute: 19 * 60,
      busyIntervals: [{ startMinute: 11 * 60 + 5, endMinute: 11 * 60 + 35 }],
    });

    expect(result).toBe(11 * 60 + 35);
  });

  it("keeps the slot blocked when the busy interval reaches the visual slot end", () => {
    const result = resolveSelectableStartInVisualSlot({
      requestedMinute: 11 * 60 + 30,
      visualSlotMinutes: 15,
      dayEndMinute: 19 * 60,
      busyIntervals: [{ startMinute: 11 * 60 + 5, endMinute: 11 * 60 + 45 }],
    });

    expect(result).toBeNull();
  });

  it("keeps the slot blocked when chained intervals occupy the remaining space", () => {
    const result = resolveSelectableStartInVisualSlot({
      requestedMinute: 11 * 60 + 30,
      visualSlotMinutes: 20,
      dayEndMinute: 19 * 60,
      busyIntervals: [
        { startMinute: 11 * 60 + 5, endMinute: 11 * 60 + 35 },
        { startMinute: 11 * 60 + 35, endMinute: 11 * 60 + 50 },
      ],
    });

    expect(result).toBeNull();
  });

  it("returns the requested minute when it is already free", () => {
    const result = resolveSelectableStartInVisualSlot({
      requestedMinute: 14 * 60,
      visualSlotMinutes: 30,
      dayEndMinute: 19 * 60,
      busyIntervals: [{ startMinute: 11 * 60 + 5, endMinute: 11 * 60 + 35 }],
    });

    expect(result).toBe(14 * 60);
  });
});
