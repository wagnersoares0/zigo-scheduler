/**
 * @zigoschedule/scheduler-layout - the render model.
 *
 * Turns appointments into rectangles with coordinates. Draw them with whatever
 * you already use: Vue, Svelte, Alpine, plain DOM. No React, no DOM access,
 * no I/O.
 *
 * Two models, because a month is not a day with more hours: the day and week
 * grid positions boxes against a time axis, the month lists lines inside cells.
 */
export * from "./types";
export * from "./month-types";
export { buildAgendaLayout } from "./build-agenda-layout";
export { buildAgendaMonthLayout } from "./build-month-layout";
/**
 * The `date` accepted by both builders is a calendar-day marker, not an instant.
 *
 * Exporting `fromDayKey` gives callers a safe way to build that marker. Using
 * `new Date()` can accidentally open tomorrow or yesterday when the browser and
 * business are in different time zones.
 */
export { fromDayKey, dateKey, toHHMM } from "./build-agenda-layout";
export {
  visibleDaysWindow,
  monthGridStart,
  monthGridWindow,
} from "./visible-window";
export {
  expandRecurringAppointments,
  registerRecurrenceExpander,
  clearRecurrenceExpander,
  hasRecurrenceExpander,
  recurrenceRuleOf,
  type RecurrenceExpander,
  type OccurrencePatch,
} from "./recurrence-plugin";
