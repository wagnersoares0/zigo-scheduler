import { GRID_MIN } from "../constants";
import type { AgendaEngineContext, AgendaValidationResult } from "../engine/types";
import { validateAgendaRange } from "../engine/validation";
import type { AddServiceForm, AppointmentEditForm, Service } from "../types";
import type { EffectiveBusinessHours } from "./business-hours";
import { getServiceDurationMinutes } from "./appointment-fields";
import { formatHumanDuration } from "./format";
import { toHHMM, toMin } from "./time";

export const DRAWER_PROFESSIONAL_REQUIRED_MESSAGE =
  "Select a professional for this appointment.";

export const DRAWER_PAUSE_OR_BUSINESS_HOURS_MESSAGE =
  "This service crosses a break or falls outside the professional's business hours. Adjust the time before saving.";

export function calculateEndFromServiceDuration(
  startTime: string,
  durationMinutes: number,
  maxMinutes = (24 * 60) - 1,
): string | null {
  const startMinute = toMin(startTime);
  const safeDuration = Math.trunc(durationMinutes);
  if (!Number.isFinite(startMinute) || !Number.isFinite(safeDuration) || safeDuration < GRID_MIN) {
    return null;
  }
  return toHHMM(Math.min(maxMinutes, startMinute + safeDuration));
}

export function shouldRecalculateEndFromServiceDuration(
  durationMinutes: number,
  endTouchedByUser: boolean,
): boolean {
  return Number.isFinite(durationMinutes) && durationMinutes >= GRID_MIN && !endTouchedByUser;
}

export function validateProfessionalSelection(professionalId: string | null | undefined): AgendaValidationResult {
  if (typeof professionalId === "string" && professionalId.trim()) return { ok: true };
  return {
    ok: false,
    code: "RESOURCE_NOT_ALLOWED",
    message: DRAWER_PROFESSIONAL_REQUIRED_MESSAGE,
  };
}

export function validateDrawerSchedulingRules({
  context,
  dayKey,
  professionalId,
  startTime,
  durationMinutes,
}: {
  context: AgendaEngineContext;
  dayKey: string;
  professionalId: string | null;
  startTime: string;
  durationMinutes: number;
}): AgendaValidationResult {
  const startMinute = toMin(startTime);
  if (!Number.isFinite(startMinute)) {
    return {
      ok: false,
      code: "INVALID_DURATION",
      message: DRAWER_PAUSE_OR_BUSINESS_HOURS_MESSAGE,
    };
  }

  const result = validateAgendaRange(context, {
    dayKey,
    resourceId: professionalId || null,
    startMinute,
    endMinute: startMinute + durationMinutes,
  });

  if (result.ok) return result;
  if (result.code === "OUTSIDE_BUSINESS_HOURS" || result.code === "PAUSE_CONFLICT") {
    return {
      ok: false,
      code: result.code,
      message: DRAWER_PAUSE_OR_BUSINESS_HOURS_MESSAGE,
    };
  }
  return result;
}

export function getAddServicoMensagemErro({
  addServicoForm,
  servicosCatalogo,
  businessHours,
  granularidade,
  serviceNumber = 2,
}: {
  addServicoForm: AddServiceForm | null;
  servicosCatalogo: Service[];
  businessHours: EffectiveBusinessHours;
  granularidade: number;
  serviceNumber?: number;
}): string | null {
  if (!addServicoForm || !addServicoForm.servicoId) return null;
  const service = servicosCatalogo.find((item) => item.id === addServicoForm.servicoId);
  if (!service) return "Selected service was not found.";

  const startMinute = toMin(addServicoForm.inicio);
  const serviceDuration = Math.max(granularidade, getServiceDurationMinutes(service) ?? granularidade);
  const calculatedEndMinute = startMinute + serviceDuration;

  if (businessHours.isClosed) {
    return businessHours.closedMessage ?? "This day is closed on the schedule.";
  }
  if (startMinute < businessHours.startMinute) {
    return `Service ${serviceNumber} cannot start before ${toHHMM(businessHours.startMinute)}.`;
  }
  if (startMinute >= businessHours.endMinute) {
    return `Service ${serviceNumber} must start before ${toHHMM(businessHours.endMinute)}.`;
  }
  if (calculatedEndMinute > businessHours.endMinute) {
    return `This service ends after business hours (${toHHMM(businessHours.endMinute)}).`;
  }

  return null;
}

export type AgendaEditRangeValidationInput = {
  dayKey: string;
  professionalId: string | null;
  startMinute: number;
  endMinute: number;
  ignoreAppointmentId: string;
};

export function getAgEditConflictMessage({
  form,
  snapshotStatus,
  fimHorarioManual,
  duracaoEfetiva,
  granularidade,
  businessHours,
  validateRange,
}: {
  form: AppointmentEditForm | null;
  snapshotStatus: AppointmentEditForm["status"] | null;
  fimHorarioManual: boolean;
  duracaoEfetiva: number;
  granularidade: number;
  businessHours: EffectiveBusinessHours;
  validateRange: (input: AgendaEditRangeValidationInput) => AgendaValidationResult;
}): string | null {
  if (!form) return null;
  if (snapshotStatus === "cancelado" || snapshotStatus === "concluido") return null;
  if (fimHorarioManual && duracaoEfetiva < granularidade) {
    return `Invalid end time. Set an end at least ${formatHumanDuration(granularidade)} after the start.`;
  }

  const duration = Math.max(granularidade, duracaoEfetiva || form.duracaoMinutos || granularidade);
  const startMinute = toMin(form.horario);
  const endMinute = startMinute + duration;

  if (businessHours.isClosed) {
    return businessHours.closedMessage ?? "This day is closed on the schedule.";
  }
  if (startMinute < businessHours.startMinute) {
    return `Start time is outside business hours. It must be ${toHHMM(businessHours.startMinute)} or later.`;
  }
  if (endMinute > businessHours.endMinute) {
    const latestAllowedStart = Math.max(businessHours.startMinute, businessHours.endMinute - duration);
    return `This service ends at ${toHHMM(Math.min((24 * 60) - 1, endMinute))}, but business hours end at ${toHHMM(businessHours.endMinute)}. The latest possible start is ${toHHMM(latestAllowedStart)}.`;
  }
  if (!form.profissionalId) {
    return DRAWER_PROFESSIONAL_REQUIRED_MESSAGE;
  }

  const validation = validateRange({
    dayKey: form.data,
    professionalId: form.profissionalId || null,
    startMinute,
    endMinute,
    ignoreAppointmentId: form.agendamentoId,
  });

  if (validation.ok) return null;
  if (validation.code === "APPOINTMENT_CONFLICT") {
    return "This professional already has an appointment at that time.";
  }
  if (validation.code === "BLOCK_CONFLICT") {
    return "This time is blocked for this professional.";
  }
  return validation.message;
}
