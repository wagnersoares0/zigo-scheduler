import type { Appointment, AppointmentEditForm, AppointmentServiceLink } from "../types";
import {
  getAppointmentServiceNames as readAppointmentServiceNames,
  getAppointmentServicesCount,
  getServiceName,
} from "./appointment-fields";

// ─── Phone ────────────────────────────────────────────────────────────────────

export const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// ─── Text / strings ───────────────────────────────────────────────────────────

export const normalizeNullableText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

export const getNameInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return (parts[0]?.charAt(0) ?? "?").toUpperCase();
  return `${parts[0]?.charAt(0) ?? ""}${parts[parts.length - 1]?.charAt(0) ?? ""}`.toUpperCase();
};

// ─── Duration and time labels ─────────────────────────────────────────────────

export const formatHumanDuration = (minutes: number): string => {
  const total = Math.max(0, Math.trunc(minutes || 0));
  if (total < 60) return `${total}min`;
  const hours = Math.floor(total / 60);
  const remainder = total % 60;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${String(remainder).padStart(2, "0")}min`;
};

/** @deprecated Use `formatHumanDuration`. */
export const formatDuracaoHumana = formatHumanDuration;

export const formatHorarioOptionLabel = (
  hora: string,
  disabled: boolean,
  reason: "almoco" | "expediente" | null,
): string => {
  if (!disabled || !reason) return hora;
  if (reason === "almoco") return `${hora} · lunch break`;
  return `${hora} · outside business hours`;
};

// ─── Status ───────────────────────────────────────────────────────────────────

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "canceled";

export const normalizeAppointmentStatus = (status: string): AppointmentStatus => {
  const normalized = status.trim().toLowerCase();
  if (normalized === "confirmado" || normalized === "confirmed") return "confirmed";
  if (normalized === "concluido" || normalized === "completed" || normalized === "done") return "completed";
  if (normalized === "cancelado" || normalized === "canceled" || normalized === "cancelled") return "canceled";
  return "pending";
};

/** @deprecated Use `normalizeAppointmentStatus`. */
export const normalizeStatus = (s: string): AppointmentEditForm["status"] => {
  const normalized = s.trim().toLowerCase();
  if (normalized === "confirmado" || normalized === "confirmed") return "confirmado";
  if (normalized === "concluido" || normalized === "completed" || normalized === "done") return "concluido";
  if (normalized === "cancelado" || normalized === "canceled" || normalized === "cancelled") return "cancelado";
  return "pendente";
};

export const isCanceledStatus = (status: string): boolean =>
  normalizeStatus(status) === "cancelado";

export const isCompletedStatus = (status: string): boolean =>
  normalizeStatus(status) === "concluido";

export const isLockedStatus = (status: string): boolean =>
  isCanceledStatus(status) || isCompletedStatus(status);

export const statusBadge = (s: string): string => {
  const status = normalizeStatus(s);
  return status === "confirmado" ? "bg-[#DBEAFE] text-[#1E40AF]"
    : status === "concluido" ? "bg-[#E2E8F0] text-[#334155]"
    : status === "cancelado" ? "bg-[#FEE2E2] text-[#991B1B]"
    : "bg-[#FEF3C7] text-[#92400E]";
};

// ─── Appointment services ─────────────────────────────────────────────────────

export const getAppointmentServiceLinks = (appointment: Appointment): AppointmentServiceLink[] =>
  (Array.isArray(appointment.agendamento_servicos) ? appointment.agendamento_servicos : [])
    .filter((item): item is AppointmentServiceLink => Boolean(item?.servico_id))
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

/** @deprecated Use `getAppointmentServiceLinks`. */
export const getAgendamentoServicosOrdenados = getAppointmentServiceLinks;

export const getAppointmentServiceDisplayNames = (appointment: Appointment): string[] => {
  const items = getAppointmentServiceLinks(appointment);
  if (items.length > 0) {
    return items
      .map((item) => getServiceName(item.servicos))
      .filter((nome): nome is string => Boolean(nome));
  }
  return readAppointmentServiceNames(appointment);
};

/** @deprecated Use `getAppointmentServiceDisplayNames`. */
export const getAgendamentoServicoNomes = getAppointmentServiceDisplayNames;

export const getAppointmentServiceLabel = (appointment: Appointment, compact = false): string => {
  const names = getAppointmentServiceDisplayNames(appointment);
  if (!names.length) return "Service";
  const serviceCount = getAppointmentServicesCount(appointment, names.length);
  if (compact && serviceCount > 1) return `${names[0]} +${serviceCount - 1}`;
  return names.join(" + ");
};

/** @deprecated Use `getAppointmentServiceLabel`. */
export const getAgendamentoServicoLabel = getAppointmentServiceLabel;
