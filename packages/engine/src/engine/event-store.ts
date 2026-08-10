import { GRID_MIN } from "../constants";
import type { Appointment, Block, Professional } from "../types";
import { dateKey, normalizeHHMM, toMin } from "../utils/time";
import { DEFAULT_TIME_ZONE, splitZonedRangeByDay, type TimeZone } from "@zigoschedule/scheduler-core";
import {
  getAppointmentBufferAfterMinutes,
  getAppointmentBufferBeforeMinutes,
  getAppointmentDurationMinutes,
  getAppointmentProfessionalId,
  getAppointmentStartsAt,
  getBlockDate,
  getBlockEndTime,
  getBlockProfessionalId,
  getBlockStartTime,
  getProfessionalClosesAt,
  getProfessionalName,
  getProfessionalOpensAt,
  hasValidAppointmentTiming,
  normalizeAppointment,
  normalizeBlock,
  normalizeProfessional,
} from "../utils/appointment-fields";
import type {
  AgendaAppointmentEvent,
  AgendaBlockEvent,
  AgendaEngineContext,
  AgendaEngineInput,
  AgendaResource,
} from "./types";

const toResourceId = (value: string | null | undefined): string | null => value || null;

const getResourceBusinessHours = (resource: Professional): AgendaResource["businessHours"] => {
  const opensAt = normalizeHHMM(getProfessionalOpensAt(resource));
  const closesAt = normalizeHHMM(getProfessionalClosesAt(resource));
  if (!opensAt || !closesAt) return undefined;

  const startMinute = toMin(opensAt);
  const endMinute = toMin(closesAt);
  if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute) || endMinute <= startMinute) {
    return undefined;
  }

  return { startMinute, endMinute };
};

export const buildAgendaResources = (resources: Professional[], fallbackDate: Date): AgendaResource[] => {
  if (resources.length) {
    return resources.map((resource) => {
      const normalized = normalizeProfessional(resource);
      const name = getProfessionalName(normalized);
      return {
        id: normalized.id,
        name,
        nome: name,
        title: name,
        businessHours: getResourceBusinessHours(normalized),
      };
    });
  }

  const fallbackTitle = dateKey(fallbackDate);
  return [{
    id: null,
    name: fallbackTitle,
    nome: fallbackTitle,
    title: fallbackTitle,
  }];
};

export const toAppointmentEvent = (
  ag: Appointment,
  timeZone: TimeZone = DEFAULT_TIME_ZONE,
): AgendaAppointmentEvent | undefined => toAppointmentEvents(ag, timeZone)[0];

export const toAppointmentEvents = (
  ag: Appointment,
  timeZone: TimeZone = DEFAULT_TIME_ZONE,
): AgendaAppointmentEvent[] => {
  const normalized = normalizeAppointment(ag);
  const startsAt = getAppointmentStartsAt(normalized);
  const durationMinutes = Math.max(GRID_MIN, getAppointmentDurationMinutes(normalized, GRID_MIN));
  const bufferBeforeMinutes = getAppointmentBufferBeforeMinutes(normalized);
  const bufferAfterMinutes = getAppointmentBufferAfterMinutes(normalized);
  const busyStartsAt = new Date(new Date(startsAt).getTime() - bufferBeforeMinutes * 60_000);
  const busyByDay = new Map(
    splitZonedRangeByDay(
      busyStartsAt,
      durationMinutes + bufferBeforeMinutes + bufferAfterMinutes,
      timeZone,
    ).map((segment) => [segment.dayKey, segment])
  );

  return splitZonedRangeByDay(startsAt, durationMinutes, timeZone).map((segment) => ({
    kind: "appointment",
    id: normalized.id,
    dayKey: segment.dayKey,
    resourceId: toResourceId(getAppointmentProfessionalId(normalized)),
    startMinute: segment.startMinute,
    endMinute: segment.endMinute,
    bufferStartMinute: busyByDay.get(segment.dayKey)?.startMinute ?? segment.startMinute,
    bufferEndMinute: busyByDay.get(segment.dayKey)?.endMinute ?? segment.endMinute,
    status: normalized.status,
    appointment: normalized,
    ag: normalized,
  }));
};

export const toBlockEvent = (bloq: Block): AgendaBlockEvent => {
  const normalized = normalizeBlock(bloq);
  return {
    kind: "block",
    id: normalized.id,
    dayKey: getBlockDate(normalized),
    resourceId: toResourceId(getBlockProfessionalId(normalized)),
    startMinute: toMin(getBlockStartTime(normalized)),
    endMinute: toMin(getBlockEndTime(normalized)),
    block: normalized,
    bloq: normalized,
  };
};

export const mapAppointmentsByDay = (
  appointmentsByDay: Map<string, Appointment[]>,
  timeZone: TimeZone = DEFAULT_TIME_ZONE,
): Map<string, AgendaAppointmentEvent[]> => {
  const mapped = new Map<string, AgendaAppointmentEvent[]>();

  appointmentsByDay.forEach((appointments) => {
    appointments.filter(hasValidAppointmentTiming).forEach((ag) => {
      for (const event of toAppointmentEvents(ag, timeZone)) {
        const list = mapped.get(event.dayKey);
        if (list) list.push(event);
        else mapped.set(event.dayKey, [event]);
      }
    });
  });

  return mapped;
};

export const mapBlocksByDay = (blocksByDay: Map<string, Block[]>): Map<string, AgendaBlockEvent[]> => {
  const mapped = new Map<string, AgendaBlockEvent[]>();

  blocksByDay.forEach((blocks, dayKey) => {
    mapped.set(dayKey, blocks.map(toBlockEvent));
  });

  return mapped;
};

export const buildAgendaEngineContext = (input: AgendaEngineInput): AgendaEngineContext => ({
  resources: buildAgendaResources(input.resources, input.date),
  appointmentsByDay: mapAppointmentsByDay(input.appointmentsByDay, input.timeZone),
  blocksByDay: mapBlocksByDay(input.blocksByDay),
  businessHours: input.businessHours,
  getBusinessHoursForDay: input.getBusinessHoursForDay,
  getResourceBusinessHoursForDay: input.getResourceBusinessHoursForDay,
  getResourceBreakWindowForDay: input.getResourceBreakWindowForDay ?? input.getResourcePausaIntervaloForDay,
  breakWindow: input.breakWindow ?? input.pausaIntervalo ?? null,
  getResourcePausaIntervaloForDay: input.getResourcePausaIntervaloForDay,
  pausaIntervalo: input.pausaIntervalo,
  snapMinutes: input.snapMinutes,
  temporalGuards: input.temporalGuards,
});

export const findAppointmentEvent = (
  context: AgendaEngineContext,
  appointmentId: string,
): AgendaAppointmentEvent | null => {
  let found: AgendaAppointmentEvent | null = null;

  context.appointmentsByDay.forEach((appointments) => {
    if (found) return;
    found = appointments.find((appointment) => appointment.id === appointmentId) ?? null;
  });

  return found;
};
