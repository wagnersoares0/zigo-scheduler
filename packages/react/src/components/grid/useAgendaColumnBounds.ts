"use client";

import {
  getAgendaBottomBlockedStartMinute,
  getProfessionalName,
  type BreakWindow,
  type Professional,
} from "@zigoschedule/scheduler-engine";

export type ColumnBusinessHours = {
  startMinute: number;
  endMinute: number;
  isClosed?: boolean;
  closedMessage?: string;
};

export type AgendaColumnBounds = {
  professional: Professional | null;
  businessHours: ColumnBusinessHours;
  professionalBusinessHours: ColumnBusinessHours;
  pause: BreakWindow | null;
  /** First bookable minute: the latest of grid, business and professional. */
  startMinute: number;
  /** Last bookable minute: the earliest of the three. */
  endMinute: number;
  /** Where the greyed-out tail begins, when the column closes before the grid. */
  bottomBlockedStartMinute: number;
  /** Null when the column is open. */
  closedMessage: string | null;
  /** Always a sentence; used when a click lands outside the working hours. */
  outOfHoursMessage: string;
};

type Input = {
  dayKey: string;
  professionalId: string | null;
  displayProfs: Professional[];
  gridStartMinute: number;
  gridEndMinute: number;
  axisEndMinute: number;
  snapMinutes: number;
  getColumnBusinessHours: (dayKey: string) => ColumnBusinessHours;
  getColumnProfessionalBusinessHours: (dayKey: string, profId: string) => ColumnBusinessHours;
  getColumnPausaIntervalo: (dayKey: string, profId: string | null) => BreakWindow | null;
  fallbackClosedMessage: string;
  fallbackOutOfHoursMessage: string;
  professionalOutOfHoursMessage: (professionalName: string) => string;
};

/**
 * The working window of a single column.
 *
 * Three schedules narrow it in sequence: the grid's own span, the business's
 * opening hours, and the professional's own shift. A column is only bookable
 * where all three agree, which is why every bound is a `max` or a `min` and
 * never an assignment.
 */
export function resolveAgendaColumnBounds(input: Input): AgendaColumnBounds {
  const professional = input.professionalId
    ? (input.displayProfs.find((prof) => prof.id === input.professionalId) ?? null)
    : null;

  const businessHours = input.getColumnBusinessHours(input.dayKey);
  const professionalBusinessHours = input.professionalId
    ? input.getColumnProfessionalBusinessHours(input.dayKey, input.professionalId)
    : businessHours;

  const closedMessage = professionalBusinessHours.isClosed
    ? (professionalBusinessHours.closedMessage ?? input.fallbackClosedMessage)
    : businessHours.isClosed
      ? (businessHours.closedMessage ?? input.fallbackClosedMessage)
      : null;

  const startMinute = Math.max(
    input.gridStartMinute,
    businessHours.startMinute,
    professionalBusinessHours.startMinute,
  );
  const endCandidate = Math.min(
    input.gridEndMinute,
    businessHours.endMinute,
    professionalBusinessHours.endMinute,
  );
  const endMinute = endCandidate > startMinute ? endCandidate : startMinute;

  return {
    professional,
    businessHours,
    professionalBusinessHours,
    pause: input.getColumnPausaIntervalo(input.dayKey, input.professionalId),
    startMinute,
    endMinute,
    bottomBlockedStartMinute: getAgendaBottomBlockedStartMinute({
      columnEndMinute: endMinute,
      dayEndMinute: input.gridEndMinute,
      axisEndMinute: input.axisEndMinute,
      snapMinutes: input.snapMinutes,
    }),
    closedMessage,
    outOfHoursMessage:
      closedMessage ??
      (professional
        ? input.professionalOutOfHoursMessage(getProfessionalName(professional))
        : input.fallbackOutOfHoursMessage),
  };
}
