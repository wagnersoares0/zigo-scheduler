import type { Appointment, Professional } from "../types";
import {
  getAppointmentClientName,
  getAppointmentDurationMinutes,
  getAppointmentProfessionalId,
  getAppointmentStartsAt,
  getProfessionalName,
} from "./appointment-fields";
import { getAppointmentServiceLabel, normalizeStatus } from "./format";
import { first, fromDayKey, toHHMM, zoneKey, zoneMins } from "./time";
import { DEFAULT_AGENDA_LOCALE, DEFAULT_TIME_ZONE, type TimeZone } from "@zigoschedule/scheduler-core";

export type CheckoutPendingAgendaItem = {
  id: string;
  ag: Appointment;
  dayKey: string;
  start: number;
  end: number;
  sortKey: string;
  clientName: string;
  serviceName: string;
  professionalName: string;
  timeLabel: string;
  dayLabel: string;
};

export function getCheckoutPendingScopeLabel(view: string): string {
  if (view === "day") return "today";
  if (view === "week") return "this week";
  if (view === "month") return "this month";
  return "this period";
}

export function formatCheckoutPendingDayLabel(dayKey: string, locale: string = DEFAULT_AGENDA_LOCALE): string {
  return fromDayKey(dayKey)
    .toLocaleDateString(locale, { weekday: "short", day: "2-digit", month: "2-digit" })
    .replace(".", "");
}

export function buildCheckoutPendingAppointments({
  appointments,
  agendaProfessionals,
  professionals,
  agendaProfissionais,
  profissionais,
  visibleProfIds,
  rangeStart,
  rangeEnd,
  nowDayKey,
  nowMinute,
  timeZone = DEFAULT_TIME_ZONE,
  locale = DEFAULT_AGENDA_LOCALE,
}: {
  appointments: Appointment[];
  agendaProfessionals?: Professional[];
  professionals?: Professional[];
  /** @deprecated Use `agendaProfessionals`. */
  agendaProfissionais?: Professional[];
  /** @deprecated Use `professionals`. */
  profissionais?: Professional[];
  visibleProfIds: string[];
  rangeStart: string;
  rangeEnd: string;
  nowDayKey: string;
  nowMinute: number;
  timeZone?: TimeZone;
  locale?: string;
}): CheckoutPendingAgendaItem[] {
  const visibleSet = visibleProfIds.length ? new Set(visibleProfIds) : null;
  const schedulerProfessionals = agendaProfessionals ?? agendaProfissionais ?? [];
  const allProfessionals = professionals ?? profissionais ?? [];

  return appointments
    .filter((ag) => {
      const status = normalizeStatus(ag.status);
      if (status === "concluido" || status === "cancelado") return false;

      const profId = getAppointmentProfessionalId(ag);
      if (visibleSet && profId && !visibleSet.has(profId)) return false;

      const startsAt = getAppointmentStartsAt(ag);
      const dayKey = zoneKey(startsAt, timeZone);
      if (dayKey < rangeStart || dayKey > rangeEnd) return false;

      const start = zoneMins(startsAt, timeZone);
      const duration = Math.max(0, getAppointmentDurationMinutes(ag, 0));
      const end = start + duration;
      if (end <= start) return false;
      if (dayKey < nowDayKey) return true;
      if (dayKey > nowDayKey) return false;
      return end < nowMinute;
    })
    .map((ag) => {
      const startsAt = getAppointmentStartsAt(ag);
      const professionalId = getAppointmentProfessionalId(ag);
      const dayKey = zoneKey(startsAt, timeZone);
      const start = zoneMins(startsAt, timeZone);
      const end = start + Math.max(0, getAppointmentDurationMinutes(ag, 0));
      const professionalName =
        getProfessionalName(first(ag.profissionais) as Professional | null | undefined) ||
        getProfessionalName(schedulerProfessionals.find((prof) => prof.id === professionalId)) ||
        getProfessionalName(allProfessionals.find((prof) => prof.id === professionalId)) ||
        "Professional";

      return {
        id: ag.id,
        ag,
        dayKey,
        start,
        end,
        sortKey: `${dayKey}-${String(start).padStart(4, "0")}-${ag.id}`,
        clientName: getAppointmentClientName(ag) || "Unnamed client",
        serviceName: getAppointmentServiceLabel(ag),
        professionalName,
        timeLabel: `${toHHMM(start)} - ${toHHMM(end)}`,
        dayLabel: formatCheckoutPendingDayLabel(dayKey, locale),
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
