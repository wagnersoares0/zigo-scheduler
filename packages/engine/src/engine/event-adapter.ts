import { GRID_MIN } from "../constants";
import type { Appointment, Block } from "../types";
import { dateKey, fromDayKey, toMin, zoneKey, zoneMins } from "../utils/time";
import {
  DEFAULT_TIME_ZONE,
  zonedTimeToUtc,
  type TimeZone,
} from "@zigoschedule/scheduler-core";
import { getAppointmentServiceLabel, isLockedStatus } from "../utils/format";
import {
  getAppointmentClientName,
  getAppointmentDurationMinutes,
  getAppointmentProfessionalId,
  getAppointmentStartsAt,
  getBlockDate,
  getBlockEndTime,
  getBlockProfessionalId,
  getBlockReason,
  getBlockStartTime,
  normalizeAppointment,
  normalizeBlock,
} from "../utils/appointment-fields";

export type AgendaEventKind = "appointment" | "block";
export type AgendaEventSourceId = "appointments" | "blocks";
export type LegacyAgendaEventSourceId = AgendaEventSourceId | "agendamentos" | "bloqueios";
export type AgendaEventDisplay = "auto" | "block" | "background";

export type AgendaEventInput = {
  id: string;
  sourceId: AgendaEventSourceId;
  kind: AgendaEventKind;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  resourceId: string | null;
  display: AgendaEventDisplay;
  editable: boolean;
  startEditable: boolean;
  durationEditable: boolean;
  overlap: boolean;
  extendedProps: {
    dayKey: string;
    startMinute: number;
    endMinute: number;
    status?: string;
    schedulerScoped: true;
    /** @deprecated Use `schedulerScoped`. */
    tenantScoped?: true;
    raw: Appointment | Block;
  };
};

export type AgendaEventAdapterInput = {
  appointments: Appointment[];
  blocks: Block[];
};

export const normalizeAgendaResourceId = (value: string | null | undefined): string | null => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : null;
};

export const toAgendaEventSourceId = (sourceId: LegacyAgendaEventSourceId): AgendaEventSourceId => {
  if (sourceId === "agendamentos") return "appointments";
  if (sourceId === "bloqueios") return "blocks";
  return sourceId;
};

/**
 * Builds the UTC instant for a wall-clock slot in the calendar's time zone.
 *
 * `minute` may exceed a day (an appointment running past midnight) or be
 * negative; the calendar day is shifted first, then converted using the zone.
 */
export const buildAgendaLocalIso = (
  dayKey: string,
  minute: number,
  timeZone: TimeZone = DEFAULT_TIME_ZONE,
): string => {
  const day = fromDayKey(dayKey);
  const dayOffset = Math.floor(minute / (24 * 60));
  const normalizedMinute = ((minute % (24 * 60)) + (24 * 60)) % (24 * 60);

  day.setDate(day.getDate() + dayOffset);
  return zonedTimeToUtc(dateKey(day), normalizedMinute, timeZone).toISOString();
};

export const isAppointmentEditable = (appointment: Pick<Appointment, "status">): boolean =>
  !isLockedStatus(appointment.status);

export const getAppointmentTitle = (appointment: Appointment): string => {
  const serviceLabel = getAppointmentServiceLabel(appointment, true);
  const clientName = getAppointmentClientName(appointment) || "Appointment";
  return serviceLabel
    ? `${clientName} - ${serviceLabel}`
    : clientName;
};

export const appointmentToAgendaEventInput = (
  appointment: Appointment,
  timeZone: TimeZone = DEFAULT_TIME_ZONE,
): AgendaEventInput => {
  const normalized = normalizeAppointment(appointment);
  const startsAt = getAppointmentStartsAt(normalized);
  const dayKey = zoneKey(startsAt, timeZone);
  const startMinute = zoneMins(startsAt, timeZone);
  const durationMinutes = Math.max(GRID_MIN, getAppointmentDurationMinutes(normalized, GRID_MIN));
  const endMinute = startMinute + durationMinutes;
  const editable = isAppointmentEditable(normalized);

  return {
    id: normalized.id,
    sourceId: "appointments",
    kind: "appointment",
    title: getAppointmentTitle(normalized),
    start: startsAt,
    end: buildAgendaLocalIso(dayKey, endMinute, timeZone),
    allDay: false,
    resourceId: normalizeAgendaResourceId(getAppointmentProfessionalId(normalized)),
    display: "auto",
    editable,
    startEditable: editable,
    durationEditable: editable,
    overlap: false,
    extendedProps: {
      dayKey,
      startMinute,
      endMinute,
      status: normalized.status,
      schedulerScoped: true,
      tenantScoped: true,
      raw: normalized,
    },
  };
};

export const getBlockTitle = (block: Block): string => {
  const reason = getBlockReason(block);
  if (reason) return reason;
  return "Blocked time";
};

export const blockToAgendaEventInput = (
  block: Block,
  timeZone: TimeZone = DEFAULT_TIME_ZONE,
): AgendaEventInput => {
  const normalized = normalizeBlock(block);
  const blockDate = getBlockDate(normalized);
  const startMinute = toMin(getBlockStartTime(normalized));
  const endMinute = toMin(getBlockEndTime(normalized));

  return {
    id: normalized.id,
    sourceId: "blocks",
    kind: "block",
    title: getBlockTitle(normalized),
    start: buildAgendaLocalIso(blockDate, startMinute, timeZone),
    end: buildAgendaLocalIso(blockDate, endMinute, timeZone),
    allDay: false,
    resourceId: normalizeAgendaResourceId(getBlockProfessionalId(normalized)),
    display: "block",
    editable: false,
    startEditable: false,
    durationEditable: false,
    overlap: false,
    extendedProps: {
      dayKey: blockDate,
      startMinute,
      endMinute,
      schedulerScoped: true,
      tenantScoped: true,
      raw: normalized,
    },
  };
};

export const adaptAgendaEvents = (
  { appointments, blocks }: AgendaEventAdapterInput,
  timeZone: TimeZone = DEFAULT_TIME_ZONE,
): AgendaEventInput[] =>
  [
    // Keep the arrow explicit: passing the function directly to `map` would send
    // the array index as the second argument, which is the time zone here.
    ...appointments.map((appointment) => appointmentToAgendaEventInput(appointment, timeZone)),
    ...blocks.map((block) => blockToAgendaEventInput(block, timeZone)),
  ].sort((a, b) => (
    a.extendedProps.dayKey === b.extendedProps.dayKey
      ? a.extendedProps.startMinute - b.extendedProps.startMinute
      : a.extendedProps.dayKey.localeCompare(b.extendedProps.dayKey)
  ));

export const splitAgendaEventsByKind = (events: AgendaEventInput[]) => ({
  appointments: events.filter((event) => event.kind === "appointment"),
  blocks: events.filter((event) => event.kind === "block"),
});
