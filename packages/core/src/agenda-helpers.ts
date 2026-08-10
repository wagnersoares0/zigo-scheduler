import { DEFAULT_TIME_ZONE, zonedMinutesOfDay, type TimeZone } from "./timezone";

/**
 * Helpers for configurable schedule granularity.
 *
 * They replace hard-coded 30 minute calculations so each tenant can choose its
 * own slot size.
 */

/**
 * Generates time slots from opening, closing and granularity.
 *
 * @param openingTime - Opening time, "HH:MM"
 * @param closingTime - Closing time, "HH:MM"
 * @param granularity - Minutes between slots
 * @returns Time labels as "HH:MM"
 *
 * @example
 * generateTimeSlots("08:00", "12:00", 30)
 * // ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]
 */
export function generateTimeSlots(
  openingTime: string,
  closingTime: string,
  granularity: number = 30
): string[] {
  const [hA, mA] = openingTime.split(":").map(Number);
  const [hF, mF] = closingTime.split(":").map(Number);
  const slots: string[] = [];
  let cursor = hA * 60 + mA;
  const end = hF * 60 + mF;

  while (cursor < end) {
    const h = Math.floor(cursor / 60);
    const m = cursor % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    cursor += granularity;
  }

  return slots;
}

/**
 * Rounds a duration up to the next granularity multiple.
 *
 * @example
 * roundSlot(45, 30) // 60
 * roundSlot(45, 15) // 45
 * roundSlot(20, 15) // 30
 */
export function roundSlot(
  minutes: number,
  granularity: number = 30
): number {
  return Math.ceil(minutes / granularity) * granularity;
}

/** @deprecated Use `roundSlot`. */
export const arredondarSlot = roundSlot;

/**
 * Counts how many slots an appointment or block occupies.
 *
 * @example
 * countSlots(60, 30) // 2
 * countSlots(45, 15) // 3
 * countSlots(20, 30) // 1
 */
export function countSlots(
  duration: number,
  granularity: number = 30
): number {
  return Math.max(1, Math.ceil(duration / granularity));
}

/** @deprecated Use `countSlots`. */
export const calcularNumSlots = countSlots;

type ExistingAppointmentSlot = {
  startsAt?: string;
  data_hora?: string;
  durationMinutes?: number;
  duracao_minutos?: number;
};

export type AvailableSlot = {
  time: string;
  free: boolean;
  /** @deprecated Use `free`. */
  livre: boolean;
};

/**
 * Calculates available slots considering existing appointments and breaks.
 */
export function calculateAvailableSlots(
  openingTime: string,
  closingTime: string,
  duration: number,
  appointments: ExistingAppointmentSlot[],
  granularity: number = 30,
  breakStart?: string | null,
  breakEnd?: string | null,
  timeZone: TimeZone = DEFAULT_TIME_ZONE
): AvailableSlot[] {
  const [hA, mA] = openingTime.split(":").map(Number);
  const [hF, mF] = closingTime.split(":").map(Number);
  const endMinute = hF * 60 + mF;

  const breakStartMinute = breakStart
    ? (() => {
        const [h, m] = breakStart.split(":").map(Number);
        return h * 60 + m;
      })()
    : null;
  const breakEndMinute = breakEnd
    ? (() => {
        const [h, m] = breakEnd.split(":").map(Number);
        return h * 60 + m;
      })()
    : null;

  const slots: AvailableSlot[] = [];
  let cursor = hA * 60 + mA;

  // Read the stored instant in the business time zone.
  const instantToLocalMinutes = (startsAt: string): number =>
    zonedMinutesOfDay(startsAt, timeZone);

  while (cursor + duration <= endMinute) {
    const h = Math.floor(cursor / 60)
      .toString()
      .padStart(2, "0");
    const m = (cursor % 60).toString().padStart(2, "0");

    // Existing appointment conflict.
    const hasConflict = appointments.some((ag) => {
      const startsAt = ag.startsAt ?? ag.data_hora;
      if (!startsAt) return false;
      const aStart = instantToLocalMinutes(startsAt);
      const agDur = roundSlot(ag.durationMinutes ?? ag.duracao_minutos ?? granularity, granularity);
      const aEnd = aStart + agDur;
      return cursor < aEnd && cursor + duration > aStart;
    });

    // Break overlap.
    const inBreak =
      breakStartMinute !== null &&
      breakEndMinute !== null &&
      cursor < breakEndMinute &&
      cursor + duration > breakStartMinute;

    const free = !hasConflict && !inBreak;
    slots.push({ time: `${h}:${m}`, free, livre: free });
    cursor += granularity;
  }

  return slots;
}

/** @deprecated Use `calculateAvailableSlots`. */
export const calcularSlotsDisponiveis = calculateAvailableSlots;
