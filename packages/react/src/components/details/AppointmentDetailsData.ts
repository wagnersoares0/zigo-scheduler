import {
  formatAgendaCurrency,
  formatAgendaDuration,
  formatAgendaTimeRange,
  getAgendaStatusLabel,
  zonedDateKey,
  zonedMinutesOfDay,
  type AgendaMessages,
  type TimeZone,
} from "@zigoschedule/scheduler-core";
import {
  getAppointmentClientName,
  getAppointmentClientPhone,
  getAppointmentDurationMinutes,
  getAppointmentNotes,
  getAppointmentPaymentStatus,
  getAppointmentPrice,
  getAppointmentProfessionalId,
  getAppointmentServiceLabel,
  getAppointmentStartsAt,
  getProfessionalName,
  type Appointment,
  type Professional,
} from "@zigoschedule/scheduler-engine";

export type DetailsTone = "ok" | "warn" | "bad";

export type AppointmentDetailsViewData = {
  appointment: Appointment;
  clientName: string;
  phone: string | null;
  serviceName: string;
  professionalName: string;
  notes: string | null;
  price: number | null;
  priceLabel: string | null;
  paid: boolean;
  statusLabel: string;
  statusTone: DetailsTone;
  timeRange: string;
  dateLabel: string;
  durationLabel: string;
  reference: string;
};

const STATUS_TONE: Record<string, DetailsTone> = {
  confirmado: "ok",
  confirmed: "ok",
  concluido: "ok",
  completed: "ok",
  done: "ok",
  pendente: "warn",
  pending: "warn",
  cancelado: "bad",
  canceled: "bad",
  cancelled: "bad",
};

const isPaidStatus = (status: string | null): boolean => {
  const normalized = status?.trim().toLowerCase();
  return normalized === "paid" || normalized === "pago" || normalized === "confirmed" || normalized === "confirmado";
};

const reference = (id: string): string => {
  const clean = id.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return (clean || id.toUpperCase()).slice(-6).padStart(4, "0");
};

const longDate = (dayKey: string, locale?: string): string => {
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!year || !month || !day) return dayKey;
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export function readAppointmentDetails({
  appointment,
  professionals,
  timeZone,
  locale,
  messages,
}: {
  appointment: Appointment;
  professionals: Professional[];
  timeZone: TimeZone;
  locale?: string;
  messages: AgendaMessages;
}): AppointmentDetailsViewData {
  const startsAt = getAppointmentStartsAt(appointment);
  const startMinute = startsAt ? zonedMinutesOfDay(startsAt, timeZone) : 0;
  const durationMinutes = getAppointmentDurationMinutes(appointment, 0);
  const dayKey = startsAt ? zonedDateKey(startsAt, timeZone) : "";
  const professionalId = getAppointmentProfessionalId(appointment);
  const professional = professionals.find((item) => item.id === professionalId);
  const statusKey = appointment.status.trim().toLowerCase();
  const price = getAppointmentPrice(appointment);

  return {
    appointment,
    clientName: getAppointmentClientName(appointment) || messages.appointment,
    phone: getAppointmentClientPhone(appointment),
    serviceName: getAppointmentServiceLabel(appointment) || messages.details.service,
    professionalName: getProfessionalName(professional),
    notes: getAppointmentNotes(appointment),
    price,
    priceLabel: price === null ? null : formatAgendaCurrency(price, locale),
    paid: isPaidStatus(getAppointmentPaymentStatus(appointment)),
    statusLabel: getAgendaStatusLabel(appointment.status, messages),
    statusTone: STATUS_TONE[statusKey] ?? "ok",
    timeRange: formatAgendaTimeRange(startMinute, startMinute + durationMinutes, locale),
    dateLabel: dayKey ? longDate(dayKey, locale) : startsAt,
    durationLabel: formatAgendaDuration(durationMinutes, locale),
    reference: reference(appointment.id),
  };
}
