import type { HorarioSelectOption, BreakWindow } from "../types";
import type { EffectiveBusinessHours } from "./business-hours";
import { formatHorarioOptionLabel } from "./format";
import { isMinuteInsideBreakWindow, rangeOverlapsBreakWindow, toHHMM, toMin } from "./time";

type DisabledReason = "almoco" | "expediente" | null;

type BuildInicioOptionsParams = {
  businessHours: EffectiveBusinessHours;
  granularidade: number;
  pausaIntervalo: BreakWindow | null;
  currentValue?: string | null;
  durationMinutes: number;
  validateDuration: boolean;
};

type BuildFimOptionsParams = {
  businessHours: EffectiveBusinessHours;
  granularidade: number;
  pausaIntervalo: BreakWindow | null;
  startValue: string;
  currentValue?: string | null;
};

const isFiniteMinute = (minute: number): boolean => Number.isFinite(minute);

const createHorarioOption = (
  value: string,
  disabled: boolean,
  reason: DisabledReason,
): HorarioSelectOption => ({
  value,
  label: formatHorarioOptionLabel(value, disabled, reason),
  disabled,
});

const getCurrentInicioState = ({
  businessHours,
  pausaIntervalo,
  currentValue,
  durationMinutes,
  validateDuration,
}: Omit<BuildInicioOptionsParams, "granularidade">): { disabled: boolean; reason: DisabledReason } => {
  const currentMinute = toMin(currentValue ?? "");
  const endMinute = currentMinute + durationMinutes;
  const startsInPause = isFiniteMinute(currentMinute) && isMinuteInsideBreakWindow(currentMinute, pausaIntervalo);
  const overlapsPause =
    isFiniteMinute(currentMinute) &&
    validateDuration &&
    rangeOverlapsBreakWindow(currentMinute, endMinute, pausaIntervalo);
  const outsideBusinessHours =
    !isFiniteMinute(currentMinute) ||
    currentMinute < businessHours.startMinute ||
    currentMinute >= businessHours.endMinute;
  const disabled =
    businessHours.isClosed ||
    outsideBusinessHours ||
    startsInPause ||
    (validateDuration && endMinute > businessHours.endMinute) ||
    overlapsPause;
  const reason =
    businessHours.isClosed || outsideBusinessHours
      ? "expediente"
      : startsInPause
        ? "almoco"
        : null;

  return { disabled, reason };
};

export const buildInicioHorarioOptions = ({
  businessHours,
  granularidade,
  pausaIntervalo,
  currentValue,
  durationMinutes,
  validateDuration,
}: BuildInicioOptionsParams): HorarioSelectOption[] => {
  const safeGranularidade = Math.max(1, Math.trunc(granularidade || 1));
  const safeDuration = Math.max(safeGranularidade, Math.trunc(durationMinutes || safeGranularidade));
  const options: HorarioSelectOption[] = [];

  for (
    let minute = businessHours.startMinute;
    minute <= businessHours.endMinute - safeGranularidade;
    minute += safeGranularidade
  ) {
    const hour = toHHMM(minute);
    let disabled = businessHours.isClosed;
    let reason: DisabledReason = disabled ? "expediente" : null;

    if (!disabled && isMinuteInsideBreakWindow(minute, pausaIntervalo)) {
      disabled = true;
      reason = "almoco";
    } else if (!disabled && validateDuration) {
      const autoEnd = minute + safeDuration;
      if (autoEnd > businessHours.endMinute || rangeOverlapsBreakWindow(minute, autoEnd, pausaIntervalo)) {
        disabled = true;
      }
    }

    options.push(createHorarioOption(hour, disabled, reason));
  }

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    const { disabled, reason } = getCurrentInicioState({
      businessHours,
      pausaIntervalo,
      currentValue,
      durationMinutes: safeDuration,
      validateDuration,
    });
    options.unshift(createHorarioOption(currentValue, disabled, reason));
  }

  return options;
};

export const buildFimHorarioOptions = ({
  businessHours,
  granularidade,
  pausaIntervalo,
  startValue,
  currentValue,
}: BuildFimOptionsParams): HorarioSelectOption[] => {
  const startMinute = toMin(startValue);
  if (!isFiniteMinute(startMinute)) return [];

  const safeGranularidade = Math.max(1, Math.trunc(granularidade || 1));
  const options: HorarioSelectOption[] = [];

  for (
    let minute = businessHours.startMinute + safeGranularidade;
    minute <= businessHours.endMinute;
    minute += safeGranularidade
  ) {
    const hour = toHHMM(minute);
    const overlapsPause = rangeOverlapsBreakWindow(startMinute, minute, pausaIntervalo);
    const disabled = businessHours.isClosed || minute <= startMinute || overlapsPause;
    const reason: DisabledReason = businessHours.isClosed ? "expediente" : overlapsPause ? "almoco" : null;
    options.push(createHorarioOption(hour, disabled, reason));
  }

  if (currentValue && !options.some((option) => option.value === currentValue)) {
    const currentMinute = toMin(currentValue);
    const overlapsPause =
      isFiniteMinute(currentMinute) && rangeOverlapsBreakWindow(startMinute, currentMinute, pausaIntervalo);
    const disabled =
      businessHours.isClosed ||
      !isFiniteMinute(currentMinute) ||
      currentMinute <= startMinute ||
      currentMinute > businessHours.endMinute ||
      overlapsPause;
    const reason: DisabledReason =
      businessHours.isClosed ||
      !isFiniteMinute(currentMinute) ||
      currentMinute <= startMinute ||
      currentMinute > businessHours.endMinute
        ? "expediente"
        : overlapsPause
          ? "almoco"
          : null;

    options.unshift(createHorarioOption(currentValue, disabled, reason));
  }

  return options;
};
