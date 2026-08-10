import { WEEKDAY_KEY_BY_DOW } from "../constants";
import type { WeekdayKey, WeekdayBusinessHours, BusinessHours, BreakWindow, Professional, ProfessionalDaySchedule } from "../types";
import { getProfessionalClosesAt, getProfessionalName, getProfessionalOpensAt } from "./appointment-fields";
import { dateKey, fromDayKey, normalizeHHMM, resolveBreakWindow, toHHMM, toMin } from "./time";

export type EffectiveBusinessHours = {
  startMinute: number;
  endMinute: number;
  opensAt?: string;
  closesAt?: string;
  /** @deprecated Use `opensAt`. */
  abertura: string;
  /** @deprecated Use `closesAt`. */
  fechamento: string;
  isClosed: boolean;
  closedMessage?: string;
};

export type BusinessHoursDefaults = {
  opensAt?: string | null;
  /** @deprecated Use `opensAt`. */
  abertura?: string | null;
  closesAt?: string | null;
  /** @deprecated Use `closesAt`. */
  fechamento?: string | null;
};

type BusinessHoursRange = Pick<EffectiveBusinessHours, "startMinute" | "endMinute">;

const WEEKDAY_ALIASES: Record<string, WeekdayKey> = {
  sunday: "sunday",
  domingo: "sunday",
  dom: "sunday",
  monday: "monday",
  mon: "monday",
  segunda: "monday",
  segundafeira: "monday",
  seg: "monday",
  tuesday: "tuesday",
  tue: "tuesday",
  terca: "tuesday",
  tercafeira: "tuesday",
  ter: "tuesday",
  wednesday: "wednesday",
  wed: "wednesday",
  quarta: "wednesday",
  quartafeira: "wednesday",
  qua: "wednesday",
  thursday: "thursday",
  thu: "thursday",
  quinta: "thursday",
  quintafeira: "thursday",
  qui: "thursday",
  friday: "friday",
  fri: "friday",
  sexta: "friday",
  sextafeira: "friday",
  sex: "friday",
  saturday: "saturday",
  sat: "saturday",
  sabado: "saturday",
  sab: "saturday",
};

const normalizeWeekdayKey = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");

export const resolveWeekdayConfigKey = (value: string): WeekdayKey | null =>
  WEEKDAY_ALIASES[normalizeWeekdayKey(value)] ?? null;

export const getWeekdayBusinessHours = (
  businessHours: BusinessHours | null | undefined,
  weekdayKey: WeekdayKey,
): WeekdayBusinessHours | null => {
  if (!businessHours) return null;

  const exact = businessHours[weekdayKey];
  if (exact) return exact;

  for (const [key, value] of Object.entries(businessHours)) {
    if (resolveWeekdayConfigKey(key) === weekdayKey) {
      return value as WeekdayBusinessHours;
    }
  }

  return null;
};

/** @deprecated Use `getWeekdayBusinessHours`. */
export const getHorarioDiaSemana = getWeekdayBusinessHours;

const isInactiveFlag = (value: boolean | string | number | null | undefined): boolean =>
  value === false || value === 0 || value === "false" || value === "0";

const isActiveDayFlag = (value: WeekdayBusinessHours): boolean | string | number | null | undefined =>
  value.active ?? value.ativo;

const isActiveProfessionalDayFlag = (value: ProfessionalDaySchedule): boolean | string | number | null | undefined =>
  value.active ?? value.ativo;

const getProfessionalScheduleStartTime = (value: ProfessionalDaySchedule | null | undefined): string | null | undefined =>
  value?.startTime ?? value?.hora_inicio;

const getProfessionalScheduleEndTime = (value: ProfessionalDaySchedule | null | undefined): string | null | undefined =>
  value?.endTime ?? value?.hora_fim;

const getProfessionalScheduleHasBreak = (value: ProfessionalDaySchedule): boolean | string | number | null | undefined =>
  value.hasBreak ?? value.tem_pausa;

const getProfessionalScheduleBreakStartsAt = (value: ProfessionalDaySchedule): string | null | undefined =>
  value.breakStartsAt ?? value.pausa_inicio;

const getProfessionalScheduleBreakEndsAt = (value: ProfessionalDaySchedule): string | null | undefined =>
  value.breakEndsAt ?? value.pausa_fim;

export const getProfessionalDaySchedule = (
  professional: Professional,
  dayKey?: string,
): ProfessionalDaySchedule | null => {
  const schedule = professional.schedule ?? professional.horarios_profissional;
  if (!dayKey || !Array.isArray(schedule)) return null;
  const diaSemana = fromDayKey(dayKey).getDay();
  return schedule.find((horario) => Number(horario.dayOfWeek ?? horario.dia_semana) === diaSemana) ?? null;
};

const isExplicitFalse = (value: boolean | string | number | null | undefined): boolean =>
  isInactiveFlag(value);

const isExplicitTrue = (value: boolean | string | number | null | undefined): boolean =>
  value === true || value === 1 || value === "true" || value === "1";

export type GetProfessionalBreakWindowForDayInput = {
  breakWindow?: BreakWindow | null;
  lunchBreak?: BreakWindow | null;
  /** @deprecated Use `breakWindow` or `lunchBreak`. */
  tenantPausaIntervalo?: BreakWindow | null;
  professional: Professional | null | undefined;
  dayKey?: string;
};

export const getProfessionalBreakWindowForDay = ({
  breakWindow,
  lunchBreak,
  tenantPausaIntervalo,
  professional,
  dayKey,
}: GetProfessionalBreakWindowForDayInput): BreakWindow | null => {
  const inheritedBreakWindow = breakWindow ?? lunchBreak ?? tenantPausaIntervalo ?? null;
  if (!professional) return inheritedBreakWindow;
  const professionalSchedule = getProfessionalDaySchedule(professional, dayKey);
  if (!professionalSchedule) return inheritedBreakWindow;

  const hasBreak = getProfessionalScheduleHasBreak(professionalSchedule);
  if (isExplicitFalse(hasBreak)) return null;
  if (isExplicitTrue(hasBreak)) {
    return resolveBreakWindow(
      true,
      normalizeHHMM(getProfessionalScheduleBreakStartsAt(professionalSchedule)),
      normalizeHHMM(getProfessionalScheduleBreakEndsAt(professionalSchedule)),
    );
  }

  return inheritedBreakWindow;
};

/** @deprecated Use `getProfessionalBreakWindowForDay`. */
export const getProfessionalPauseIntervalForDay = getProfessionalBreakWindowForDay;

export type GetEffectiveBusinessHoursForDayInput = {
  dayKey: string;
  businessHours?: BusinessHours | null;
  defaultHours?: BusinessHoursDefaults;
  /** @deprecated Use `businessHours`. */
  tenantHorariosSemana?: BusinessHours | null;
  /** @deprecated Use `defaultHours`. */
  tenantHorarioPadrao?: BusinessHoursDefaults;
};

export const getEffectiveBusinessHoursForDay = ({
  dayKey,
  businessHours,
  defaultHours,
  tenantHorariosSemana,
  tenantHorarioPadrao,
}: GetEffectiveBusinessHoursForDayInput): EffectiveBusinessHours => {
  const resolvedBusinessHours = businessHours ?? tenantHorariosSemana;
  const resolvedDefaultHours = defaultHours ?? tenantHorarioPadrao ?? {};
  const weekdayKey = WEEKDAY_KEY_BY_DOW[fromDayKey(dayKey).getDay()];
  const weekdayHours = getWeekdayBusinessHours(resolvedBusinessHours, weekdayKey);
  const defaultOpensAt = normalizeHHMM(resolvedDefaultHours.opensAt ?? resolvedDefaultHours.abertura) ?? "08:00";
  const defaultClosesAt = normalizeHHMM(resolvedDefaultHours.closesAt ?? resolvedDefaultHours.fechamento) ?? "18:00";
  const opensAt = normalizeHHMM(weekdayHours?.opensAt ?? weekdayHours?.abertura) ?? defaultOpensAt;
  const closesAt = normalizeHHMM(weekdayHours?.closesAt ?? weekdayHours?.fechamento) ?? defaultClosesAt;
  const startMinute = toMin(opensAt);
  const endMinuteRaw = toMin(closesAt);
  const endMinute = endMinuteRaw > startMinute ? endMinuteRaw : startMinute + 60;
  const isClosed = weekdayHours ? isInactiveFlag(isActiveDayFlag(weekdayHours)) : false;

  return {
    startMinute,
    endMinute,
    opensAt,
    closesAt,
    abertura: opensAt,
    fechamento: closesAt,
    isClosed,
    closedMessage: isClosed ? "This day is closed on the schedule." : undefined,
  };
};

export const getProfessionalBusinessHoursRange = (
  dayHours: EffectiveBusinessHours,
  professional: Professional,
  dayKey?: string,
): BusinessHoursRange | null => {
  if (dayHours.isClosed) return null;

  let startMinute = dayHours.startMinute;
  let endMinute = dayHours.endMinute;
  const professionalSchedule = getProfessionalDaySchedule(professional, dayKey);
  if (professionalSchedule && isInactiveFlag(isActiveProfessionalDayFlag(professionalSchedule))) return null;

  const professionalOpensAt =
    normalizeHHMM(getProfessionalScheduleStartTime(professionalSchedule)) ?? normalizeHHMM(getProfessionalOpensAt(professional));
  const professionalClosesAt =
    normalizeHHMM(getProfessionalScheduleEndTime(professionalSchedule)) ?? normalizeHHMM(getProfessionalClosesAt(professional));

  if (professionalOpensAt) startMinute = Math.max(startMinute, toMin(professionalOpensAt));
  if (professionalClosesAt) endMinute = Math.min(endMinute, toMin(professionalClosesAt));

  if (endMinute <= startMinute) return null;
  return { startMinute, endMinute };
};

export const getProfessionalBusinessHoursMessage = (
  dayHours: EffectiveBusinessHours,
  professional: Professional,
  dayKey?: string,
): string => {
  const range = getProfessionalBusinessHoursRange(dayHours, professional, dayKey);
  const professionalName = getProfessionalName(professional) || "This professional";
  if (!range) {
    return `${professionalName} does not work on this day. Update the working hours in the professional profile.`;
  }

  return `${professionalName} works from ${toHHMM(range.startMinute)} to ${toHHMM(range.endMinute)} on this day. Adjust the appointment time or update the professional's working hours.`;
};

export const getGridBusinessHoursRange = ({
  days,
  selectedDayBusinessHours,
  getBusinessHoursForDay,
}: {
  days: Date[];
  selectedDayBusinessHours: EffectiveBusinessHours;
  getBusinessHoursForDay: (dayKey: string) => EffectiveBusinessHours;
}): BusinessHoursRange => {
  const openRanges = days.flatMap((day) => {
    const dayHours = getBusinessHoursForDay(dateKey(day));
    if (dayHours.isClosed) return [];

    return [{ startMinute: dayHours.startMinute, endMinute: dayHours.endMinute }];
  });

  if (!openRanges.length) {
    return {
      startMinute: selectedDayBusinessHours.startMinute,
      endMinute: selectedDayBusinessHours.endMinute,
    };
  }

  return {
    startMinute: Math.min(...openRanges.map((hours) => hours.startMinute)),
    endMinute: Math.max(...openRanges.map((hours) => hours.endMinute)),
  };
};
