import type { TimeZone } from "@zigoschedule/scheduler-core";
import {
  getAppointmentRecurrenceExceptions,
  getAppointmentRecurrenceOverrides,
  getAppointmentRecurrenceRule,
  hasValidAppointmentTiming,
  type Appointment,
  type AppointmentOccurrencePatch,
} from "@zigoschedule/scheduler-engine";

/**
 * Optional recurrence, wired through the scheduler plugin hook.
 *
 * The layout knows *that* an appointment can repeat, never *how*. Whoever
 * imports `@zigoschedule/scheduler-recurrence` registers an expander here, and from then
 * on any appointment carrying a rule is expanded before it is drawn.
 *
 * The point is the cost: recurrence brings the `rrule` library with it, roughly
 * twenty kilobytes. Wiring it as a dependency would charge that to everyone,
 * including the salon that never repeats an appointment. A plugin charges only
 * whoever asks.
 */

/** Change applied to one occurrence without changing the rest of the series. */
export type OccurrencePatch = AppointmentOccurrencePatch;

export type RecurrenceExpander = (input: {
  appointment: Appointment;
  rule: string;
  exceptions: string[];
  /** Per-occurrence overrides, indexed by the original slot day. */
  overrides: Record<string, OccurrencePatch>;
  timeZone: TimeZone;
  range: { from: Date; to: Date };
}) => Appointment[];

let expander: RecurrenceExpander | null = null;

/** Called by `@zigoschedule/scheduler-recurrence` on import. */
export function registerRecurrenceExpander(fn: RecurrenceExpander): void {
  expander = fn;
}

/** Undoes the registration. Exists so tests can run both ways. */
export function clearRecurrenceExpander(): void {
  expander = null;
}

export function hasRecurrenceExpander(): boolean {
  return expander !== null;
}

/** Rule carried by an appointment, or null when it does not repeat. */
export const recurrenceRuleOf = (appointment: Appointment): string | null => {
  return getAppointmentRecurrenceRule(appointment);
};

const exceptionsOf = (appointment: Appointment): string[] => {
  return getAppointmentRecurrenceExceptions(appointment);
};

const overridesOf = (appointment: Appointment): Record<string, OccurrencePatch> => {
  const raw = getAppointmentRecurrenceOverrides(appointment);

  const out: Record<string, OccurrencePatch> = {};
  for (const [dayKey, patch] of Object.entries(raw as Record<string, unknown>)) {
    // A bad override key comes from host data. Ignore that row and keep the
    // calendar up rather than crashing the whole schedule.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) continue;
    if (patch && typeof patch === "object") out[dayKey] = patch as OccurrencePatch;
  }
  return out;
};

/**
 * Replaces every repeating appointment with its occurrences in `range`.
 *
 * Without a registered expander the list comes back untouched: a repeating
 * appointment then behaves like a single one, which is the honest fallback: it
 * still shows on its original date instead of vanishing.
 */
export function expandRecurringAppointments(
  appointments: Appointment[],
  timeZone: TimeZone,
  range: { from: Date; to: Date }
): Appointment[] {
  const validAppointments = appointments.filter(hasValidAppointmentTiming);
  if (!expander) return validAppointments;

  const out: Appointment[] = [];
  for (const appointment of validAppointments) {
    const rule = recurrenceRuleOf(appointment);
    if (!rule) {
      out.push(appointment);
      continue;
    }
    out.push(
      ...expander({
        appointment,
        rule,
        exceptions: exceptionsOf(appointment),
        overrides: overridesOf(appointment),
        timeZone,
        range,
      })
    );
  }
  return out;
}
