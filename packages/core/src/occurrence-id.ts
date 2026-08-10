/**
 * Identity for one occurrence inside a recurring series.
 *
 * When an appointment repeats, each occurrence needs its own id. Without it,
 * dragging one occurrence would move the full series and clicking any occurrence
 * would always open the same record. The convention is:
 *
 *     series@YYYY-MM-DD
 *     "therapy-plan@2026-08-11"
 *
 * The day is the original slot produced by the rule, not necessarily where the
 * occurrence is today. If it moves to another day, the id stays stable: it says
 * which repeat is being changed. This mirrors the role of iCalendar
 * `RECURRENCE-ID`; identity must survive rescheduling.
 *
 * This lives in `core`, with no dependencies, because drag handlers need to read
 * occurrence ids without installing the recurrence package.
 */

const SEPARATOR = "@";
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type OccurrenceRef = {
  /** Series id, usually the id stored by the host backend. */
  seriesId: string;
  /** Original slot date. This keys overrides and exceptions. */
  slotDayKey: string;
};

/** Builds an occurrence id. */
export const occurrenceId = (seriesId: string, slotDayKey: string): string =>
  `${seriesId}${SEPARATOR}${slotDayKey}`;

/**
 * Parses an occurrence id, or returns `null` for a normal appointment id.
 *
 * Splits on the last `@` and requires the tail to be a date. An id that already
 * contains `@`, such as an email used as a key, is still treated as a normal
 * appointment id.
 */
export function parseOccurrenceId(id: string): OccurrenceRef | null {
  const cut = id.lastIndexOf(SEPARATOR);
  if (cut <= 0) return null;

  const slotDayKey = id.slice(cut + 1);
  if (!DAY_KEY.test(slotDayKey)) return null;

  return { seriesId: id.slice(0, cut), slotDayKey };
}

/** `true` when the id belongs to a recurring series occurrence. */
export const isOccurrenceId = (id: string): boolean => parseOccurrenceId(id) !== null;

/**
 * Series id behind any event id.
 *
 * For a normal appointment this returns the same id, so callers can use it
 * without checking the id shape first.
 */
export const seriesIdOf = (id: string): string => parseOccurrenceId(id)?.seriesId ?? id;
