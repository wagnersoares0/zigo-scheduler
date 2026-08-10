import {
  DEFAULT_TIME_ZONE,
  formatAgendaTimeRange,
  getAgendaMessages,
  normalizeAgendaLocale,
  normalizeAgendaGranularity,
  normalizeAgendaWeekVisualScale,
  zonedDateKey,
  zonedMinutesOfDay,
  type TimeZone,
} from "@zigoschedule/scheduler-core";
import { visibleDaysWindow } from "./visible-window";
import {
  agendaMinuteToPx,
  buildOverlapLayout,
  calculateAgendaDynamicSlotHeight,
  dateKey,
  fromDayKey,
  getAgendaVisualEndMinute,
  getAppointmentBufferAfterMinutes,
  getAppointmentBufferBeforeMinutes,
  getAppointmentClientName,
  getAppointmentColor,
  getAppointmentDurationMinutes,
  getAppointmentPaymentStatus,
  getAppointmentProfessionalId,
  getAppointmentServiceLabel,
  getAppointmentStartsAt,
  getBlockDate,
  getBlockEndTime,
  getBlockProfessionalId,
  getBlockReason,
  getBlockStartTime,
  getEffectiveBusinessHoursForDay,
  getGridBusinessHoursRange,
  getProfessionalName,
  getProfessionalBusinessHoursRange,
  getProfessionalBreakWindowForDay,
  toHHMM,
  toMin,
  weekDays,
  DEFAULT_WEEK_START,
  getBreakEndMinute,
  getBreakStartMinute,
  type Appointment,
  type Block,
  type Professional,
} from "@zigoschedule/scheduler-engine";

import { expandRecurringAppointments } from "./recurrence-plugin";
import { resolveLayoutColor } from "./color";
import type {
  AgendaLayout,
  AgendaLayoutColumn,
  AgendaLayoutEvent,
  AgendaLayoutHit,
  AgendaLayoutInput,
  AgendaLayoutRow,
  AgendaLayoutUnavailable,
} from "./types";

const DEFAULT_HOURS = { opensAt: "08:00", closesAt: "18:00" };
const DEFAULT_AXIS_WIDTH = 54;
const DEFAULT_COLUMN_MIN_WIDTH = 180;
const DEFAULT_ROW_HEIGHT = 32;
const DEFAULT_COLOR = "#2563EB";

const shortDate = (day: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(day);

const weekdayLabel = (day: Date, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day);

const isPaidStatus = (value: string | null | undefined): boolean =>
  ["pago", "paid", "confirmado", "confirmed"].includes((value ?? "").trim().toLowerCase());

/**
 * Turns appointments into a drawable calendar.
 *
 * The output is plain data on purpose: a consumer in Vue, Svelte, Alpine or
 * hand-written JavaScript loops over `columns`, `rows` and `events` and emits
 * divs. Nothing in here needs a framework, and nothing in here reaches for the
 * DOM: the caller supplies the box it has (`width`, `height`) and gets back
 * coordinates inside it.
 */
export function buildAgendaLayout(input: AgendaLayoutInput): AgendaLayout {
  const {
    date,
    view = "week",
    appointments: rawAppointments,
    blocks = [],
    professionals,
    businessHours = null,
    defaultHours = DEFAULT_HOURS,
    lunchBreak = null,
    timeZone = DEFAULT_TIME_ZONE as TimeZone,
    locale: rawLocale,
    messages: customMessages,
    width,
    height,
    axisWidth = DEFAULT_AXIS_WIDTH,
    columnMinWidth = DEFAULT_COLUMN_MIN_WIDTH,
    defaultColor = DEFAULT_COLOR,
    colorByProfessional = {},
    weekStartsOn = DEFAULT_WEEK_START,
  } = input;
  const locale = normalizeAgendaLocale(rawLocale);
  const messages = getAgendaMessages(locale, customMessages);

  // The week is deliberately coarser: a day column belongs to one professional
  // and takes fine steps well, a week column has to fit seven days side by side.
  const stepMinutes =
    view === "week"
      ? normalizeAgendaWeekVisualScale(input.weekScaleMinutes)
      : normalizeAgendaGranularity(input.slotMinutes);

  const days = view === "week" ? weekDays(date, weekStartsOn) : [date];

  // Repeating appointments become their occurrences before anything is
  // positioned. Without the recurrence plugin this is the identity function.
  const appointments = expandRecurringAppointments(
    rawAppointments,
    timeZone,
    visibleDaysWindow(days, timeZone)
  );

  const hoursForDay = (dayKey: string) =>
    getEffectiveBusinessHoursForDay({
      dayKey,
      businessHours,
      defaultHours,
    });

  // The grid spans the union of every visible day, so a Saturday that opens
  // later does not crop the rest of the week.
  const range = getGridBusinessHoursRange({
    days,
    selectedDayBusinessHours: hoursForDay(dateKey(date)),
    getBusinessHoursForDay: hoursForDay,
  });

  const startMinute = range.startMinute;
  const endMinute = range.endMinute;

  // ── Rows ──────────────────────────────────────────────────────────────────
  const minutes: number[] = [];
  for (let minute = startMinute; minute < endMinute; minute += stepMinutes) {
    minutes.push(minute);
  }

  const rowHeight = calculateAgendaDynamicSlotHeight({
    baseSlotHeight: input.rowHeight && input.rowHeight > 0 ? input.rowHeight : DEFAULT_ROW_HEIGHT,
    availableHeight: height,
    slotCount: minutes.length,
  });

  const totalHeight = Math.max(1, minutes.length * rowHeight);
  const visualEndMinute = getAgendaVisualEndMinute({
    startMinute,
    endMinute,
    snapMinutes: stepMinutes,
  });

  const minuteToY = (minute: number) =>
    agendaMinuteToPx({ minute, startMinute, visualEndMinute, height: totalHeight });

  const yToMinute = (y: number) => {
    if (totalHeight <= 0) return startMinute;
    const clamped = Math.max(0, Math.min(totalHeight, y));
    const raw = startMinute + (clamped / totalHeight) * (visualEndMinute - startMinute);
    const snapped = startMinute + Math.floor((raw - startMinute) / stepMinutes) * stepMinutes;
    return Math.max(startMinute, Math.min(visualEndMinute - stepMinutes, snapped));
  };

  const rows: AgendaLayoutRow[] = minutes.map((minute) => {
    const top = minuteToY(minute);
    const nextTop = minuteToY(Math.min(visualEndMinute, minute + stepMinutes));
    return {
      minute,
      label: toHHMM(minute),
      top,
      height: Math.max(1, nextTop - top),
      isMajor: minute % 60 === 0,
    };
  });

  // Columns.
  // Day view gives each professional a column. Week view gives each day one,
  // and every professional shares it, which is why the week needs a wider
  // column: colliding cards split whatever room it has.
  const isDayView = days.length === 1;
  const useResourceColumns = isDayView && professionals.length > 0;

  type ColumnSeed = { day: Date; professional: Professional | null };
  const seeds: ColumnSeed[] = useResourceColumns
    ? professionals.map((professional) => ({ day: days[0], professional }))
    : days.map((day) => ({ day, professional: null }));

  const available = Math.max(0, width - axisWidth);
  const columnWidth = Math.max(columnMinWidth, Math.floor(available / Math.max(1, seeds.length)));
  const totalWidth = axisWidth + columnWidth * seeds.length;

  const columns: AgendaLayoutColumn[] = seeds.map((seed, index) => {
    const dayKey = dateKey(seed.day);
    const dayHours = hoursForDay(dayKey);
    const professionalHours = seed.professional
      ? getProfessionalBusinessHoursRange(dayHours, seed.professional, dayKey)
      : dayHours;
    const scoped = professionalHours ?? { startMinute: dayHours.startMinute, endMinute: dayHours.startMinute };
    const isClosed = Boolean(dayHours.isClosed || professionalHours === null);

    return {
      key: seed.professional ? `${dayKey}-${seed.professional.id}` : dayKey,
      dayKey,
      professionalId: seed.professional?.id ?? null,
      label: seed.professional ? getProfessionalName(seed.professional) : weekdayLabel(seed.day, locale),
      sublabel: shortDate(seed.day, locale),
      left: axisWidth + index * columnWidth,
      width: columnWidth,
      isClosed,
      closedLabel: isClosed ? messages.closed : null,
      closedMessage: isClosed ? messages.closed : null,
      openStartMinute: scoped.startMinute,
      openEndMinute: scoped.endMinute,
    };
  });

  const columnByKey = new Map(columns.map((column) => [column.key, column]));

  /** Which column an appointment belongs to, or null when it is out of view. */
  const columnFor = (dayKey: string, professionalId: string | null) => {
    if (useResourceColumns) {
      if (!professionalId) return null;
      return columnByKey.get(`${dayKey}-${professionalId}`) ?? null;
    }
    return columnByKey.get(dayKey) ?? null;
  };

  const professionalName = (id: string | null) =>
    getProfessionalName(professionals.find((professional) => professional.id === id));

  // ── Events ────────────────────────────────────────────────────────────────
  type Placed = {
    id: string;
    kind: "appointment" | "block";
    column: AgendaLayoutColumn;
    start: number;
    /** Real end minute. Labels and consumers read this value. */
    end: number;
    bufferStart: number;
    bufferEnd: number;
    /**
     * End minute used for drawing, never smaller than one grid row.
     *
     * In a week with 60-minute rows, a 30-minute appointment would otherwise be
     * half a row tall and hard to read. The floor belongs only to geometry:
     * leaking it into `endMinute` or `timeLabel` would make a short appointment
     * look one hour long.
     */
    visualEnd: number;
    raw: Appointment | Block;
  };

  const placed: Placed[] = [];

  for (const appointment of appointments) {
    const startsAt = getAppointmentStartsAt(appointment);
    const dayKey = zonedDateKey(startsAt, timeZone);
    const appointmentProfessionalId = getAppointmentProfessionalId(appointment);
    const column = columnFor(dayKey, appointmentProfessionalId);
    if (!column) continue;

    const start = zonedMinutesOfDay(startsAt, timeZone);
    const end = start + getAppointmentDurationMinutes(appointment, stepMinutes);
    const bufferStart = start - getAppointmentBufferBeforeMinutes(appointment);
    const bufferEnd = end + getAppointmentBufferAfterMinutes(appointment);
    if (end <= startMinute || start >= endMinute) continue;

    placed.push({
      id: appointment.id,
      kind: "appointment",
      column,
      start,
      end,
      bufferStart,
      bufferEnd,
      visualEnd: Math.max(end, start + stepMinutes),
      raw: appointment,
    });
  }

  for (const block of blocks) {
    // A block without a professional belongs to the whole business.
    const blockDate = getBlockDate(block);
    const target = getBlockProfessionalId(block);
    const candidates = useResourceColumns && !target ? columns : [columnFor(blockDate, target)];
    for (const column of candidates) {
      if (!column || column.dayKey !== blockDate) continue;
      const start = toMin(getBlockStartTime(block));
      const end = toMin(getBlockEndTime(block));
      if (end <= startMinute || start >= endMinute) continue;
      placed.push({
        id: `${block.id}-${column.key}`,
        kind: "block",
        column,
        start,
        end,
        bufferStart: start,
        bufferEnd: end,
        visualEnd: Math.max(end, start + stepMinutes),
        raw: block,
      });
    }
  }

  const placedByColumn = new Map<string, Placed[]>();
  for (const item of placed) {
    const key = item.column.key;
    const columnItems = placedByColumn.get(key);
    if (columnItems) columnItems.push(item);
    else placedByColumn.set(key, [item]);
  }

  const events: AgendaLayoutEvent[] = [];

  for (const column of columns) {
    const inColumn = placedByColumn.get(column.key) ?? [];
    const overlap = buildOverlapLayout(
      inColumn.map((item) => ({ id: item.id, start: item.bufferStart, end: item.bufferEnd }))
    );

    for (const item of inColumn) {
      const place = overlap.get(item.id) ?? { col: 0, cols: 1 };
      const slotWidth = column.width / Math.max(1, place.cols);
      const top = minuteToY(item.start);
      const bottom = minuteToY(Math.min(item.visualEnd, visualEndMinute));
      const isAppointment = item.kind === "appointment";
      const appointment = isAppointment ? (item.raw as Appointment) : null;
      const block = isAppointment ? null : (item.raw as Block);
      const profId = appointment ? getAppointmentProfessionalId(appointment) : column.professionalId ?? null;
      const bufferBeforeMinutes = appointment ? getAppointmentBufferBeforeMinutes(appointment) : 0;
      const bufferAfterMinutes = appointment ? getAppointmentBufferAfterMinutes(appointment) : 0;

      events.push({
        id: item.id,
        kind: item.kind,
        columnKey: column.key,
        dayKey: column.dayKey,
        professionalId: profId,
        top,
        height: Math.max(1, bottom - top),
        left: column.left + place.col * slotWidth,
        width: slotWidth,
        startMinute: item.start,
        endMinute: item.end,
        bufferBeforeMinutes,
        bufferAfterMinutes,
        bufferStartMinute: item.bufferStart,
        bufferEndMinute: item.bufferEnd,
        timeLabel: formatAgendaTimeRange(item.start, item.end, locale),
        title: appointment ? getAppointmentClientName(appointment) : getBlockReason(block) || messages.block,
        subtitle: appointment ? getAppointmentServiceLabel(appointment) : "",
        professionalName: professionalName(profId),
        status: appointment?.status ?? "block",
        isPaid: isPaidStatus(getAppointmentPaymentStatus(appointment)),
        color: resolveLayoutColor(
          profId ? colorByProfessional[profId] : undefined,
          appointment ? getAppointmentColor(appointment) : null,
          defaultColor
        ),
        overlapIndex: place.col,
        overlapCount: Math.max(1, place.cols),
      });
    }
  }

  // ── Unavailable stretches ─────────────────────────────────────────────────
  const unavailable: AgendaLayoutUnavailable[] = [];

  const addUnavailable = (
    column: AgendaLayoutColumn,
    reason: AgendaLayoutUnavailable["reason"],
    label: string,
    from: number,
    to: number
  ) => {
    const start = Math.max(startMinute, from);
    const end = Math.min(visualEndMinute, to);
    if (end <= start) return;
    const top = minuteToY(start);
    unavailable.push({
      columnKey: column.key,
      reason,
      label,
      top,
      height: Math.max(1, minuteToY(end) - top),
      startMinute: start,
      endMinute: end,
    });
  };

  for (const column of columns) {
    if (column.isClosed) {
      addUnavailable(column, "closed", column.closedMessage ?? messages.closed, startMinute, visualEndMinute);
      continue;
    }
    if (column.openStartMinute > startMinute) {
      addUnavailable(
        column,
        "before-open",
        messages.outsideBusinessHours,
        startMinute,
        column.openStartMinute
      );
    }
    if (column.openEndMinute < visualEndMinute) {
      addUnavailable(
        column,
        "after-close",
        messages.outsideBusinessHours,
        column.openEndMinute,
        visualEndMinute
      );
    }
    const columnProfessional = column.professionalId
      ? professionals.find((professional) => professional.id === column.professionalId)
      : null;
    const columnBreak = columnProfessional
      ? getProfessionalBreakWindowForDay({ lunchBreak, professional: columnProfessional, dayKey: column.dayKey })
      : lunchBreak;
    if (columnBreak) {
      const lunchStart = getBreakStartMinute(columnBreak);
      const lunchEnd = getBreakEndMinute(columnBreak);
      if (lunchStart !== null && lunchEnd !== null) {
        addUnavailable(column, "lunch", messages.lunchBreak, lunchStart, lunchEnd);
      }
    }
  }

  // ── Hit testing ───────────────────────────────────────────────────────────
  const hitTest = (x: number, y: number): AgendaLayoutHit | null => {
    if (x < axisWidth || y < 0 || y > totalHeight) return null;
    const column = columns.find((candidate) => x >= candidate.left && x < candidate.left + candidate.width);
    if (!column) return null;
    return {
      columnKey: column.key,
      dayKey: column.dayKey,
      professionalId: column.professionalId,
      minute: yToMinute(y),
    };
  };

  return {
    columns,
    rows,
    events,
    unavailable,
    stepMinutes,
    rowHeight,
    startMinute,
    endMinute,
    axisWidth,
    totalWidth,
    totalHeight,
    hitTest,
    minuteToY,
    yToMinute,
  };
}

/** Re-exported so a consumer can build a day key without pulling in the engine. */
export { dateKey, fromDayKey, toHHMM };
