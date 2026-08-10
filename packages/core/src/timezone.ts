/**
 * Time zone primitives.
 *
 * Every date calculation in a scheduling system happens in *someone's* local
 * time. A business that opens at 09:00 opens at 09:00 where it is - not at 09:00
 * UTC, and not at 09:00 where the server happens to run.
 *
 * These helpers are the only place in the library that resolves wall-clock time
 * against a real time zone. Everything else works in "minutes since midnight",
 * which is time-zone free and therefore easy to reason about and test.
 *
 * No dependencies: this uses the built-in `Intl` API, available in every modern
 * browser and in supported Node 22+ runtimes.
 */

/** IANA time zone identifier, e.g. "America/Sao_Paulo", "Europe/Lisbon". */
export type TimeZone = string;

/**
 * Fallback used only when a caller does not supply a zone. It exists so the
 * library has defined behavior; production schedules should pass the business
 * IANA zone explicitly.
 */
export const DEFAULT_TIME_ZONE: TimeZone = "UTC";

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatterCache = new Map<TimeZone, Intl.DateTimeFormat>();

function partsFormatter(timeZone: TimeZone): Intl.DateTimeFormat {
  let formatter = partsFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** Breaks an instant into wall-clock parts as seen in `timeZone`. */
function zonedParts(instant: Date, timeZone: TimeZone): ZonedParts {
  const parts = partsFormatter(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((part) => part.type === type)?.value ?? "0";
    return Number(value);
  };
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    // `hourCycle: "h23"` still emits "24" for midnight in some engines.
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
  };
}

/**
 * Offset of `timeZone` at a given instant, in milliseconds.
 * Positive west of UTC is *not* the convention here: this returns
 * `zoneWallClock - utcWallClock`, so America/New_York in winter yields -5h.
 */
function offsetMs(instant: Date, timeZone: TimeZone): number {
  const p = zonedParts(instant, timeZone);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Discard sub-second precision from the instant so the difference is exact.
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * `true` when the string is a named IANA zone this runtime knows about.
 *
 * Fixed offsets ("-03:00", "+05:30") are deliberately rejected even though
 * `Intl` accepts them. An offset is a snapshot, not a zone: it cannot know that
 * the region springs forward in October, so a calendar configured with one
 * silently shifts every appointment twice a year. Requiring a named zone means
 * the runtime's tz database handles that for you - which is the whole reason
 * this module exists.
 *
 * "UTC" is allowed: it is a real zone that genuinely never shifts.
 */
export function isValidTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== "string") return false;
  if (/^[+-]\d{2}(:?\d{2})?$/.test(timeZone.trim())) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Date key ("YYYY-MM-DD") of an instant, as seen in `timeZone`. */
export function zonedDateKey(instant: Date | string, timeZone: TimeZone): string {
  const date = instant instanceof Date ? instant : new Date(instant);
  const p = zonedParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Minutes since local midnight (0-1439) of an instant, as seen in `timeZone`. */
export function zonedMinutesOfDay(instant: Date | string, timeZone: TimeZone): number {
  const date = instant instanceof Date ? instant : new Date(instant);
  const p = zonedParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

/**
 * Day of week (0 = Sunday) for a calendar date in `timeZone`.
 *
 * Anchored at noon on purpose. Any offset up to ±12h keeps noon inside the same
 * calendar day, so the weekday can never slip to the neighbouring day - which is
 * exactly the bug you get when you anchor at midnight and the zone is behind UTC.
 */
export function zonedDayOfWeek(dateYmd: string, timeZone: TimeZone): number {
  const noon = zonedTimeToUtc(dateYmd, 12 * 60, timeZone);
  const p = zonedParts(noon, timeZone);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}

/**
 * Converts a wall-clock time in `timeZone` to the matching UTC instant.
 *
 * The two-pass correction is what makes this survive daylight saving changes:
 * the first pass guesses the offset using the naive timestamp, the second
 * re-reads it at the corrected instant. Without it, times within an hour of a
 * DST boundary land on the wrong side.
 *
 * @param dateYmd  calendar date, "YYYY-MM-DD"
 * @param minutes  minutes since local midnight
 */
export function zonedTimeToUtc(dateYmd: string, minutes: number, timeZone: TimeZone): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd);
  if (!match) {
    throw new RangeError(`Invalid date key: ${dateYmd}. Expected "YYYY-MM-DD".`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0) + minutes * 60_000;

  const firstPass = naive - offsetMs(new Date(naive), timeZone);
  const secondPass = naive - offsetMs(new Date(firstPass), timeZone);
  const result = new Date(secondPass);
  const check = zonedParts(result, timeZone);
  const expectedHour = Math.floor(minutes / 60);
  const expectedMinute = minutes % 60;
  if (
    check.year !== year ||
    check.month !== month ||
    check.day !== day ||
    check.hour !== expectedHour ||
    check.minute !== expectedMinute
  ) {
    throw new RangeError(
      `Wall-clock time ${dateYmd} ${String(expectedHour).padStart(2, "0")}:${String(expectedMinute).padStart(2, "0")} does not exist in ${timeZone}.`
    );
  }
  return result;
}

/**
 * UTC bounds of a calendar day in `timeZone`, as a half-open range.
 *
 * Use this to query a database column stored in UTC:
 * `data_hora >= start AND data_hora < end`.
 *
 * Half-open avoids the classic off-by-one where an appointment at exactly
 * midnight is counted in both days.
 */
export function zonedDayRangeUtc(
  dateYmd: string,
  timeZone: TimeZone
): { start: Date; end: Date } {
  const start = zonedTimeToUtc(dateYmd, 0, timeZone);
  const end = zonedTimeToUtc(nextDateKey(dateYmd), 0, timeZone);
  return { start, end };
}

/** Current date key and minutes-since-midnight in `timeZone`. */
export function zonedNow(
  timeZone: TimeZone,
  now: Date = new Date()
): { dateKey: string; minute: number } {
  return {
    dateKey: zonedDateKey(now, timeZone),
    minute: zonedMinutesOfDay(now, timeZone),
  };
}

/** Calendar date that follows `dateYmd`. Pure string math, no zone involved. */
export function nextDateKey(dateYmd: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd);
  if (!match) {
    throw new RangeError(`Invalid date key: ${dateYmd}. Expected "YYYY-MM-DD".`);
  }
  const next = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1)
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}
