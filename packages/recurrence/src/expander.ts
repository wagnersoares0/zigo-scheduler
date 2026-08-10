import { occurrenceId } from "@zigoschedule/scheduler-core";
import {
  getAppointmentDurationMinutes,
  getAppointmentStartsAt,
  type Appointment,
  type AppointmentOccurrencePatch,
} from "@zigoschedule/scheduler-engine";
import { expandRecurrence, type OccurrenceOverride } from "./expand";

/**
 * Expands a repeating appointment into the visible occurrences for a window.
 *
 * This file deliberately does not import `@zigoschedule/scheduler-layout`.
 * `install.ts` performs plugin registration; consumers that only need the pure
 * expander can import this file without dragging the layout registry with it.
 */

/** Same contract as the layout `RecurrenceExpander`, written without importing it. */
export type ExpanderInput = {
  appointment: Appointment;
  rule: string;
  exceptions: string[];
  overrides: Record<string, AppointmentOccurrencePatch>;
  timeZone: string;
  range: { from: Date; to: Date };
};

export function recurrenceExpander({
  appointment,
  rule,
  exceptions,
  overrides,
  timeZone,
  range,
}: ExpanderInput): Appointment[] {
  // Expansion only needs time and duration. The rest of the override belongs to
  // the appointment payload and is applied below.
  const timeOverrides: Record<string, OccurrenceOverride> = {};
  for (const [slotDayKey, patch] of Object.entries(overrides)) {
    timeOverrides[slotDayKey] = {
      startsAt: patch.startsAt ?? patch.data_hora,
      durationMinutes: patch.durationMinutes ?? patch.duracao_minutos,
    };
  }

  const occurrences = expandRecurrence({
    rule,
    startsAt: getAppointmentStartsAt(appointment),
    durationMinutes: getAppointmentDurationMinutes(appointment, 30),
    timeZone,
    range,
    exceptions,
    overrides: timeOverrides,
  });

  return occurrences.map((occurrence): Appointment => {
    const patch = overrides[occurrence.slotDayKey] ?? {};
    return {
      ...appointment,
      // The patch comes first so it can change professional, status or service.
      // Time and duration come after, resolved by the recurrence engine.
      ...patch,
      // Always the original slot day, never the moved day. That is the stable
      // occurrence identity a host should persist.
      id: occurrenceId(appointment.id, occurrence.slotDayKey),
      startsAt: occurrence.startsAt,
      data_hora: occurrence.startsAt,
      durationMinutes: Math.round(
        (new Date(occurrence.endsAt).getTime() - new Date(occurrence.startsAt).getTime()) / 60_000
      ),
      duracao_minutos: Math.round(
        (new Date(occurrence.endsAt).getTime() - new Date(occurrence.startsAt).getTime()) / 60_000
      ),
      // The series has already been expanded. Leaving the rule on each card
      // would let the layout try to expand an occurrence again.
      recurrence: null,
      recorrencia: null,
      recurrenceExceptions: undefined,
      recorrencia_excecoes: undefined,
      recurrenceOverrides: undefined,
      recorrencia_alteracoes: undefined,
    } as Appointment;
  });
}
