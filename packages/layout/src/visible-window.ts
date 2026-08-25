import { nextDateKey, zonedDayRangeUtc, type TimeZone } from "@zigoschedule/scheduler-core";
import { DEFAULT_WEEK_START, type WeekStart } from "@zigoschedule/scheduler-engine";

export const dateMarkerKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;

export const dateMarkerFromKey = (dayKey: string): Date => new Date(`${dayKey}T12:00:00.000Z`);

export const addDaysKey = (dayKey: string, days: number): string => {
  const date = dateMarkerFromKey(dayKey);
  date.setUTCDate(date.getUTCDate() + days);
  return dateMarkerKey(date);
};

export const weekDayKeys = (
  date: Date,
  startsOn: WeekStart = DEFAULT_WEEK_START
): string[] => {
  const selected = dateMarkerKey(date);
  const weekday = dateMarkerFromKey(selected).getUTCDay();
  const back = (weekday - startsOn + 7) % 7;
  const start = addDaysKey(selected, -back);
  return Array.from({ length: 7 }, (_, index) => addDaysKey(start, index));
};

/**
 * The instants a set of visible days actually covers, in the business zone.
 *
 * A `Date` in this engine is a *day marker*, not an instant: `fromDayKey` builds
 * it at local noon precisely so date arithmetic never trips over a daylight
 * saving change. Reading `.getTime()` off one of those markers and calling it
 * the start of the day is therefore wrong twice over: it is midday, not
 * midnight, and it is midday *where the browser is*, not where the business is.
 *
 * That mistake shifted the recurrence window by twelve hours: a day view asked
 * for occurrences between noon and noon, so a morning appointment fell outside
 * its own day and the card vanished. The day label is the only trustworthy
 * thing to carry across, which is what this does.
 */
export function visibleDaysWindow(
  days: Date[],
  timeZone: TimeZone
): { from: Date; to: Date } {
  const firstKey = dateMarkerKey(days[0]);
  const lastKey = dateMarkerKey(days[days.length - 1]);
  return {
    from: zonedDayRangeUtc(firstKey, timeZone).start,
    // Half-open: up to, and not including, midnight that ends the last day.
    to: zonedDayRangeUtc(nextDateKey(lastKey), timeZone).start,
  };
}

/**
 * First day of the month grid containing `date`.
 *
 * Steps back from day 1 to the selected week start, so the grid always begins on
 * a full column. With Sunday as the first day, the grid often shows an extra day
 * from the previous month, which is expected.
 */
export const monthGridStart = (
  date: Date,
  startsOn: WeekStart = DEFAULT_WEEK_START
): Date => {
  return dateMarkerFromKey(monthGridStartKey(date, startsOn));
};

export const monthGridStartKey = (
  date: Date,
  startsOn: WeekStart = DEFAULT_WEEK_START
): string => {
  const selected = dateMarkerKey(date);
  const first = `${selected.slice(0, 8)}01`;
  const back = (dateMarkerFromKey(first).getUTCDay() - startsOn + 7) % 7;
  return addDaysKey(first, -back);
};

/**
 * The six weeks a month grid shows: always 42 days, so the page never jumps
 * between months.
 *
 * The last day is stepped with `setDate`, not with `+ 41 * 24h`: adding hours
 * across a daylight saving change lands an hour off and drops the last row.
 */
export function monthGridWindow(
  date: Date,
  timeZone: TimeZone,
  startsOn: WeekStart = DEFAULT_WEEK_START
): { from: Date; to: Date } {
  const start = monthGridStartKey(date, startsOn);
  const last = addDaysKey(start, 41);
  return {
    from: zonedDayRangeUtc(start, timeZone).start,
    to: zonedDayRangeUtc(nextDateKey(last), timeZone).start,
  };
}
