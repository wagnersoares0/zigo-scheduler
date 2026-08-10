/**
 * @zigoschedule/scheduler-recurrence - recurring appointments.
 *
 * Adapts `rrule`, the iCalendar RRULE implementation used by Google Calendar,
 * Outlook and Apple Calendar. Kept as a separate package so products without
 * recurrence do not carry the `rrule` dependency or expansion layer.
 */
import "./install";

export { installRecurrence } from "./install";
export { recurrenceExpander, type ExpanderInput } from "./expander";
export { expandRecurrence } from "./expand";
export type { RecurrenceInput, Occurrence, OccurrenceOverride } from "./expand";
export { describeRecurrence, describeInEnglish, describeInPortuguese } from "./describe";

// Occurrence id parsing lives in `core` because a backend that only needs to
// read an id from a drag/resize event should not have to download `rrule`.
// Re-exported here for callers that already have this package.
export {
  occurrenceId,
  parseOccurrenceId,
  isOccurrenceId,
  seriesIdOf,
  type OccurrenceRef,
} from "@zigoschedule/scheduler-core";
