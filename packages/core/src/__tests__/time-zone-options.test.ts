import { describe, expect, it } from "vitest";
import { buildTimeZoneGroups } from "../time-zone-options";

describe("buildTimeZoneGroups", () => {
  it("highlights important global zones instead of limiting the scheduler to Brazil", () => {
    const groups = buildTimeZoneGroups();
    const labels = groups.map((group) => group.label);
    const zones = new Set(groups.flatMap((group) => group.zones.map((zone) => zone.id)));

    expect(labels).toContain("United States");
    expect(labels).toContain("Canada");
    expect(labels).toContain("Australia and Oceania");
    expect(labels).toContain("Russia");

    expect(zones).toContain("America/New_York");
    expect(zones).toContain("America/Los_Angeles");
    expect(zones).toContain("America/Toronto");
    expect(zones).toContain("Australia/Sydney");
    expect(zones).toContain("Europe/Moscow");
    expect(zones).toContain("Asia/Kamchatka");
  });

  it("includes every IANA zone when the runtime exposes the list", () => {
    const supportsIanaList =
      typeof (
        Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] }
      ).supportedValuesOf === "function";

    const groups = buildTimeZoneGroups();
    const allGroup = groups.find((group) =>
      group.label.includes("All IANA time zones"),
    );

    if (supportsIanaList) {
      expect(allGroup?.zones.length).toBeGreaterThan(100);
    } else {
      expect(allGroup).toBeUndefined();
    }
  });
});
