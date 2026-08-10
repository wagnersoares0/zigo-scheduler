import {
  DEFAULT_TIME_ZONE,
  getAgendaMessages,
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
type Emit = (name: string, detail: unknown) => void;

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

const buildEngine = (input: AgendaLayoutInput, snapMinutes: number): AgendaEngineContext => {
  const timeZone = input.timeZone ?? DEFAULT_TIME_ZONE;
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
    temporalGuards: {
      isDayBeforeToday: () => false,
      isDayClosedForToday: () => false,
      isSlotInPast: () => false,
    },
  });
};

const blocked = (
  emit: Emit,
  message: string,
  extra: Record<string, unknown> = {},
): void => emit("blocked-event", { message, ...extra });

export function createValidatedInteractions(
  input: AgendaLayoutInput,
  snapMinutes: number,
  emit: Emit,
): Required<Pick<GestureCallbacks, "onMove" | "onResize">> & {
  onSelectRange: (range: RangeSelection) => void;
} {
  const engine = buildEngine(input, snapMinutes);
  const messages = validationMessages(input);

  return {
    onMove: (change: MoveChange) => {
      const appointment = findAppointmentEvent(engine, change.id);
      const mutation = appointment
        ? buildMoveMutation(appointment, {
            dayKey: change.dayKey,
            resourceId: change.professionalId,
            startMinute: change.startMinute,
            endMinute: change.startMinute + change.durationMinutes,
          })
        : null;
      const result = validateAppointmentMutation(engine, appointment, mutation, { messages });
      if (result.ok) emit("move-event", change);
      else blocked(emit, result.message, { code: result.code, id: change.id });
    },
    onResize: (change: ResizeChange) => {
      const appointment = findAppointmentEvent(engine, change.id);
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
      const result = validateAppointmentMutation(engine, appointment, mutation, { messages });
      if (result.ok) emit("resize-event", change);
      else blocked(emit, result.message, { code: result.code, id: change.id });
    },
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
