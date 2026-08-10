import { describe, expect, it } from "vitest";
import {
  isValidAgendaGranularity,
  isValidAgendaWeekVisualScale,
  normalizeAgendaGranularity,
  normalizeAgendaWeekVisualScale,
} from "../agenda-granularity";

describe("agenda granularity helpers", () => {
  it("keeps day agenda granularities unchanged", () => {
    expect(isValidAgendaGranularity(5)).toBe(true);
    expect(isValidAgendaGranularity(20)).toBe(true);
    expect(normalizeAgendaGranularity("15", 30)).toBe(15);
  });

  it("accepts only 30 or 60 minutes for the week visual scale", () => {
    expect(isValidAgendaWeekVisualScale(30)).toBe(true);
    expect(isValidAgendaWeekVisualScale("60")).toBe(true);
    expect(isValidAgendaWeekVisualScale(5)).toBe(false);
    expect(isValidAgendaWeekVisualScale(15)).toBe(false);
    expect(isValidAgendaWeekVisualScale(20)).toBe(false);
  });

  it("normalizes invalid week visual scales to the safe default", () => {
    expect(normalizeAgendaWeekVisualScale("30", 60)).toBe(30);
    expect(normalizeAgendaWeekVisualScale(60, 30)).toBe(60);
    expect(normalizeAgendaWeekVisualScale(10, 30)).toBe(30);
    expect(normalizeAgendaWeekVisualScale(null, 60)).toBe(60);
    expect(normalizeAgendaWeekVisualScale(undefined, 15)).toBe(30);
  });
});
