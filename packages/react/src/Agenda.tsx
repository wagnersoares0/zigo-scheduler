"use client";

import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import { AgendaGrid } from "./components/grid/AgendaGrid";
import { AgendaMonthView } from "./components/views/AgendaMonthView";
import {
  AppointmentDetailsModal,
  type AppointmentDetailsAction,
  type AppointmentDetailsActionEvent,
  type AppointmentDetailsMode,
} from "./components/details/AppointmentDetailsModal";
import { AgendaConfigProvider } from "./config/AgendaConfigContext";
import { createAgendaOptions } from "@zigoschedule/scheduler-engine";
import {
  normalizeAgendaGranularity,
  normalizeAgendaWeekVisualScale,
} from "@zigoschedule/scheduler-core";
import {
  DEFAULT_TIME_ZONE,
  resolveAppointmentColor,
  getAgendaMessages,
  zonedMinutesOfDay,
  zonedNow,
  type AgendaMessagesInput,
  type TimeZone,
} from "@zigoschedule/scheduler-core";
import {
  getEffectiveBusinessHoursForDay,
  getAppointmentBufferAfterMinutes,
  getAppointmentBufferBeforeMinutes,
  getAppointmentDurationMinutes,
  getAppointmentColor,
  getAppointmentColorIsCustom,
  getAppointmentProfessionalId,
  getAppointmentStartsAt,
  getGridBusinessHoursRange,
  getProfessionalBreakWindowForDay,
  getProfessionalBusinessHoursRange,
  isCanceledStatus,
} from "@zigoschedule/scheduler-engine";
import { agendaMinuteToPx, getAgendaVisualEndMinute } from "@zigoschedule/scheduler-engine";
import { minuteFromAgendaGridY } from "@zigoschedule/scheduler-engine";
import { DEFAULT_WEEK_START, dateKey, weekDays } from "@zigoschedule/scheduler-engine";
import { groupAppointmentsByDay, groupBlocksByDay } from "@zigoschedule/scheduler-engine";
import {
  expandRecurringAppointments,
  monthGridWindow,
  visibleDaysWindow,
} from "@zigoschedule/scheduler-layout";
import type {
  Appointment,
  AgendaGridSelectionDragRef,
  Block,
  DaySelection,
  BusinessHoursDefaults,
  BusinessHours,
  BreakWindow,
  Professional,
  WeekStart,
} from "@zigoschedule/scheduler-engine";
import {
  DEFAULT_APPOINTMENT_COLOR,
  type AppointmentColor,
  type AppointmentColorMode,
} from "@zigoschedule/scheduler-core";

/**
 * The calendar, assembled.
 *
 * `AgendaGrid` underneath takes forty-odd props because it deliberately knows
 * nothing: it does not decide what a slot is, where a card lands, or what
 * "closed" means. That is the right shape for the grid and the wrong shape for
 * a public API, so this component owns the derivation and exposes the handful
 * of things a caller actually has an opinion about.
 *
 * It holds no data of its own. Appointments come in as a prop and changes go
 * out as callbacks - persistence belongs to the host application.
 */
export type AgendaProps = {
  /** Day being shown. In week mode this anchors the week. */
  date: Date;
  /** Appointments to render. The component never mutates this array. */
  appointments: Appointment[];
  /** Time blocks (holidays, maintenance, personal time). */
  blocks?: Block[];
  /** Columns. One per professional, room or chair. */
  professionals: Professional[];
  /** Opening hours per weekday. Missing days fall back to `defaultHours`. */
  businessHours?: BusinessHours | null;
  /** Fallback opening hours for days absent from `businessHours`. */
  defaultHours?: BusinessHoursDefaults;
  /** Shared lunch break. A professional's own break overrides this. */
  lunchBreak?: BreakWindow | null;
  /** IANA zone the business runs in, e.g. "America/Manaus". */
  timeZone?: TimeZone;
  /** Built-in UI language, e.g. "en-US", "es-ES", "ja-JP", "ar-SA", "hi-IN". */
  locale?: string;
  /** Optional overrides for built-in labels and aria text. */
  messages?: AgendaMessagesInput;
  /** Which view to render. */
  view?: "day" | "week" | "month";
  /**
   * Grid resolution of the day view, in minutes. One of 5, 10, 15, 20, 30.
   * Anything else falls back to 30.
   */
  slotMinutes?: number;
  /**
   * Row spacing of the week view, in minutes: 30 or 60.
   *
   * The week is deliberately coarser than the day. A day column belongs to one
   * professional and benefits from fine steps; a week column has to fit seven
   * days side by side, and drawing a line every five minutes turns it into
   * noise. This is why the library keeps two separate scales.
   */
  weekScaleMinutes?: number;
  /**
   * Week start: 0 = Sunday, 1 = Monday. Default follows the package default.
   */
  weekStartsOn?: WeekStart;
  /**
   * "default" paints every card with `defaultColor`. "appointment" lets each
   * appointment carry its own color. Legacy values "padrao" and "por_cliente"
   * are still accepted.
   */
  colorMode?: AppointmentColorMode;
  /** Card color used when the appointment does not carry one. Hex. */
  defaultColor?: AppointmentColor;
  /**
   * Minimum width of a column, in pixels. Raise it when several professionals
   * share a day column and their cards end up too narrow to read.
   */
  columnMinWidth?: number;
  /**
   * Minimum height of one slot row, in pixels. Default 32. Rows stretch to fill
   * the viewport when the day is short; raise this to keep the grid dense and
   * scrollable instead of stretched.
   */
  rowHeight?: number;
  /** Set false to render read-only: no dragging, no resizing. */
  editable?: boolean;
  /**
   * By default past slots cannot be selected. Set false when that guard is not
   * wanted, such as in a demo where every day has to stay interactive.
   */
  blockPastSlots?: boolean;

  /** Fired after a card is dragged to a new time or column. */
  onMove?: (change: {
    appointmentId: string;
    startsAt: string;
    professionalId: string | null;
  }) => void | Promise<void>;
  /** Fired after a card is resized. */
  onResize?: (change: {
    appointmentId: string;
    durationMinutes: number;
    startsAt?: string;
  }) => void | Promise<void>;
  /** Fired when an appointment is clicked. */
  onSelectAppointment?: (appointment: Appointment, dayKey: string) => void;
  /**
   * Appointment click behavior.
   *
   * "auto" opens the built-in modal when no `onSelectAppointment` is supplied,
   * and preserves callback-only behavior when the host already handles clicks.
   * Use "modal" to always show the built-in modal, or "callback" to keep full
   * ownership in your app.
   */
  detailsMode?: AppointmentDetailsMode;
  /** Actions shown in the built-in details modal. Default: all secondary actions plus charge. */
  detailsActions?: readonly AppointmentDetailsAction[];
  /** Fired when the built-in modal action buttons are clicked. Persistence still belongs to the host. */
  onDetailsAction?: (event: AppointmentDetailsActionEvent) => void | Promise<void>;
  /**
   * Fired when the grid refuses a selection: closed day, lunch break, slot
   * already taken. Without it the calendar looks broken when it is in fact
   * doing its job.
   */
  onBlocked?: (message: string) => void;
  /** Fired when an empty range is selected: the "new appointment" gesture. */
  onSelectRange?: (range: {
    dayKey: string;
    startMinute: number;
    endMinute: number;
    professionalId: string | null;
  }) => void;
};

const NOOP = () => {};
const NO_BLOCKS: Block[] = [];
const DEFAULT_HOURS = { opensAt: "08:00", closesAt: "18:00" };

export const Agenda = memo(function Agenda({
  date,
  appointments,
  blocks = NO_BLOCKS,
  professionals,
  businessHours = null,
  defaultHours = DEFAULT_HOURS,
  lunchBreak = null,
  timeZone = DEFAULT_TIME_ZONE,
  locale,
  messages,
  view = "week",
  slotMinutes = 30,
  weekScaleMinutes = 30,
  weekStartsOn = DEFAULT_WEEK_START,
  editable = true,
  rowHeight,
  colorMode = "appointment",
  defaultColor = DEFAULT_APPOINTMENT_COLOR,
  columnMinWidth,
  blockPastSlots = true,
  detailsMode = "auto",
  detailsActions,
  onMove,
  onResize,
  onSelectAppointment,
  onDetailsAction,
  onBlocked,
  onSelectRange,
}: AgendaProps) {
  const days = useMemo(
    () => (view === "week" ? weekDays(date, weekStartsOn) : [date]),
    [view, date, weekStartsOn]
  );
  const agendaMessages = useMemo(
    () => getAgendaMessages(locale, messages),
    [locale, messages],
  );

  // The week uses its own, coarser scale. Everything downstream - slots, snap,
  // hit testing, pixel conversion - has to agree on this single number, or the
  // axis and the cards drift apart.
  const step = useMemo(
    () =>
      view === "week"
        ? normalizeAgendaWeekVisualScale(weekScaleMinutes)
        : normalizeAgendaGranularity(slotMinutes),
    [view, weekScaleMinutes, slotMinutes]
  );

  const hoursForDay = useCallback(
    (dayKey: string) => {
      const hours = getEffectiveBusinessHoursForDay({
        dayKey,
        businessHours,
        defaultHours,
      });
      return {
        ...hours,
        closedMessage: hours.isClosed ? agendaMessages.closedDay : hours.closedMessage,
      };
    },
    [agendaMessages.closedDay, businessHours, defaultHours]
  );

  const selectedDayHours = useMemo(() => hoursForDay(dateKey(date)), [hoursForDay, date]);

  // The grid spans the union of every visible day, so a Saturday that opens
  // later does not crop the rest of the week.
  const range = useMemo(
    () =>
      getGridBusinessHoursRange({
        days,
        selectedDayBusinessHours: selectedDayHours,
        getBusinessHoursForDay: hoursForDay,
      }),
    [days, selectedDayHours, hoursForDay]
  );

  const slots = useMemo(() => {
    const list: number[] = [];
    for (let minute = range.startMinute; minute < range.endMinute; minute += step) {
      list.push(minute);
    }
    return list;
  }, [range.startMinute, range.endMinute, step]);

  /** Slots on the hour get the heavier rule and the printed label. */
  const majors = useMemo(
    () => new Set(slots.filter((minute) => minute % 60 === 0)),
    [slots]
  );

  /**
   * The window recurrence has to fill, in real instants.
   *
   * Two shapes because the month is not a longer week: day and week cover the
   * columns on screen, the month covers all six rows of its grid, including the
   * days it borrows from the neighbouring months.
   */
  const recurrenceWindow = useMemo(
    () =>
      view === "month"
        ? monthGridWindow(date, timeZone, weekStartsOn)
        : visibleDaysWindow(days, timeZone),
    [view, date, days, timeZone, weekStartsOn]
  );

  /**
   * Repeating appointments become their occurrences before anything is grouped.
   *
   * This is the same plugin socket the web component uses: importing
   * `@zigoschedule/scheduler-recurrence` anywhere in the app lights it up here too.
   * Without that import this is the identity function, and an appointment
   * carrying a rule simply shows once, on its own date.
   */
  const expandedAppointments = useMemo(
    () => expandRecurringAppointments(appointments, timeZone, recurrenceWindow),
    [appointments, timeZone, recurrenceWindow]
  );

  const agsByDay = useMemo(
    () => groupAppointmentsByDay(expandedAppointments, { timeZone }),
    [expandedAppointments, timeZone]
  );
  const bloqsByDay = useMemo(() => groupBlocksByDay(blocks), [blocks]);

  const professionalHoursForDay = useCallback(
    (dayKey: string, professionalId: string | null) => {
      const dayHours = hoursForDay(dayKey);
      const professional = professionals.find((prof) => prof.id === professionalId);
      if (!professional) return dayHours;
      // A professional with no schedule of their own follows the business.
      return getProfessionalBusinessHoursRange(dayHours, professional, dayKey) ?? dayHours;
    },
    [hoursForDay, professionals]
  );

  const pauseForDay = useCallback(
    (dayKey: string, professionalId: string | null): BreakWindow | null => {
      const professional = professionals.find((prof) => prof.id === professionalId);
      if (!professional) return lunchBreak;
      return (
        getProfessionalBreakWindowForDay({
          lunchBreak,
          professional,
          dayKey,
        }) ?? lunchBreak
      );
    },
    [professionals, lunchBreak]
  );

  const visualEndMinute = useMemo(
    () =>
      getAgendaVisualEndMinute({
        startMinute: range.startMinute,
        endMinute: range.endMinute,
        snapMinutes: step,
      }),
    [range.startMinute, range.endMinute, step]
  );

  const minuteToPx = useCallback(
    (minute: number, height: number) =>
      agendaMinuteToPx({ minute, startMinute: range.startMinute, visualEndMinute, height }),
    [range.startMinute, visualEndMinute]
  );

  const minuteFromY = useCallback(
    (y: number, height: number) =>
      minuteFromAgendaGridY({
        y,
        height,
        startMinute: range.startMinute,
        endMinute: visualEndMinute,
        snapMinutes: step,
      }),
    [range.startMinute, visualEndMinute, step]
  );

  // Refs the grid writes into while dragging or selecting. They are plumbing:
  // the grid owns the interaction, this component only has to hold the boxes.
  const dayColRefs = useRef(new Map<string, HTMLDivElement>());
  // The grid reads and writes this while the pointer is down. It has to start as
  // a fully-shaped object: an empty one leaves `active` and `pointerId`
  // undefined and the drag-to-select gesture never arms.
  const dayDragRef = useRef<AgendaGridSelectionDragRef>({
    active: false,
    pointerId: -1,
    colKey: "",
    dayKey: "",
    profId: null,
    originY: 0,
    originClientX: 0,
    originClientY: 0,
    scrollEl: null,
    lastClientX: 0,
    lastClientY: 0,
    selectionStarted: false,
  });
  const pendingSelectionRef = useRef<DaySelection | null>(null);
  const selectionOverlayRef = useRef<HTMLDivElement | null>(null);

  const [daySelection, setDaySelection] = useState<DaySelection | null>(null);
  const [detailsAppointment, setDetailsAppointment] = useState<Appointment | null>(null);

  const useBuiltInDetails =
    detailsMode === "modal" || (detailsMode === "auto" && !onSelectAppointment);

  const closeSelection = useCallback(() => {
    setDaySelection(null);
    pendingSelectionRef.current = null;
  }, []);

  const commitSelection = useCallback(
    (selection: DaySelection | null) => {
      setDaySelection(selection);
      if (selection && onSelectRange) {
        onSelectRange({
          dayKey: selection.dayKey,
          startMinute: selection.start,
          endMinute: selection.end,
          professionalId: selection.profId ?? null,
        });
      }
    },
    [onSelectRange]
  );

  const now = useMemo(() => zonedNow(timeZone), [timeZone]);

  const isBeforeToday = useCallback(
    (dayKey: string) => blockPastSlots && dayKey < now.dateKey,
    [blockPastSlots, now.dateKey]
  );

  const isSlotInPast = useCallback(
    (dayKey: string, minute: number) =>
      blockPastSlots &&
      (dayKey < now.dateKey || (dayKey === now.dateKey && minute < now.minute)),
    [blockPastSlots, now.dateKey, now.minute]
  );

  const slotTaken = useCallback(
    (dayKey: string, profId: string | null, minute: number) =>
      (agsByDay.get(dayKey) ?? []).some((ag) => {
        if (profId && getAppointmentProfessionalId(ag) !== profId) return false;
        if (isCanceledStatus(ag.status)) return false;
        // Read the stored instant in the business's own zone, not the server's.
        const startMinute = zonedMinutesOfDay(getAppointmentStartsAt(ag), timeZone);
        const busyStart = startMinute - getAppointmentBufferBeforeMinutes(ag);
        const busyEnd = startMinute + getAppointmentDurationMinutes(ag, step) + getAppointmentBufferAfterMinutes(ag);
        return minute >= busyStart && minute < busyEnd;
      }),
    [agsByDay, step, timeZone]
  );

  const handleDrop = useCallback(
    async (appointmentId: string, startsAt: string, professionalId: string | null) => {
      await onMove?.({ appointmentId, startsAt, professionalId });
    },
    [onMove]
  );

  const handleResize = useCallback(
    async (
      appointmentId: string,
      result: { direction: "start" | "end"; duracaoMinutos: number; novaDataHora?: string }
    ) => {
      await onResize?.({
        appointmentId,
        durationMinutes: result.duracaoMinutos,
        startsAt: result.novaDataHora,
      });
    },
    [onResize]
  );

  const openAppointmentDetails = useCallback(
    (appointment: Appointment, dayKey: string) => {
      if (useBuiltInDetails) setDetailsAppointment(appointment);
      onSelectAppointment?.(appointment, dayKey);
    },
    [onSelectAppointment, useBuiltInDetails]
  );

  const detailsAccentColor = useMemo(
    () =>
      detailsAppointment
        ? resolveAppointmentColor({
            mode: colorMode,
            defaultColor,
            appointmentColor: getAppointmentColor(detailsAppointment),
            appointmentColorIsCustom: getAppointmentColorIsCustom(detailsAppointment),
          })
        : defaultColor,
    [colorMode, defaultColor, detailsAppointment]
  );

  const detailsModal = useBuiltInDetails ? (
    <AppointmentDetailsModal
      appointment={detailsAppointment}
      professionals={professionals}
      timeZone={timeZone}
      locale={locale}
      messages={agendaMessages}
      accentColor={detailsAccentColor}
      actions={detailsActions}
      onAction={onDetailsAction}
      onClose={() => setDetailsAppointment(null)}
    />
  ) : null;

  const canonicalView =
    view === "month" ? "dayGridMonth" : view === "week" ? "timeGridWeek" : "timeGridDay";

  const calendarOptions = useMemo(
    () =>
      createAgendaOptions({
        timeZone,
        locale,
        slotDurationMinutes: step,
        snapDurationMinutes: step,
        initialView: canonicalView,
      }),
    [canonicalView, locale, step, timeZone]
  );

  if (view === "month") {
    return (
      <AgendaConfigProvider timeZone={timeZone} locale={locale} messages={messages}>
        <div className="flex h-full min-h-0 w-full overflow-auto">
        <AgendaMonthView
          weekStartsOn={weekStartsOn}
          date={date}
          agsByDay={agsByDay}
          bloqsByDay={bloqsByDay}
          themeProfs={professionals}
          appointmentColorMode={colorMode}
          appointmentDefaultColor={defaultColor}
          onOpenAgendamento={openAppointmentDetails}
          onOpenBloqueio={NOOP}
          onOpenDay={NOOP}
          calendarOptions={calendarOptions}
          calendarView="dayGridMonth"
        />
        {detailsModal}
        </div>
      </AgendaConfigProvider>
    );
  }

  return (
    <AgendaConfigProvider timeZone={timeZone} locale={locale} messages={messages}>
      {/*
        AgendaGrid is a flex child: its root carries `flex-1` and its scroller
        carries `flex-1 h-0`. Dropped straight into a plain block, `flex-1`
        resolves to nothing, the grid grows to its full content height and the
        host clips it, no scrollbar anywhere. This wrapper makes the contract
        hold whatever the host's container happens to be.
      */}
      <div className="flex h-full min-h-0 w-full">
      <AgendaGrid
        date={date}
        days={days}
        displayProfs={professionals}
        themeProfs={professionals}
        appointmentColorMode={colorMode}
        appointmentDefaultColor={defaultColor}
        gridMin={step}
        canUpdateAppointments={editable}
        agsByDay={agsByDay}
        mutationAgsByDay={agsByDay}
        bloqsByDay={bloqsByDay}
        pendingAppointmentIds={EMPTY_IDS}
        slots={slots}
        majors={majors}
        startDay={range.startMinute}
        endDay={range.endMinute}
        selectedDayClosedMessage={selectedDayHours.isClosed ? agendaMessages.closedDay : null}
        getBusinessHoursForDay={hoursForDay}
        getProfessionalBusinessHoursForDay={professionalHoursForDay}
        tenantPausaIntervalo={lunchBreak}
        getPausaIntervaloForProfessionalDay={pauseForDay}
        dayColRefs={dayColRefs}
        dayDragRef={dayDragRef}
        pendingSelectionRef={pendingSelectionRef}
        selectionOverlayRef={selectionOverlayRef}
        daySelection={daySelection}
        onSetDaySelection={commitSelection}
        onSetDayClosedNotice={(message) => message && onBlocked?.(message)}
        onCloseDaySelection={closeSelection}
        isSelectedDateBeforeBrazilToday={isBeforeToday}
        isDiaEncerradoParaHoje={() => false}
        isSlotInPastBrazil={isSlotInPast}
        slotTakenInCol={slotTaken}
        resolveSelectableStartInCol={(_dayKey, _profId, minute) => minute}
        dayMinuteToPx={minuteToPx}
        dayMinuteFromY={minuteFromY}
        onOpenBloqueio={NOOP}
        onOpenAgendamento={openAppointmentDetails}
        onDropAg={handleDrop}
        onResizeAg={handleResize}
        columnMinWidth={columnMinWidth}
        rowHeight={rowHeight}
        calendarOptions={calendarOptions}
        calendarView={canonicalView}
      />
      {detailsModal}
      </div>
    </AgendaConfigProvider>
  );
});

const EMPTY_IDS: ReadonlySet<string> = new Set();
