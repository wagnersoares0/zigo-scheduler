import {
  DEFAULT_TIME_ZONE,
  getAgendaMessages,
  zonedNow,
  zonedTimeToUtc,
} from "@zigoschedule/scheduler-core";
import {
  buildAgendaEngineContext,
  buildMoveMutation,
  buildResizeMutation,
  dateKey,
  findAppointmentEvent,
  getEffectiveBusinessHoursForDay,
  getGridBusinessHoursRange,
  getProfessionalBreakWindowForDay,
  getProfessionalBusinessHoursRange,
  groupAppointmentsByDay,
  groupBlocksByDay,
  validateAgendaRange,
  validateAppointmentMutation,
  weekDays,
  type AgendaEngineContext,
  type AgendaValidationMessages,
} from "@zigoschedule/scheduler-engine";
import {
  expandRecurringAppointments,
  visibleDaysWindow,
  type AgendaLayoutInput,
} from "@zigoschedule/scheduler-layout";
import type { GestureCallbacks } from "./gestures";
import type { RangeSelection } from "./selection";

type MoveChange = Parameters<NonNullable<GestureCallbacks["onMove"]>>[0];
type ResizeChange = Parameters<NonNullable<GestureCallbacks["onResize"]>>[0];
type Emit = (name: string, detail: unknown) => boolean;
type ValidationState = {
  engine: AgendaEngineContext;
  messages: AgendaValidationMessages;
  emit: Emit;
  timeZone: string;
};

const DEFAULT_HOURS = { opensAt: "08:00", closesAt: "18:00" };

const validationMessages = (input: AgendaLayoutInput): AgendaValidationMessages => {
  const messages = getAgendaMessages(input.locale, input.messages);
  return {
    INVALID_DURATION: messages.invalidDuration,
    OUTSIDE_BUSINESS_HOURS: messages.outsideBusinessHours,
    PAST_TIME: messages.pastSlot,
    PAUSE_CONFLICT: messages.lunchSlot,
    APPOINTMENT_CONFLICT: messages.occupiedSlot,
    BLOCK_CONFLICT: messages.occupiedSlot,
    RESOURCE_NOT_ALLOWED: messages.outsideBusinessHours,
  };
};

const rangeIso = (dayKey: string, startMinute: number, endMinute: number, timeZone: string) => ({
  startsAt: zonedTimeToUtc(dayKey, startMinute, timeZone).toISOString(),
  endsAt: zonedTimeToUtc(dayKey, endMinute, timeZone).toISOString(),
});

const temporalGuards = (blockPastSlots: boolean, now: ReturnType<typeof zonedNow>) => ({
  isDayBeforeToday: (day: string) => blockPastSlots && day < now.dateKey,
  isDayClosedForToday: () => false,
  isSlotInPast: (day: string, minute: number) =>
    blockPastSlots && (day < now.dateKey || (day === now.dateKey && minute < now.minute)),
});

const buildEngine = (
  input: AgendaLayoutInput,
  snapMinutes: number,
  blockPastSlots: boolean,
): AgendaEngineContext => {
  const timeZone = input.timeZone ?? DEFAULT_TIME_ZONE;
  const now = zonedNow(timeZone);
  const days = input.view === "week" ? weekDays(input.date, input.weekStartsOn) : [input.date];
  const hoursForDay = (day: string) =>
    getEffectiveBusinessHoursForDay({
      dayKey: day,
      businessHours: input.businessHours ?? null,
      defaultHours: input.defaultHours ?? DEFAULT_HOURS,
    });
  const selectedDayHours = hoursForDay(dateKey(input.date));
  const range = getGridBusinessHoursRange({
    days,
    selectedDayBusinessHours: selectedDayHours,
    getBusinessHoursForDay: hoursForDay,
  });
  const appointments = expandRecurringAppointments(
    input.appointments,
    timeZone,
    visibleDaysWindow(days, timeZone),
  );

  return buildAgendaEngineContext({
    resources: input.professionals,
    date: input.date,
    timeZone,
    appointmentsByDay: groupAppointmentsByDay(appointments, { excludeCanceled: true, timeZone }),
    blocksByDay: groupBlocksByDay(input.blocks ?? []),
    businessHours: {
      startMinute: range.startMinute,
      endMinute: range.endMinute,
      isClosed: selectedDayHours.isClosed,
      closedMessage: selectedDayHours.closedMessage,
    },
    getBusinessHoursForDay: hoursForDay,
    getResourceBusinessHoursForDay: (resourceId, day) => {
      const professional = input.professionals.find((item) => item.id === resourceId);
      if (!professional) return null;
      return getProfessionalBusinessHoursRange(hoursForDay(day), professional, day);
    },
    breakWindow: input.lunchBreak ?? null,
    getResourceBreakWindowForDay: (resourceId, day) => {
      const professional = input.professionals.find((item) => item.id === resourceId);
      if (!professional) return input.lunchBreak ?? null;
      return getProfessionalBreakWindowForDay({
        lunchBreak: input.lunchBreak ?? null,
        professional,
        dayKey: day,
      });
    },
    snapMinutes,
    temporalGuards: temporalGuards(blockPastSlots, now),
  });
};

const blocked = (
  emit: Emit,
  message: string | undefined,
  extra: Record<string, unknown> = {},
): void => {
  emit("blocked-event", { message: message ?? "Blocked", ...extra });
};

const emitRange = (
  state: ValidationState,
  name: "move-event" | "resize-event",
  detail: MoveChange | ResizeChange,
  endMinute: number,
): boolean => {
  try {
    return state.emit(name, {
      ...detail,
      ...rangeIso(detail.dayKey, detail.startMinute, endMinute, state.timeZone),
    });
  } catch (error) {
    blocked(state.emit, error instanceof Error ? error.message : state.messages.INVALID_DURATION, {
      code: "INVALID_WALL_CLOCK_TIME",
      id: detail.id,
    });
    return false;
  }
};

const moveAppointment = (state: ValidationState, change: MoveChange): boolean => {
  const appointment = findAppointmentEvent(state.engine, change.id);
  const mutation = appointment
    ? buildMoveMutation(appointment, {
        dayKey: change.dayKey,
        resourceId: change.professionalId,
        startMinute: change.startMinute,
        endMinute: change.startMinute + change.durationMinutes,
      })
    : null;
  const result = validateAppointmentMutation(state.engine, appointment, mutation, {
    messages: state.messages,
  });
  if (!result.ok) {
    blocked(state.emit, result.message, { code: result.code, id: change.id });
    return false;
  }
  return emitRange(state, "move-event", change, change.startMinute + change.durationMinutes);
};

const resizeAppointment = (state: ValidationState, change: ResizeChange): boolean => {
  const appointment = findAppointmentEvent(state.engine, change.id);
  const mutation = appointment
    ? change.direction === "start"
      ? buildMoveMutation(appointment, {
          dayKey: change.dayKey,
          resourceId: appointment.resourceId,
          startMinute: change.startMinute,
          endMinute: change.endMinute,
        })
      : buildResizeMutation(appointment, change.endMinute)
    : null;
  const result = validateAppointmentMutation(state.engine, appointment, mutation, {
    messages: state.messages,
  });
  if (!result.ok) {
    blocked(state.emit, result.message, { code: result.code, id: change.id });
    return false;
  }
  return emitRange(state, "resize-event", change, change.endMinute);
};

export function createValidatedInteractions(
  input: AgendaLayoutInput,
  snapMinutes: number,
  emit: Emit,
  blockPastSlots = false,
): Required<Pick<GestureCallbacks, "onMove" | "onResize">> & {
  onSelectRange: (range: RangeSelection) => void;
} {
  const timeZone = input.timeZone ?? DEFAULT_TIME_ZONE;
  const engine = buildEngine(input, snapMinutes, blockPastSlots);
  const messages = validationMessages(input);
  const state = { engine, messages, emit, timeZone };

  return {
    onMove: (change: MoveChange) => moveAppointment(state, change),
    onResize: (change: ResizeChange) => resizeAppointment(state, change),
    onSelectRange: (range: RangeSelection) => {
      const result = validateAgendaRange(
        engine,
        {
          dayKey: range.dayKey,
          resourceId: range.professionalId,
          startMinute: range.startMinute,
          endMinute: range.endMinute,
        },
        { messages },
      );
      if (result.ok) emit("select-range", range);
      else blocked(emit, result.message, { code: result.code });
    },
  };
}
