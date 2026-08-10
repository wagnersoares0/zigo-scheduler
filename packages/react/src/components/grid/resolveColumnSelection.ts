import { isMinuteInsideBreakWindow, type BreakWindow } from "@zigoschedule/scheduler-engine";

export const MSG_HORARIO_PASSADO = "This time has already passed.";
export const MSG_INTERVALO_ALMOCO = "This time is reserved for the break.";
export const MSG_HORARIO_OCUPADO = "This time is already booked.";
export const MSG_FORA_FUNCIONAMENTO = "This time is outside business hours.";

export type ColumnSelectionResult =
  | { ok: true; startMinute: number }
  | { ok: false; message: string };

export type ColumnSelectionInput = {
  dayKey: string;
  professionalId: string | null;
  /** Minute the pointer landed on, already snapped to the grid. */
  minute: number;
  /** Working window of this column. */
  startMinute: number;
  endMinute: number;
  pause: BreakWindow | null;
  closedMessage: string | null;
  outOfHoursMessage: string;
  pastMessage?: string;
  lunchMessage?: string;
  occupiedMessage?: string;
  fallbackOutOfHoursMessage?: string;
  /**
   * True when the column has no professional yet, so per-resource checks are
   * postponed to the drawer. Week columns are shared by everyone.
   */
  deferResourceValidation: boolean;
  isDayInPast: (dayKey: string) => boolean;
  isDayFinished: (dayKey: string) => boolean;
  isSlotInPast: (dayKey: string, minute: number) => boolean;
  isSlotTaken: (dayKey: string, professionalId: string | null, minute: number) => boolean;
  /** Nudges the start to the next bookable minute, or refuses. */
  resolveSelectableStart: (
    dayKey: string,
    professionalId: string | null,
    minute: number
  ) => number | null;
};

/**
 * Decides whether a click may open a selection, and where it starts.
 *
 * These were guard clauses buried in a pointer handler. They are business
 * rules: "not in the past", "not during lunch", "not on top of somebody"; and
 * a rule that only runs inside a DOM event is a rule nobody can test.
 *
 * Every refusal carries the sentence the user should see. Refusing silently is
 * what makes a calendar feel broken when it is in fact doing its job.
 */
export function resolveColumnSelection(input: ColumnSelectionInput): ColumnSelectionResult {
  if (input.closedMessage) {
    return { ok: false, message: input.closedMessage };
  }
  if (input.minute < input.startMinute || input.minute >= input.endMinute) {
    return { ok: false, message: input.outOfHoursMessage };
  }
  if (input.isDayInPast(input.dayKey) || input.isDayFinished(input.dayKey)) {
    return { ok: false, message: input.pastMessage ?? MSG_HORARIO_PASSADO };
  }
  if (input.isSlotInPast(input.dayKey, input.minute)) {
    return { ok: false, message: input.pastMessage ?? MSG_HORARIO_PASSADO };
  }
  if (isMinuteInsideBreakWindow(input.minute, input.pause)) {
    return { ok: false, message: input.lunchMessage ?? MSG_INTERVALO_ALMOCO };
  }

  if (input.deferResourceValidation) {
    return { ok: true, startMinute: input.minute };
  }

  const resolved = input.resolveSelectableStart(
    input.dayKey,
    input.professionalId,
    input.minute
  );
  if (resolved === null) {
    return { ok: false, message: input.occupiedMessage ?? MSG_HORARIO_OCUPADO };
  }

  // The nudge can land somewhere the raw minute was not, so the same checks run
  // again against the resolved start.
  if (resolved < input.startMinute || resolved >= input.endMinute) {
    return {
      ok: false,
      message: input.closedMessage ?? input.fallbackOutOfHoursMessage ?? MSG_FORA_FUNCIONAMENTO,
    };
  }
  if (input.isSlotInPast(input.dayKey, resolved)) {
    return { ok: false, message: input.pastMessage ?? MSG_HORARIO_PASSADO };
  }
  if (isMinuteInsideBreakWindow(resolved, input.pause)) {
    return { ok: false, message: input.lunchMessage ?? MSG_INTERVALO_ALMOCO };
  }
  if (input.isSlotTaken(input.dayKey, input.professionalId, resolved)) {
    return { ok: false, message: input.occupiedMessage ?? MSG_HORARIO_OCUPADO };
  }

  return { ok: true, startMinute: resolved };
}
