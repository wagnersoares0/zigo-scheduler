import {
  DEFAULT_TIME_ZONE,
  formatAgendaTime,
  normalizeAgendaLocale,
  zonedDateKey,
  zonedMinutesOfDay,
  type TimeZone,
} from "@zigoschedule/scheduler-core";
import {
  DEFAULT_WEEK_START,
  dateKey,
  getAppointmentColor,
  getAppointmentClientName,
  getAppointmentProfessionalId,
  getAppointmentStartsAt,
  getProfessionalName,
  hasValidAppointmentTiming,
  weekdayOrder,
  type Professional,
} from "@zigoschedule/scheduler-engine";

import { expandRecurringAppointments } from "./recurrence-plugin";
import { resolveLayoutColor } from "./color";
import { monthGridStart as gridStart, monthGridWindow } from "./visible-window";
import type {
  AgendaMonthCell,
  AgendaMonthEntry,
  AgendaMonthLayout,
  AgendaMonthLayoutInput,
} from "./month-types";

const DEFAULT_COLOR = "#2563EB";
const WEEKDAY_SUNDAY = new Date(2026, 7, 2, 12);

const weekdayDate = (weekday: number): Date => {
  const day = new Date(WEEKDAY_SUNDAY);
  day.setDate(WEEKDAY_SUNDAY.getDate() + weekday);
  return day;
};

const weekdayLabel = (weekday: number, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: "short" }).format(weekdayDate(weekday));

/**
 * The month as a grid of days.
 *
 * A different shape from the day and week model, and deliberately its own
 * function: a month has no time axis, no pixel-positioned cards and no hit
 * testing by minute. Forcing both into one type would give callers a model
 * where half the fields are always empty.
 */
export function buildAgendaMonthLayout(input: AgendaMonthLayoutInput): AgendaMonthLayout {
  const {
    date,
    appointments: rawAppointments,
    professionals = [],
    timeZone = DEFAULT_TIME_ZONE as TimeZone,
    locale: rawLocale,
    width,
    height,
    maxEntriesPerDay = 3,
    defaultColor = DEFAULT_COLOR,
    colorByProfessional = {},
    weekStartsOn = DEFAULT_WEEK_START,
  } = input;
  const locale = normalizeAgendaLocale(rawLocale);

  const month = date.getMonth();
  const start = gridStart(date, weekStartsOn);

  // The month grid spans six weeks, so recurrence expansion must cover all six.
  const appointments = expandRecurringAppointments(
    rawAppointments.filter(hasValidAppointmentTiming),
    timeZone,
    monthGridWindow(date, timeZone, weekStartsOn)
  );

  // Six rows always: a month can span six weeks, and a grid that changes height
  // between months makes the whole page jump.
  const weeks = 6;
  const columnWidth = Math.floor(Math.max(0, width) / 7);
  const rowHeight = Math.floor(Math.max(0, height) / weeks);

  const nameOf = (id: string | null) =>
    getProfessionalName(professionals.find((professional: Professional) => professional.id === id));

  const byDay = new Map<string, AgendaMonthEntry[]>();
  for (const appointment of appointments) {
    const startsAt = getAppointmentStartsAt(appointment);
    const key = zonedDateKey(startsAt, timeZone);
    const startMinute = zonedMinutesOfDay(startsAt, timeZone);
    const professionalId = getAppointmentProfessionalId(appointment);

    const entry: AgendaMonthEntry = {
      id: appointment.id,
      dayKey: key,
      startMinute,
      timeLabel: formatAgendaTime(startMinute, locale),
      title: getAppointmentClientName(appointment),
      professionalName: nameOf(professionalId),
      professionalId,
      status: appointment.status,
      color: resolveLayoutColor(
        professionalId ? colorByProfessional[professionalId] : undefined,
        getAppointmentColor(appointment),
        defaultColor
      ),
    };

    const list = byDay.get(key);
    if (list) list.push(entry);
    else byDay.set(key, [entry]);
  }

  for (const list of byDay.values()) {
    list.sort((a, b) => a.startMinute - b.startMinute);
  }

  const todayKey = zonedDateKey(new Date(), timeZone);
  const cells: AgendaMonthCell[] = [];

  for (let index = 0; index < weeks * 7; index++) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const key = dateKey(day);
    const all = byDay.get(key) ?? [];

    cells.push({
      dayKey: key,
      dayNumber: day.getDate(),
      column: index % 7,
      row: Math.floor(index / 7),
      left: (index % 7) * columnWidth,
      top: Math.floor(index / 7) * rowHeight,
      width: columnWidth,
      height: rowHeight,
      isCurrentMonth: day.getMonth() === month,
      isToday: key === todayKey,
      entries: all.slice(0, maxEntriesPerDay),
      hiddenCount: Math.max(0, all.length - maxEntriesPerDay),
      totalCount: all.length,
    });
  }

  return {
    weekdayLabels: weekdayOrder(weekStartsOn).map((index) => weekdayLabel(index, locale)),
    cells,
    columnWidth,
    rowHeight,
    totalWidth: columnWidth * 7,
    totalHeight: rowHeight * weeks,
    monthLabel: date.toLocaleDateString(locale, { month: "long", year: "numeric" }),
  };
}
