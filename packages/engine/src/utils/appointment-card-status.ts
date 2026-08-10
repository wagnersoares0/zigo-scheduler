import type { Appointment } from "../types";
import { getAppointmentPaymentStatus } from "./appointment-fields";
import { normalizeStatus } from "./format";
import { zoneNowParts } from "./time";
import { DEFAULT_TIME_ZONE, type TimeZone } from "@zigoschedule/scheduler-core";

export type AgendaAppointmentCardStatus = "paid" | "overdue" | null;

type ZonedNow = {
  dayKey: string;
  minute: number;
};

export function getAgendaAppointmentCardStatus({
  appointment,
  dayKey,
  endMinute,
  timeZone = DEFAULT_TIME_ZONE,
  now = zoneNowParts(timeZone),
}: {
  appointment: Pick<Appointment, "status" | "paymentStatus" | "pagamento_status">;
  dayKey: string;
  endMinute: number;
  timeZone?: TimeZone;
  now?: ZonedNow;
}): AgendaAppointmentCardStatus {
  const status = normalizeStatus(appointment.status);
  if (status === "cancelado") return null;

  const paymentStatus = getAppointmentPaymentStatus(appointment)?.trim().toLowerCase();
  if (
    paymentStatus === "pago" ||
    paymentStatus === "paid" ||
    paymentStatus === "confirmado" ||
    paymentStatus === "confirmed"
  ) {
    return "paid";
  }

  const hasEnded = dayKey < now.dayKey || (dayKey === now.dayKey && endMinute < now.minute);
  if (hasEnded && (status === "confirmado" || status === "concluido")) return "overdue";

  return null;
}
