import { RRule, RRuleSet, rrulestr } from "rrule";
import {
  DEFAULT_TIME_ZONE,
  nextDateKey,
  zonedDateKey,
  zonedMinutesOfDay,
  zonedTimeToUtc,
  type TimeZone,
} from "@zigoschedule/scheduler-core";

/** Change applied to one occurrence without changing the rest of the series. */
export type OccurrenceOverride = {
  /** New instant. It may fall on another day. */
  startsAt?: string | Date;
  /** New duration, in minutes. */
  durationMinutes?: number;
};

export type RecurrenceInput = {
  /** RRULE as text: `"FREQ=WEEKLY;BYDAY=TH"`, or a full `RRULE:`/`EXDATE:` block. */
  rule: string;
  /** First occurrence, as a UTC instant. */
  startsAt: string | Date;
  durationMinutes: number;
  /** Business time zone. The wall clock is what repeats, not the instant. */
  timeZone?: TimeZone;
  /** Only occurrences overlapping this window are returned. */
  range: { from: Date; to: Date };
  /** Occurrences to skip, as date keys ("2026-08-13") or instants. */
  exceptions?: Array<string | Date>;
  /**
   * Changed occurrences, indexed by the original slot day.
   *
   * `{ "2026-08-13": { startsAt: "...T18:00:00Z", durationMinutes: 90 } }`
   */
  overrides?: Record<string, OccurrenceOverride>;
  /** Ceiling on how many to produce. Defaults to 500. */
  limit?: number;
};

export type Occurrence = {
  /** UTC instant of this occurrence. */
  startsAt: string;
  endsAt: string;
  /** Calendar day in the business zone where this occurrence actually lands. */
  dayKey: string;
  /**
   * Slot day produced by the rule. It matches `dayKey` unless the occurrence was
   * moved, and it is the stable identity for the repeat.
   */
  slotDayKey: string;
  /** Minutes since local midnight, always the same as the first occurrence. */
  startMinute: number;
  /** Zero for the original, 1 for the next, and so on. */
  index: number;
  /** `true` when this occurrence was changed individually. */
  moved: boolean;
};

const DEFAULT_LIMIT = 500;
const DAY_MS = 24 * 3600_000;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** Normalises an exception to a date key in the given zone. */
const exceptionKey = (value: string | Date, timeZone: TimeZone): string => {
  if (typeof value === "string" && DAY_KEY.test(value)) return value;
  return zonedDateKey(value, timeZone);
};

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Expands a recurring appointment into its occurrences.
 *
 * The wall clock repeats, not the instant. A session every Thursday at 15:00 is
 * at 15:00 in October and at 15:00 in November, even though daylight saving
 * moved the UTC instant an hour in between. Expanding in UTC, which is what
 * `rrule` does on its own, would drift the appointment by an hour for half the
 * year.
 *
 * So the rule runs over floating dates, and each resulting calendar day is
 * converted back with the original local time. `zonedTimeToUtc` does the DST
 * arithmetic.
 *
 * One occurrence can be moved without affecting the others through `overrides`.
 * The key remains the original slot day; it identifies which repeat changed even
 * after it moves to another day.
 */
export function expandRecurrence(input: RecurrenceInput): Occurrence[] {
  const timeZone = input.timeZone ?? (DEFAULT_TIME_ZONE as TimeZone);
  const limit = input.limit ?? DEFAULT_LIMIT;
  const first = input.startsAt instanceof Date ? input.startsAt : new Date(input.startsAt);
  if (Number.isNaN(first.getTime())) return [];

  const startMinute = zonedMinutesOfDay(first, timeZone);
  const firstDayKey = zonedDateKey(first, timeZone);
  const [year, month, day] = firstDayKey.split("-").map(Number);

  // `dtstart` is deliberately a floating UTC midnight of the first local day:
  // the rule decides *which days*, never what time of day.
  const dtstart = new Date(Date.UTC(year, month - 1, day));

  let rules: RRule | RRuleSet;
  try {
    rules = rrulestr(
      input.rule.includes("RRULE:") ? input.rule : `RRULE:${input.rule}`,
      { dtstart, forceset: false }
    );
  } catch {
    return [];
  }

  const overrides = input.overrides ?? {};

  // The rule produces floating UTC midnights of local days, while the window is
  // made of real instants. Those two scales are offset by up to 14 hours, and an
  // appointment starting late can spill into the next day on top of that. Two
  // days of slack on each side covers both; the extras are filtered out below.
  //
  // A moved occurrence complicates that slack: its original slot may be far from
  // the requested window while the new time is inside. Grow the slack by the
  // largest known shift before expanding because the slot day is already known.
  const SLACK_MS = 2 * DAY_MS + biggestShift(overrides, startMinute, timeZone);
  const from = new Date(input.range.from.getTime() - SLACK_MS);
  const to = new Date(input.range.to.getTime() + SLACK_MS);

  const skip = new Set((input.exceptions ?? []).map((value) => exceptionKey(value, timeZone)));
  const occurrences: Occurrence[] = [];
  let index = 0;

  for (const date of rules.between(from, to, true)) {
    if (occurrences.length >= limit) break;

    const slotDayKey = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
    const current = index++;

    if (skip.has(slotDayKey)) continue;

    const override = overrides[slotDayKey];
    const startsAt = override?.startsAt
      ? new Date(override.startsAt)
      : zonedTimeToUtc(slotDayKey, startMinute, timeZone);
    if (Number.isNaN(startsAt.getTime())) continue;

    const minutes = override?.durationMinutes ?? input.durationMinutes;
    const endsAt = new Date(startsAt.getTime() + minutes * 60_000);

    // The widened search can produce occurrences outside the real window.
    if (endsAt <= input.range.from || startsAt >= input.range.to) continue;

    occurrences.push({
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      dayKey: zonedDateKey(startsAt, timeZone),
      slotDayKey,
      startMinute: zonedMinutesOfDay(startsAt, timeZone),
      index: current,
      moved: Boolean(override),
    });
  }

  // Return wall-clock order, not slot order. A slot from August moved to December
  // is produced while iterating August; returning it there would force every
  // consumer to sort again. `index` still preserves the series position.
  return occurrences.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * Largest jump, in milliseconds, between an original slot and its new time.
 *
 * Without this, moving an occurrence into the following week could make it
 * disappear because the search would stop before reaching its original slot.
 */
function biggestShift(
  overrides: Record<string, OccurrenceOverride>,
  startMinute: number,
  timeZone: TimeZone
): number {
  let biggest = 0;
  for (const [slotDayKey, override] of Object.entries(overrides)) {
    if (!override?.startsAt) continue;
    // A non-date key cannot match any slot. Ignore it so a bad backend row does
    // not take the scheduler down.
    if (!DAY_KEY.test(slotDayKey)) continue;
    const moved = new Date(override.startsAt);
    if (Number.isNaN(moved.getTime())) continue;
    const slot = zonedTimeToUtc(slotDayKey, startMinute, timeZone);
    biggest = Math.max(biggest, Math.abs(moved.getTime() - slot.getTime()));
  }
  return biggest;
}

export { nextDateKey };
