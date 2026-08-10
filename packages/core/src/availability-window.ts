import { DEFAULT_TIME_ZONE, zonedDayOfWeek, type TimeZone } from "./timezone";

export type BusinessHoursDayLike = {
  active?: boolean | null;
  ativo?: boolean | null;
  opensAt?: string | null;
  abertura?: string | null;
  closesAt?: string | null;
  fechamento?: string | null;
};

/** @deprecated Use `BusinessHoursDayLike`. */
export type HorariosSemanaItemLike = BusinessHoursDayLike;

export type BusinessHoursLike = Record<string, BusinessHoursDayLike> | null | undefined;

/** @deprecated Use `BusinessHoursLike`. */
export type HorariosSemanaLike = BusinessHoursLike;

export type ProfessionalScheduleLike = {
  startTime?: string | null;
  hora_inicio?: string | null;
  endTime?: string | null;
  hora_fim?: string | null;
  active?: boolean | null;
  ativo?: boolean | null;
  hasBreak?: boolean | null;
  tem_pausa?: boolean | null;
  breakStartsAt?: string | null;
  pausa_inicio?: string | null;
  breakEndsAt?: string | null;
  pausa_fim?: string | null;
} | null;

/** @deprecated Use `ProfessionalScheduleLike`. */
export type ProfissionalHorarioLike = ProfessionalScheduleLike;

export type TimeWindow = {
  startMin: number;
  endMin: number;
  opensAt?: string;
  closesAt?: string;
  /** @deprecated Use `opensAt`. */
  abertura: string;
  /** @deprecated Use `closesAt`. */
  fechamento: string;
};

export type LunchBreakWindow = {
  startMin: number;
  endMin: number;
  startsAt?: string;
  endsAt?: string;
  /** @deprecated Use `startsAt`. */
  inicio: string;
  /** @deprecated Use `endsAt`. */
  fim: string;
};

export type LunchBreakConfigLike = {
  hasBreak?: boolean | null;
  tem_pausa?: boolean | null;
  breakStartsAt?: string | null;
  pausa_inicio?: string | null;
  breakEndsAt?: string | null;
  pausa_fim?: string | null;
} | null | undefined;

export type EffectiveLunchBreakResult =
  | { ok: true; window: LunchBreakWindow | null }
  | { ok: false; code: string; message: string };

const DOW_KEYS = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"] as const;
const DEFAULT_ABERTURA = "09:00";
const DEFAULT_FECHAMENTO = "18:00";
const WEEKDAY_ALIASES: Record<string, (typeof DOW_KEYS)[number]> = {
  sunday: "domingo",
  domingo: "domingo",
  dom: "domingo",
  monday: "segunda",
  mon: "segunda",
  segunda: "segunda",
  segundafeira: "segunda",
  seg: "segunda",
  tuesday: "terca",
  tue: "terca",
  terca: "terca",
  tercafeira: "terca",
  ter: "terca",
  wednesday: "quarta",
  wed: "quarta",
  quarta: "quarta",
  quartafeira: "quarta",
  qua: "quarta",
  thursday: "quinta",
  thu: "quinta",
  quinta: "quinta",
  quintafeira: "quinta",
  qui: "quinta",
  friday: "sexta",
  fri: "sexta",
  sexta: "sexta",
  sextafeira: "sexta",
  sex: "sexta",
  saturday: "sabado",
  sat: "sabado",
  sabado: "sabado",
  sab: "sabado",
};

function normalizeWeekdayKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function resolveWeekdayConfigKey(value: string): (typeof DOW_KEYS)[number] | null {
  return WEEKDAY_ALIASES[normalizeWeekdayKey(value)] ?? null;
}

function getHorariosSemanaItem(
  horariosSemana: HorariosSemanaLike,
  diaKey: (typeof DOW_KEYS)[number]
): HorariosSemanaItemLike | null {
  if (!horariosSemana) return null;

  const exact = horariosSemana[diaKey];
  if (exact) return exact;

  for (const [key, value] of Object.entries(horariosSemana)) {
    if (resolveWeekdayConfigKey(key) === diaKey) {
      return value;
    }
  }

  return null;
}

function parseHourToMinutes(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function isValidHour(value: string | null | undefined): value is string {
  return parseHourToMinutes(value) !== null;
}

const getBreakFlag = (config: LunchBreakConfigLike | ProfessionalScheduleLike): boolean | null | undefined =>
  config?.hasBreak ?? config?.tem_pausa;

const getBreakStart = (config: LunchBreakConfigLike | ProfessionalScheduleLike): string | null | undefined =>
  config?.breakStartsAt ?? config?.pausa_inicio;

const getBreakEnd = (config: LunchBreakConfigLike | ProfessionalScheduleLike): string | null | undefined =>
  config?.breakEndsAt ?? config?.pausa_fim;

const getProfessionalStartTime = (config: ProfessionalScheduleLike): string | null | undefined =>
  config?.startTime ?? config?.hora_inicio;

const getProfessionalEndTime = (config: ProfessionalScheduleLike): string | null | undefined =>
  config?.endTime ?? config?.hora_fim;

const getProfessionalActive = (config: ProfessionalScheduleLike): boolean | null | undefined =>
  config?.active ?? config?.ativo;

export function toMinutes(value: string): number {
  const minutes = parseHourToMinutes(value);
  if (minutes === null) {
    throw new Error(`Invalid hour format: ${value}`);
  }
  return minutes;
}

export function fromMinutes(value: number): string {
  const h = Math.floor(value / 60);
  const m = value % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function resolveLunchBreakWindow(config: LunchBreakConfigLike): LunchBreakWindow | null {
  if (!getBreakFlag(config)) return null;

  const start = parseHourToMinutes(getBreakStart(config));
  const end = parseHourToMinutes(getBreakEnd(config));
  if (start === null || end === null || end <= start) return null;

  return {
    startMin: start,
    endMin: end,
    startsAt: fromMinutes(start),
    endsAt: fromMinutes(end),
    inicio: fromMinutes(start),
    fim: fromMinutes(end),
  };
}

export function resolveEffectiveLunchBreak(input: {
  business?: LunchBreakConfigLike;
  tenant?: LunchBreakConfigLike;
  professionalSchedule?: ProfessionalScheduleLike;
  profissionalHorario?: ProfessionalScheduleLike;
}): EffectiveLunchBreakResult {
  const professional = input.professionalSchedule ?? input.profissionalHorario;
  const professionalBreak = getBreakFlag(professional);

  if (professionalBreak === true) {
    const professionalWindow = resolveLunchBreakWindow(professional);
    if (!professionalWindow) {
      return {
        ok: false,
        code: "invalid_professional_break",
        message: "The professional break is invalid.",
      };
    }
    return { ok: true, window: professionalWindow };
  }

  if (professionalBreak === false) {
    return { ok: true, window: null };
  }

  return { ok: true, window: resolveLunchBreakWindow(input.business ?? input.tenant) };
}

export function rangeOverlapsLunchBreak(input: {
  startMin: number;
  endMin: number;
  lunchBreak: LunchBreakWindow | null;
}): boolean {
  const lunchBreak = input.lunchBreak;
  if (!lunchBreak) return false;
  return input.startMin < lunchBreak.endMin && input.endMin > lunchBreak.startMin;
}

/**
 * Day of week (0 = Sunday) for a calendar date, as seen in `timeZone`.
 *
 * Delegates to the time zone module so the weekday follows the business's own
 * zone rather than the server's. See `zonedDayOfWeek` for why it anchors at noon
 * instead of midnight.
 */
export function getDayOfWeekFromDate(
  dateYmd: string,
  timeZone: TimeZone = DEFAULT_TIME_ZONE
): number {
  return zonedDayOfWeek(dateYmd, timeZone);
}

export type BusinessOperatingWindowInput = {
  dayOfWeek: number;
  businessHours?: BusinessHoursLike;
  /** @deprecated Use `businessHours`. */
  horariosSemana?: BusinessHoursLike;
  opensAt?: string | null;
  /** @deprecated Use `opensAt`. */
  horarioAbertura?: string | null;
  closesAt?: string | null;
  /** @deprecated Use `closesAt`. */
  horarioFechamento?: string | null;
};

export function resolveBusinessOperatingWindow(input: BusinessOperatingWindowInput): TimeWindow | null {
  const configuredOpensAt = input.opensAt ?? input.horarioAbertura;
  const configuredClosesAt = input.closesAt ?? input.horarioFechamento;
  const fallbackOpensAt = isValidHour(configuredOpensAt) ? configuredOpensAt : DEFAULT_ABERTURA;
  const fallbackClosesAt = isValidHour(configuredClosesAt) ? configuredClosesAt : DEFAULT_FECHAMENTO;

  let opensAt = fallbackOpensAt;
  let closesAt = fallbackClosesAt;

  const diaKey = DOW_KEYS[input.dayOfWeek] ?? null;
  const weekdayHours = diaKey ? getHorariosSemanaItem(input.businessHours ?? input.horariosSemana, diaKey) : null;

  if (weekdayHours) {
    if ((weekdayHours.active ?? weekdayHours.ativo) === false) {
      return null;
    }
    const dayOpensAt = weekdayHours.opensAt ?? weekdayHours.abertura;
    const dayClosesAt = weekdayHours.closesAt ?? weekdayHours.fechamento;
    if (isValidHour(dayOpensAt)) opensAt = dayOpensAt;
    if (isValidHour(dayClosesAt)) closesAt = dayClosesAt;
  }

  const startMin = toMinutes(opensAt);
  const endMin = toMinutes(closesAt);
  if (endMin <= startMin) return null;

  return {
    startMin,
    endMin,
    opensAt: fromMinutes(startMin),
    closesAt: fromMinutes(endMin),
    abertura: fromMinutes(startMin),
    fechamento: fromMinutes(endMin),
  };
}

/** @deprecated Use `resolveBusinessOperatingWindow`. */
export function resolveTenantOperatingWindow(input: BusinessOperatingWindowInput): TimeWindow | null {
  return resolveBusinessOperatingWindow(input);
}

export function resolveEffectiveAvailabilityWindow(input: {
  businessWindow?: TimeWindow;
  /** @deprecated Use `businessWindow`. */
  tenantWindow?: TimeWindow;
  professionalSchedule?: ProfessionalScheduleLike;
  /** @deprecated Use `professionalSchedule`. */
  profissionalHorario?: ProfessionalScheduleLike;
  requestedOpensAt?: string | null;
  requestedAbertura?: string | null;
  requestedClosesAt?: string | null;
  requestedFechamento?: string | null;
}): TimeWindow | null {
  const businessWindow = input.businessWindow ?? input.tenantWindow;
  if (!businessWindow) return null;

  let start = businessWindow.startMin;
  let end = businessWindow.endMin;

  const prof = input.professionalSchedule ?? input.profissionalHorario;
  if (prof) {
    if (getProfessionalActive(prof) === false) return null;
    const profStartTime = getProfessionalStartTime(prof);
    const profEndTime = getProfessionalEndTime(prof);
    if (!isValidHour(profStartTime) || !isValidHour(profEndTime)) return null;
    const profStart = toMinutes(profStartTime);
    const profEnd = toMinutes(profEndTime);
    if (profEnd <= profStart) return null;
    start = Math.max(start, profStart);
    end = Math.min(end, profEnd);
  }

  const requestedAbertura = input.requestedOpensAt ?? input.requestedAbertura;
  const requestedFechamento = input.requestedClosesAt ?? input.requestedFechamento;
  if (isValidHour(requestedAbertura)) {
    start = Math.max(start, toMinutes(requestedAbertura));
  }
  if (isValidHour(requestedFechamento)) {
    end = Math.min(end, toMinutes(requestedFechamento));
  }

  if (end <= start) return null;

  return {
    startMin: start,
    endMin: end,
    opensAt: fromMinutes(start),
    closesAt: fromMinutes(end),
    abertura: fromMinutes(start),
    fechamento: fromMinutes(end),
  };
}

export function isStartTimeWithinWindow(input: {
  startTime: string;
  durationMinutes: number;
  window: TimeWindow;
}): boolean {
  if (!isValidHour(input.startTime)) return false;
  const start = toMinutes(input.startTime);
  const end = start + Math.max(0, Math.trunc(input.durationMinutes));
  return start >= input.window.startMin && end <= input.window.endMin;
}
