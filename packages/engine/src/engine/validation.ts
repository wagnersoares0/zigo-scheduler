import { BREAK_TIME_MESSAGE, GRID_MIN, PAST_TIME_MESSAGE } from "../constants";
import { isLockedStatus } from "../utils/format";
import { rangeOverlapsBreakWindow } from "../utils/time";
import type {
  AgendaAppointmentEvent,
  AgendaEngineContext,
  AgendaEventMutation,
  AgendaTimeRange,
  AgendaValidationCode,
  AgendaValidationMessages,
  AgendaValidationOptions,
  AgendaValidationResult,
} from "./types";

export const MSG_HORARIO_OCUPADO = "This time conflicts with another appointment or block.";
export const MSG_FORA_EXPEDIENTE = "This appointment does not fit inside the business hours.";
export const MSG_STATUS_TRAVADO = "This appointment is locked and cannot be changed.";
export const MSG_RECURSO_INVALIDO = "This professional is not available on this schedule.";
export const MSG_DIA_FECHADO = "This day is closed on the schedule.";
export const MSG_AGENDAMENTO_NAO_ENCONTRADO = "Appointment not found.";

const messageFor = (
  messages: AgendaValidationMessages | undefined,
  code: AgendaValidationCode,
  fallback: string,
): string => messages?.[code] ?? fallback;

const rangesOverlap = (startA: number, endA: number, startB: number, endB: number): boolean =>
  startA < endB && endA > startB;

const appointmentBusyStart = (appointment: AgendaAppointmentEvent): number =>
  appointment.bufferStartMinute ?? appointment.startMinute;

const appointmentBusyEnd = (appointment: AgendaAppointmentEvent): number =>
  appointment.bufferEndMinute ?? appointment.endMinute;

const withAppointmentBuffer = (
  appointment: AgendaAppointmentEvent,
  range: AgendaTimeRange,
): AgendaTimeRange => ({
  ...range,
  startMinute:
    range.startMinute - Math.max(0, appointment.startMinute - appointmentBusyStart(appointment)),
  endMinute:
    range.endMinute + Math.max(0, appointmentBusyEnd(appointment) - appointment.endMinute),
});

export const isAppointmentLocked = (appointment: Pick<AgendaAppointmentEvent, "status">): boolean =>
  isLockedStatus(appointment.status);

export const validateAgendaRange = (
  context: AgendaEngineContext,
  range: AgendaTimeRange,
  optionsOrIgnoreAppointmentId?: AgendaValidationOptions | string,
): AgendaValidationResult => {
  const durationMinutes = range.endMinute - range.startMinute;
  const targetResourceId = range.resourceId || null;
  const targetResource = targetResourceId
    ? context.resources.find((resource) => resource.id === targetResourceId) ?? null
    : null;
  const options =
    typeof optionsOrIgnoreAppointmentId === "string"
      ? { ignoreAppointmentId: optionsOrIgnoreAppointmentId }
      : optionsOrIgnoreAppointmentId ?? {};

  if (!Number.isFinite(durationMinutes) || durationMinutes < GRID_MIN) {
    return {
      ok: false,
      code: "INVALID_DURATION",
      message: messageFor(options.messages, "INVALID_DURATION", MSG_FORA_EXPEDIENTE),
    };
  }

  if (
    targetResourceId &&
    context.resources.length > 0 &&
    !targetResource
  ) {
    return {
      ok: false,
      code: "RESOURCE_NOT_ALLOWED",
      message: messageFor(options.messages, "RESOURCE_NOT_ALLOWED", MSG_RECURSO_INVALIDO),
    };
  }

  const dayBusinessHours = context.getBusinessHoursForDay?.(range.dayKey) ?? context.businessHours;
  const resourceBusinessHoursForDay = targetResourceId
    ? context.getResourceBusinessHoursForDay?.(targetResourceId, range.dayKey)
    : undefined;
  const targetResourceBusinessHours: typeof context.businessHours | undefined =
    resourceBusinessHoursForDay === null
      ? undefined
      : resourceBusinessHoursForDay ?? targetResource?.businessHours;
  const effectiveStartMinute = Math.max(
    dayBusinessHours.startMinute,
    targetResourceBusinessHours?.startMinute ?? dayBusinessHours.startMinute,
  );
  const effectiveEndMinute = Math.min(
    dayBusinessHours.endMinute,
    targetResourceBusinessHours?.endMinute ?? dayBusinessHours.endMinute,
  );

  if (
    dayBusinessHours.isClosed ||
    resourceBusinessHoursForDay === null ||
    targetResourceBusinessHours?.isClosed ||
    range.startMinute < effectiveStartMinute ||
    range.endMinute > effectiveEndMinute
  ) {
    return {
      ok: false,
      code: "OUTSIDE_BUSINESS_HOURS",
      message: resourceBusinessHoursForDay === null
        ? messageFor(options.messages, "RESOURCE_NOT_ALLOWED", MSG_RECURSO_INVALIDO)
        : dayBusinessHours.isClosed
        ? dayBusinessHours.closedMessage ?? messageFor(options.messages, "OUTSIDE_BUSINESS_HOURS", MSG_DIA_FECHADO)
        : targetResourceBusinessHours?.closedMessage ??
          messageFor(options.messages, "OUTSIDE_BUSINESS_HOURS", MSG_FORA_EXPEDIENTE),
    };
  }

  if (
    context.temporalGuards.isDayBeforeToday(range.dayKey) ||
    context.temporalGuards.isDayClosedForToday(range.dayKey) ||
    context.temporalGuards.isSlotInPast(range.dayKey, range.startMinute)
  ) {
    return {
      ok: false,
      code: "PAST_TIME",
      message: messageFor(options.messages, "PAST_TIME", PAST_TIME_MESSAGE),
    };
  }

  const resourcePausaIntervalo = targetResourceId
    ? (context.getResourceBreakWindowForDay ?? context.getResourcePausaIntervaloForDay)?.(targetResourceId, range.dayKey)
    : undefined;
  const pausaIntervalo = resourcePausaIntervalo === undefined
    ? context.breakWindow ?? context.pausaIntervalo ?? null
    : resourcePausaIntervalo;

  if (rangeOverlapsBreakWindow(range.startMinute, range.endMinute, pausaIntervalo)) {
    return {
      ok: false,
      code: "PAUSE_CONFLICT",
      message: messageFor(options.messages, "PAUSE_CONFLICT", BREAK_TIME_MESSAGE),
    };
  }

  if (!options.skipAppointmentConflicts) {
    const dayAppointments = context.appointmentsByDay.get(range.dayKey) ?? [];
    const hasAppointmentConflict = dayAppointments.some((appointment) => {
      if (appointment.id === options.ignoreAppointmentId) return false;
      if (targetResourceId && (appointment.resourceId ?? "") !== targetResourceId) return false;
      return rangesOverlap(
        range.startMinute,
        range.endMinute,
        appointmentBusyStart(appointment),
        appointmentBusyEnd(appointment),
      );
    });

    if (hasAppointmentConflict) {
      return {
        ok: false,
        code: "APPOINTMENT_CONFLICT",
        message: messageFor(options.messages, "APPOINTMENT_CONFLICT", MSG_HORARIO_OCUPADO),
      };
    }
  }

  if (!options.skipBlockConflicts) {
    const dayBlocks = context.blocksByDay.get(range.dayKey) ?? [];
    const hasBlockConflict = dayBlocks.some((block) => {
      if (block.id === options.ignoreBlockId) return false;
      const blockResourceId = block.resourceId ?? null;
      if (targetResourceId && blockResourceId && blockResourceId !== targetResourceId) return false;
      return rangesOverlap(range.startMinute, range.endMinute, block.startMinute, block.endMinute);
    });

    if (hasBlockConflict) {
      return {
        ok: false,
        code: "BLOCK_CONFLICT",
        message: messageFor(options.messages, "BLOCK_CONFLICT", MSG_HORARIO_OCUPADO),
      };
    }
  }

  return { ok: true };
};

export const validateAppointmentMutation = (
  context: AgendaEngineContext,
  appointment: AgendaAppointmentEvent | null,
  mutation: AgendaEventMutation | null,
  options: Pick<AgendaValidationOptions, "messages"> = {},
): AgendaValidationResult => {
  if (!appointment || !mutation) {
    return {
      ok: false,
      code: "NO_EVENT",
      message: messageFor(options.messages, "NO_EVENT", MSG_AGENDAMENTO_NAO_ENCONTRADO),
    };
  }

  if (isAppointmentLocked(appointment)) {
    return {
      ok: false,
      code: "LOCKED_STATUS",
      message: messageFor(options.messages, "LOCKED_STATUS", MSG_STATUS_TRAVADO),
    };
  }

  return validateAgendaRange(context, withAppointmentBuffer(appointment, mutation.nextRange), {
    ignoreAppointmentId: appointment.id,
    messages: options.messages,
  });
};
