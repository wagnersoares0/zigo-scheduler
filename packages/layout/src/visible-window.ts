import { nextDateKey, zonedDayRangeUtc, type TimeZone } from "@zigoschedule/scheduler-core";
import { DEFAULT_WEEK_START, dateKey, type WeekStart } from "@zigoschedule/scheduler-engine";

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
  const firstKey = dateKey(days[0]);
  const lastKey = dateKey(days[days.length - 1]);
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
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const back = (first.getDay() - startsOn + 7) % 7;
  first.setDate(first.getDate() - back);
  first.setHours(0, 0, 0, 0);
  return first;
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
  const start = monthGridStart(date, startsOn);
  const last = new Date(start);
  last.setDate(start.getDate() + 41);
  return visibleDaysWindow([start, last], timeZone);
}
