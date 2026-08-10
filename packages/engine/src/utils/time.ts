import type { BreakWindow } from "../types";
import {
  zonedDateKey,
  zonedMinutesOfDay,
  zonedNow,
  type TimeZone,
} from "@zigoschedule/scheduler-core";

// ─── Time conversion ──────────────────────────────────────────────────────────

export const toMin = (t: string): number => {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

export const normalizeHHMM = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] === undefined ? 0 : Number(match[3]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || !Number.isInteger(second)) return null;
  if (hour === 24 && minute === 0 && second === 0) return "24:00";
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export const isValidHHMM = (value: string | null | undefined): value is string =>
  normalizeHHMM(value) !== null;

export const toHHMM = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export const getDurationFromRange = (startTime: string, endTime: string): number | null => {
  if (!isValidHHMM(startTime) || !isValidHHMM(endTime)) return null;
  const startMinute = toMin(startTime);
  const endMinute = toMin(endTime);
  if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute)) return null;
  if (endMinute <= startMinute) return null;
  return endMinute - startMinute;
};

// ─── Break / interval ─────────────────────────────────────────────────────────

export const resolveBreakWindow = (
  hasBreak: boolean,
  breakStartsAt: string | null,
  breakEndsAt: string | null,
): BreakWindow | null => {
  if (!hasBreak) return null;
  if (!isValidHHMM(breakStartsAt) || !isValidHHMM(breakEndsAt)) return null;
  const startMinute = toMin(breakStartsAt);
  const endMinute = toMin(breakEndsAt);
  if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute) || endMinute <= startMinute) return null;
  return {
    startMinute,
    endMinute,
    startsAt: breakStartsAt,
    endsAt: breakEndsAt,
    inicioMin: startMinute,
    fimMin: endMinute,
    inicioHHMM: breakStartsAt,
    fimHHMM: breakEndsAt,
  };
};

/** @deprecated Use `resolveBreakWindow`. */
export const resolvePausaIntervalo = resolveBreakWindow;

export const normalizeBreakWindow = (breakWindow: BreakWindow | null | undefined): BreakWindow | null => {
  if (!breakWindow) return null;

  const startMinute =
    typeof breakWindow.startMinute === "number" && Number.isFinite(breakWindow.startMinute)
      ? breakWindow.startMinute
      : typeof breakWindow.inicioMin === "number" && Number.isFinite(breakWindow.inicioMin)
        ? breakWindow.inicioMin
        : null;
  const endMinute =
    typeof breakWindow.endMinute === "number" && Number.isFinite(breakWindow.endMinute)
      ? breakWindow.endMinute
      : typeof breakWindow.fimMin === "number" && Number.isFinite(breakWindow.fimMin)
        ? breakWindow.fimMin
        : null;

  if (startMinute === null || endMinute === null || endMinute <= startMinute) return null;

  const startsAt = normalizeHHMM(breakWindow.startsAt ?? breakWindow.inicioHHMM) ?? toHHMM(startMinute);
  const endsAt = normalizeHHMM(breakWindow.endsAt ?? breakWindow.fimHHMM) ?? toHHMM(endMinute);

  return {
    ...breakWindow,
    startMinute,
    endMinute,
    startsAt,
    endsAt,
    inicioMin: startMinute,
    fimMin: endMinute,
    inicioHHMM: startsAt,
    fimHHMM: endsAt,
  };
};

export const getBreakStartMinute = (breakWindow: BreakWindow | null | undefined): number | null =>
  normalizeBreakWindow(breakWindow)?.startMinute ?? null;

export const getBreakEndMinute = (breakWindow: BreakWindow | null | undefined): number | null =>
  normalizeBreakWindow(breakWindow)?.endMinute ?? null;

export const getBreakEndsAt = (breakWindow: BreakWindow | null | undefined): string | null =>
  normalizeBreakWindow(breakWindow)?.endsAt ?? null;

export const rangeOverlapsBreakWindow = (
  startMinute: number,
  endMinute: number,
  breakWindowInput: BreakWindow | null,
): boolean => {
  const breakWindow = normalizeBreakWindow(breakWindowInput);
  if (!breakWindow) return false;
  return startMinute < breakWindow.endMinute! && endMinute > breakWindow.startMinute!;
};

/** @deprecated Use `rangeOverlapsBreakWindow`. */
export const intervaloSobrepoePausa = rangeOverlapsBreakWindow;

export const isMinuteInsideBreakWindow = (
  minute: number,
  breakWindowInput: BreakWindow | null,
): boolean => {
  const breakWindow = normalizeBreakWindow(breakWindowInput);
  if (!breakWindow) return false;
  return minute >= breakWindow.startMinute! && minute < breakWindow.endMinute!;
};

/** @deprecated Use `isMinuteInsideBreakWindow`. */
export const minutoDentroDaPausa = isMinuteInsideBreakWindow;

export const getBreakConflictMessage = (
  startMinute: number,
  endMinute: number,
  breakWindow: BreakWindow | null,
): string | null => {
  if (!breakWindow) return null;
  if (!rangeOverlapsBreakWindow(startMinute, endMinute, breakWindow)) return null;
  return `This time crosses the configured break. Choose a time starting at ${getBreakEndsAt(breakWindow) ?? "the end of the break"}.`;
};

/** @deprecated Use `getBreakConflictMessage`. */
export const getMensagemConflitoPausa = getBreakConflictMessage;

// ─── Datas ────────────────────────────────────────────────────────────────────

export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fromDayKey = (k: string): Date => new Date(`${k}T12:00:00`);

export const monthStart = (d: Date): Date => {
  const n = new Date(d);
  n.setDate(1);
  n.setHours(0, 0, 0, 0);
  return n;
};

export const monthEnd = (d: Date): Date => {
  const n = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  n.setHours(23, 59, 59, 999);
  return n;
};

/**
 * Week start: 0 = Sunday, 1 = Monday.
 *
 * This is country convention, not taste. The default follows the package's
 * English-first public API, while hosts can pass `weekStartsOn` for their
 * market.
 */
export type WeekStart = 0 | 1;

export const DEFAULT_WEEK_START: WeekStart = 0;

/** Accepts any input and returns a valid week start. */
export const normalizeWeekStart = (value: unknown): WeekStart =>
  value === 1 || value === "1" ? 1 : 0;

export const weekStart = (d: Date, startsOn: WeekStart = DEFAULT_WEEK_START): Date => {
  const n = new Date(d);
  // Days to walk back. `+ 7` avoids JavaScript's negative remainder surprise.
  const back = (n.getDay() - startsOn + 7) % 7;
  n.setDate(n.getDate() - back);
  n.setHours(0, 0, 0, 0);
  return n;
};

export const weekDays = (d: Date, startsOn: WeekStart = DEFAULT_WEEK_START): Date[] => {
  const s = weekStart(d, startsOn);
  return Array.from({ length: 7 }, (_, i) => {
    const n = new Date(s);
    n.setDate(s.getDate() + i);
    return n;
  });
};

/**
 * Weekday order starting from the selected first day.
 *
 * `[1,2,3,4,5,6,0]` starts on Monday, `[0,1,2,3,4,5,6]` starts on Sunday. Values
 * are `Date.getDay()` indices, ready to index localized labels.
 */
export const weekdayOrder = (startsOn: WeekStart = DEFAULT_WEEK_START): number[] =>
  Array.from({ length: 7 }, (_, i) => (i + startsOn) % 7);

// Time zone.

/** Minutes since local midnight of an instant, read in `timeZone`. */
export const zoneMins = (iso: string, timeZone: TimeZone): number =>
  zonedMinutesOfDay(iso, timeZone);

/** Date key ("YYYY-MM-DD") of an instant, read in `timeZone`. */
export const zoneKey = (iso: string, timeZone: TimeZone): string =>
  zonedDateKey(iso, timeZone);

/** Current day key and minutes since midnight, read in `timeZone`. */
export const zoneNowParts = (
  timeZone: TimeZone,
  now?: Date
): { dayKey: string; minute: number } => {
  const parts = zonedNow(timeZone, now);
  return { dayKey: parts.dateKey, minute: parts.minute };
};


// ─── Generic helpers ──────────────────────────────────────────────────────────

export const first = <T,>(v: T | T[] | null | undefined): T | undefined =>
  Array.isArray(v) ? v[0] : (v ?? undefined);
