export const VALID_AGENDA_GRANULARITIES = [5, 10, 15, 20, 30] as const;
export const VALID_AGENDA_WEEK_VISUAL_SCALES = [30, 60] as const;

const DEFAULT_AGENDA_GRANULARITY = 30;
const DEFAULT_AGENDA_WEEK_VISUAL_SCALE = 30;

const isValidGranularityNumber = (value: number): boolean =>
  Number.isInteger(value) && VALID_AGENDA_GRANULARITIES.includes(value as (typeof VALID_AGENDA_GRANULARITIES)[number]);

const isValidWeekVisualScaleNumber = (value: number): boolean =>
  Number.isInteger(value) && VALID_AGENDA_WEEK_VISUAL_SCALES.includes(value as (typeof VALID_AGENDA_WEEK_VISUAL_SCALES)[number]);

export function isValidAgendaGranularity(value: unknown): boolean {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  return isValidGranularityNumber(parsed);
}

export function normalizeAgendaGranularity(value: unknown, fallback = DEFAULT_AGENDA_GRANULARITY): number {
  const safeFallback = isValidGranularityNumber(fallback) ? fallback : DEFAULT_AGENDA_GRANULARITY;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  return isValidGranularityNumber(parsed) ? parsed : safeFallback;
}

export function isValidAgendaWeekVisualScale(value: unknown): boolean {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  return isValidWeekVisualScaleNumber(parsed);
}

export function normalizeAgendaWeekVisualScale(value: unknown, fallback = DEFAULT_AGENDA_WEEK_VISUAL_SCALE): number {
  const safeFallback = isValidWeekVisualScaleNumber(fallback) ? fallback : DEFAULT_AGENDA_WEEK_VISUAL_SCALE;
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  return isValidWeekVisualScaleNumber(parsed) ? parsed : safeFallback;
}
