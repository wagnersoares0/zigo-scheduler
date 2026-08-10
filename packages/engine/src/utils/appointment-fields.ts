import type {
  Appointment,
  AppointmentServiceLink,
  Block,
  Professional,
  ProfessionalDaySchedule,
  Service,
} from "../types";
import { first, isValidHHMM, toMin } from "./time";

type MaybeText = string | null | undefined;
type ServiceLike = {
  name?: string | null;
  nome?: string | null;
  durationMinutes?: number | null;
  duracao_minutos?: number | null;
  price?: number | null;
  preco?: number | null;
};

const text = (value: MaybeText): string | null => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : null;
};

const numberValue = (value: number | null | undefined): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const numberLike = (value: string | number | null | undefined): number | null => {
  const normalized = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(normalized) ? normalized : null;
};

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function getProfessionalName(professional: Professional | null | undefined): string {
  return text(professional?.name) ?? text(professional?.nome) ?? "";
}

export function getProfessionalPhotoUrl(professional: Professional | null | undefined): string | null {
  return text(professional?.photoUrl) ?? text(professional?.foto_url);
}

export function getProfessionalOpensAt(professional: Professional | null | undefined): string | null {
  return text(professional?.opensAt) ?? text(professional?.horario_abertura);
}

export function getProfessionalClosesAt(professional: Professional | null | undefined): string | null {
  return text(professional?.closesAt) ?? text(professional?.horario_fechamento);
}

export function normalizeProfessionalDaySchedule(schedule: ProfessionalDaySchedule): ProfessionalDaySchedule {
  return {
    ...schedule,
    dayOfWeek: numberLike(schedule.dayOfWeek ?? schedule.dia_semana) ?? schedule.dayOfWeek,
    startTime: text(schedule.startTime) ?? text(schedule.hora_inicio) ?? undefined,
    endTime: text(schedule.endTime) ?? text(schedule.hora_fim) ?? undefined,
    active: schedule.active ?? schedule.ativo,
    hasBreak: schedule.hasBreak ?? schedule.tem_pausa,
    breakStartsAt: text(schedule.breakStartsAt) ?? text(schedule.pausa_inicio) ?? undefined,
    breakEndsAt: text(schedule.breakEndsAt) ?? text(schedule.pausa_fim) ?? undefined,
  };
}

export function normalizeProfessional(professional: Professional): Professional {
  const schedule = professional.schedule ?? professional.horarios_profissional;
  return {
    ...professional,
    name: getProfessionalName(professional) || undefined,
    photoUrl: getProfessionalPhotoUrl(professional),
    opensAt: getProfessionalOpensAt(professional),
    closesAt: getProfessionalClosesAt(professional),
    schedule: Array.isArray(schedule) ? schedule.map(normalizeProfessionalDaySchedule) : undefined,
  };
}

export function getServiceName(service: Service | AppointmentServiceLink["servicos"] | ServiceLike | null | undefined): string {
  return text(service?.name) ?? text(service?.nome) ?? "";
}

export function getServiceDurationMinutes(service: Service | null | undefined): number | null {
  return numberValue(service?.durationMinutes) ?? numberValue(service?.duracao_minutos);
}

export function getServicePrice(service: Service | null | undefined): number | null {
  return numberValue(service?.price) ?? numberValue(service?.preco);
}

export function getAppointmentStartsAt(appointment: Appointment): string {
  return text(appointment.startsAt) ?? text(appointment.data_hora) ?? "";
}

export function getAppointmentDurationMinutes(appointment: Appointment, fallback = 30): number {
  return numberValue(appointment.durationMinutes) ?? numberValue(appointment.duracao_minutos) ?? fallback;
}

export function hasValidAppointmentTiming(appointment: Appointment): boolean {
  const startsAt = getAppointmentStartsAt(appointment);
  return Boolean(startsAt) &&
    Number.isFinite(new Date(startsAt).getTime()) &&
    getAppointmentDurationMinutes(appointment, 0) > 0;
}

const minutesOrZero = (value: number | null): number =>
  value === null ? 0 : Math.max(0, Math.trunc(value));

export function getAppointmentBufferBeforeMinutes(appointment: Appointment): number {
  return minutesOrZero(numberValue(appointment.bufferBeforeMinutes) ?? numberValue(appointment.buffer_antes_minutos));
}

export function getAppointmentBufferAfterMinutes(appointment: Appointment): number {
  return minutesOrZero(numberValue(appointment.bufferAfterMinutes) ?? numberValue(appointment.buffer_depois_minutos));
}

export function getAppointmentClientName(appointment: Appointment): string {
  return text(appointment.clientName) ?? text(appointment.cliente_nome) ?? "";
}

export function getAppointmentClientPhone(appointment: Appointment | null | undefined): string | null {
  return text(appointment?.clientPhone) ?? text(appointment?.cliente_telefone);
}

export function getAppointmentProfessionalId(appointment: Appointment): string | null {
  return text(appointment.professionalId) ?? text(appointment.profissional_id);
}

export function getAppointmentColor(appointment: Appointment): string | null {
  return text(appointment.appointmentColor) ?? text(appointment.cor_agendamento);
}

export function getAppointmentColorIsCustom(appointment: Appointment): boolean {
  return Boolean(appointment.appointmentColorIsCustom ?? appointment.cor_agendamento_personalizada);
}

export function getAppointmentPaymentStatus(
  appointment: Pick<Appointment, "paymentStatus" | "pagamento_status"> | null | undefined,
): string | null {
  return text(appointment?.paymentStatus) ?? text(appointment?.pagamento_status);
}

export function getAppointmentPrice(appointment: Appointment | null | undefined): number | null {
  return numberValue(appointment?.price) ?? numberValue(appointment?.preco);
}

export function getAppointmentNotes(appointment: Appointment | null | undefined): string | null {
  return text(appointment?.notes) ?? text(appointment?.notas);
}

export function getAppointmentRecurrenceRule(appointment: Appointment): string | null {
  return text(appointment.recurrence) ?? text(appointment.recorrencia);
}

export function getAppointmentRecurrenceExceptions(appointment: Appointment): string[] {
  const raw = appointment.recurrenceExceptions ?? appointment.recorrencia_excecoes;
  return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === "string") : [];
}

export function getAppointmentRecurrenceOverrides(appointment: Appointment): NonNullable<Appointment["recurrenceOverrides"]> {
  const raw = appointment.recurrenceOverrides ?? appointment.recorrencia_alteracoes;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw;
}

export function normalizeAppointment(appointment: Appointment): Appointment {
  const startsAt = getAppointmentStartsAt(appointment);
  const durationMinutes = numberValue(appointment.durationMinutes) ?? numberValue(appointment.duracao_minutos);
  const bufferBeforeMinutes = numberValue(appointment.bufferBeforeMinutes) ?? numberValue(appointment.buffer_antes_minutos);
  const bufferAfterMinutes = numberValue(appointment.bufferAfterMinutes) ?? numberValue(appointment.buffer_depois_minutos);
  return {
    ...appointment,
    startsAt: startsAt || undefined,
    durationMinutes: durationMinutes ?? undefined,
    bufferBeforeMinutes: bufferBeforeMinutes ?? undefined,
    bufferAfterMinutes: bufferAfterMinutes ?? undefined,
    clientName: getAppointmentClientName(appointment) || undefined,
    clientPhone: getAppointmentClientPhone(appointment),
    professionalId: getAppointmentProfessionalId(appointment),
    appointmentColor: getAppointmentColor(appointment),
    appointmentColorIsCustom: getAppointmentColorIsCustom(appointment),
    paymentStatus: getAppointmentPaymentStatus(appointment),
    price: getAppointmentPrice(appointment),
    notes: getAppointmentNotes(appointment),
    servicesCount: numberValue(appointment.servicesCount) ?? numberValue(appointment.servicos_count) ?? undefined,
    recurrence: getAppointmentRecurrenceRule(appointment),
    recurrenceExceptions: getAppointmentRecurrenceExceptions(appointment),
    recurrenceOverrides: getAppointmentRecurrenceOverrides(appointment),
  };
}

export function getAppointmentServiceNames(appointment: Appointment): string[] {
  const linkedServices = Array.isArray(appointment.agendamento_servicos) ? appointment.agendamento_servicos : [];
  if (linkedServices.length > 0) {
    return linkedServices
      .map((item) => getServiceName(item.servicos))
      .filter(Boolean);
  }

  const publicService = first(appointment.services);
  const legacyService = first(appointment.servicos);
  const name = getServiceName(publicService ?? legacyService ?? null);
  return name ? [name] : [];
}

export function getAppointmentServicesCount(appointment: Appointment, fallbackCount: number): number {
  const count = numberValue(appointment.servicesCount) ?? numberValue(appointment.servicos_count);
  return count === null ? fallbackCount : Math.max(0, Math.trunc(count));
}

export function getBlockDate(block: Block): string {
  return text(block.date) ?? text(block.data) ?? "";
}

export function getBlockStartTime(block: Block): string {
  return text(block.startTime) ?? text(block.hora_inicio) ?? "00:00";
}

export function getBlockEndTime(block: Block): string {
  return text(block.endTime) ?? text(block.hora_fim) ?? "00:00";
}

export function hasValidBlockTiming(block: Block): boolean {
  const date = getBlockDate(block);
  const startTime = getBlockStartTime(block);
  const endTime = getBlockEndTime(block);
  return DAY_KEY.test(date) &&
    isValidHHMM(startTime) &&
    isValidHHMM(endTime) &&
    toMin(endTime) > toMin(startTime);
}

export function getBlockReason(block: Block | null | undefined): string | null {
  return text(block?.reason) ?? text(block?.motivo);
}

export function getBlockProfessionalId(block: Block): string | null {
  return text(block.professionalId) ?? text(block.profissional_id);
}

export function normalizeBlock(block: Block): Block {
  return {
    ...block,
    date: getBlockDate(block) || undefined,
    startTime: getBlockStartTime(block),
    endTime: getBlockEndTime(block),
    reason: getBlockReason(block),
    professionalId: getBlockProfessionalId(block),
  };
}
