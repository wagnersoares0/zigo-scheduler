import type { Appointment } from "../types";

// ─── Money input ──────────────────────────────────────────────────────────────

export const parseMoneyInput = (value: string): number | null => {
  const raw = value.trim().replace(/[^\d,.-]/g, "");
  if (!raw) return null;
  let normalized = raw;
  if (raw.includes(",") && raw.includes(".")) {
    const decimal = raw.lastIndexOf(",") > raw.lastIndexOf(".") ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = raw.replaceAll(thousands, "").replace(decimal, ".");
  } else if (raw.includes(",")) {
    const [, decimals = ""] = raw.split(",");
    normalized = decimals.length === 3 ? raw.replaceAll(",", "") : raw.replace(",", ".");
  } else if (raw.includes(".")) {
    const [, decimals = ""] = raw.split(".");
    normalized = decimals.length === 3 ? raw.replaceAll(".", "") : raw;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

// ─── Advance payment ──────────────────────────────────────────────────────────

const normalizeAdvancePaymentStatus = (value: string | null | undefined): string =>
  (value ?? "").trim().toLowerCase();

export const getAdvancePaymentAmount = (appointment: Appointment | null, appointmentTotal: number): number => {
  if (!appointment) return 0;
  if (normalizeAdvancePaymentStatus(appointment.advancePaymentStatus ?? appointment.adiantamento_status) !== "pago") return 0;
  const amount = Number(appointment.advancePaymentAmount ?? appointment.adiantamento_valor_snapshot ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.min(appointmentTotal, Math.max(0, Number(amount.toFixed(2))));
};

/** @deprecated Use `getAdvancePaymentAmount`. */
export const getAdiantamentoPago = getAdvancePaymentAmount;

export const getAppointmentPaymentSummary = (
  appointment: Appointment | null,
  appointmentTotal: number,
): {
  total: number;
  prepaidAmount: number;
  remainingAtAppointment: number;
  hasPaidAdvance: boolean;
  /** @deprecated Use `prepaidAmount`. */
  pagoAntecipadamente: number;
  /** @deprecated Use `remainingAtAppointment`. */
  restanteNoAtendimento: number;
  /** @deprecated Use `hasPaidAdvance`. */
  possuiAdiantamentoPago: boolean;
} => {
  const total = Math.max(0, Number(appointmentTotal.toFixed(2)));
  const prepaidAmount = getAdvancePaymentAmount(appointment, total);
  const remainingAtAppointment = Math.max(0, Number((total - prepaidAmount).toFixed(2)));
  return {
    total,
    prepaidAmount,
    remainingAtAppointment,
    hasPaidAdvance: prepaidAmount > 0,
    pagoAntecipadamente: prepaidAmount,
    restanteNoAtendimento: remainingAtAppointment,
    possuiAdiantamentoPago: prepaidAmount > 0,
  };
};

/** @deprecated Use `getAppointmentPaymentSummary`. */
export const getResumoFinanceiroAgendamento = getAppointmentPaymentSummary;

export const getAdvancePaymentStatusLabel = (value: string | null | undefined): string => {
  const normalized = normalizeAdvancePaymentStatus(value);
  if (!normalized)                    return "Not provided";
  if (normalized === "pago" || normalized === "paid") return "Paid";
  if (normalized === "pendente" || normalized === "pending") return "Pending";
  if (normalized === "cancelado" || normalized === "canceled") return "Canceled";
  if (normalized === "isento" || normalized === "waived") return "Waived";
  if (normalized === "nao_aplicavel" || normalized === "not_applicable") return "Not applicable";
  return normalized.replace(/_/g, " ");
};

/** @deprecated Use `getAdvancePaymentStatusLabel`. */
export const getAdiantamentoStatusLabel = getAdvancePaymentStatusLabel;
