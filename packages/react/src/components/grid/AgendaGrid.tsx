"use client";
import { memo, useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { MutableRefObject } from "react";
import type {
  AppointmentColor,
  AppointmentColorMode,
} from "@zigoschedule/scheduler-core";
import type {
  Appointment,
  AgendaGridSelectionDragRef,
  Block,
  DaySelection,
  BreakWindow,
  Professional,
} from "@zigoschedule/scheduler-engine";
import { SLOT_H, getProfessionalCardThemeForVisibleList } from "@zigoschedule/scheduler-engine";
import { dateKey, zoneNowParts } from "@zigoschedule/scheduler-engine";
import { getAppointmentServiceLabel } from "@zigoschedule/scheduler-engine";
import {
  calculateAgendaDynamicSlotHeight,
  getAgendaVisualEndMinute,
} from "@zigoschedule/scheduler-engine";
import type { DragPayload } from "@zigoschedule/scheduler-interaction";
import {
  buildAgendaEngineContext,
  buildMoveMutation,
  findAppointmentEvent,
  validateAppointmentMutation,
  type AgendaResolvedOptions,
  type AgendaNativeInteractionEvent,
  type AgendaViewId,
} from "@zigoschedule/scheduler-engine";
import {
  AgendaDragOverlay,
  type AgendaDragOverlayHandle,
} from "./AgendaDragOverlay";
import { AgendaGridColumn } from "./AgendaGridColumn";
import { AgendaGridHeader } from "./AgendaGridHeader";
import { AgendaGridLoadingState } from "./AgendaGridLoadingState";
import { AgendaTimeAxis } from "./AgendaTimeAxis";
import { useAgendaViewportHeight } from "./useAgendaViewportHeight";
import { InlineGridNotice } from "./InlineGridNotice";
import { useAgendaGridDndHitSystem } from "./useAgendaGridDndHitSystem";
import { useAgendaGridDragResizeCallbacks } from "./useAgendaGridDragResizeCallbacks";
import { useAgendaGridLayoutModel } from "./useAgendaGridLayoutModel";
import { useAgendaGridSelectionPreview } from "./useAgendaGridSelectionPreview";
import { useAgendaGridTimeHoverTooltip } from "./useAgendaGridTimeHoverTooltip";
import { useAgendaMessages, useAgendaTimeZone } from "../../config/AgendaConfigContext";
import { useAgendaClock } from "../../hooks/useAgendaClock";
import { validationMessagesFromAgendaMessages } from "./validationMessages";

const DND_SNAP_MINUTES = 5;
const EMPTY_COLUMN_ITEMS: { ags: Appointment[]; bloqs: Block[] } = { ags: [], bloqs: [] };

type GridBusinessHours = {
  startMinute: number;
  endMinute: number;
  isClosed?: boolean;
  closedMessage?: string;
};

type Props = {
  date: Date;
  days?: Date[];
  displayProfs: Professional[];
  themeProfs?: Professional[];
  appointmentColorMode: AppointmentColorMode;
  appointmentDefaultColor: AppointmentColor;
  loading?: boolean;
  gridMin: number;
  canUpdateAppointments: boolean;
  agsByDay: Map<string, Appointment[]>;
  mutationAgsByDay: Map<string, Appointment[]>;
  bloqsByDay: Map<string, Block[]>;
  pendingAppointmentIds: ReadonlySet<string>;
  slots: number[];
  majors: Set<number>;
  startDay: number;
  endDay: number;
  selectedDayClosedMessage: string | null;
  getBusinessHoursForDay?: (dayKey: string) => GridBusinessHours;
  getProfessionalBusinessHoursForDay?: (
    dayKey: string,
    profissionalId: string | null,
  ) => GridBusinessHours | null;
  tenantPausaIntervalo: BreakWindow | null;
  getPausaIntervaloForProfessionalDay?: (
    dayKey: string,
    profissionalId: string | null,
  ) => BreakWindow | null;
  dayColRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  dayDragRef: MutableRefObject<AgendaGridSelectionDragRef>;
  pendingSelectionRef: MutableRefObject<DaySelection | null>;
  selectionOverlayRef: MutableRefObject<HTMLDivElement | null>;
  daySelection: DaySelection | null;
  onSetDaySelection: (sel: DaySelection | null) => void;
  onSetDayClosedNotice: (msg: string | null) => void;
  onCloseDaySelection: () => void;
  isSelectedDateBeforeBrazilToday: (dayKey: string) => boolean;
  isDiaEncerradoParaHoje: (dayKey: string) => boolean;
  isSlotInPastBrazil: (dayKey: string, minute: number) => boolean;
  slotTakenInCol: (
    dayKey: string,
    profId: string | null,
    minute: number,
  ) => boolean;
  resolveSelectableStartInCol: (
    dayKey: string,
    profId: string | null,
    minute: number,
  ) => number | null;
  dayMinuteToPx: (minute: number, colHeight: number) => number;
  dayMinuteFromY: (y: number, colHeight: number) => number;
  onOpenBloqueio: (
    bloq: Block,
    dayKey: string,
    s: number,
    e: number,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
  onOpenAgendamento: (
    ag: Appointment,
    dayKey: string,
    s: number,
    e: number,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
  onDropAg: (
    agId: string,
    newDataHora: string,
    profissionalId: string | null,
  ) => Promise<void>;
  onResizeAg: (
    agId: string,
    result: {
      direction: "start" | "end";
      duracaoMinutos: number;
      novaDataHora?: string;
    },
  ) => Promise<void>;
  onMutationError?: (message: string) => void;
  /** Overrides the built-in minimum column width, in pixels. */
  columnMinWidth?: number;
  /**
   * Minimum height of one slot row, in pixels. Rows still stretch to fill the
   * viewport when there is spare space; raising this makes the day taller than
   * the viewport instead, which is what puts the grid on a scrollbar.
   */
  rowHeight?: number;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
};

export const AgendaGrid = memo(function AgendaGrid({
  date,
  days,
  displayProfs,
  themeProfs,
  appointmentColorMode,
  appointmentDefaultColor,
  loading = false,
  gridMin,
  canUpdateAppointments,
  agsByDay,
  mutationAgsByDay,
  bloqsByDay,
  pendingAppointmentIds,
  slots,
  majors,
  startDay,
  endDay,
  selectedDayClosedMessage,
  getBusinessHoursForDay,
  getProfessionalBusinessHoursForDay,
  tenantPausaIntervalo,
  getPausaIntervaloForProfessionalDay,
  dayColRefs,
  dayDragRef,
  pendingSelectionRef,
  selectionOverlayRef,
  daySelection,
  onSetDaySelection,
  onSetDayClosedNotice,
  onCloseDaySelection,
  isSelectedDateBeforeBrazilToday,
  isDiaEncerradoParaHoje,
  isSlotInPastBrazil,
  slotTakenInCol,
  resolveSelectableStartInCol,
  dayMinuteToPx,
  dayMinuteFromY,
  onOpenBloqueio,
  onOpenAgendamento,
  onDropAg,
  onResizeAg,
  onMutationError,
  columnMinWidth,
  rowHeight,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
}: Props) {
  const colorReferenceProfs = themeProfs?.length ? themeProfs : displayProfs;
  const getVisibleProfCardTheme = useCallback(
    (profId?: string | null) =>
      getProfessionalCardThemeForVisibleList(profId, colorReferenceProfs),
    [colorReferenceProfs],
  );
  const hasCustomSlotLaneRendering = Boolean(
    calendarOptions.slotLaneClassNames ||
    calendarOptions.slotLaneContent ||
    calendarOptions.slotLaneDidMount ||
    calendarOptions.slotLaneWillUnmount,
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const dragOverlayRef = useRef<AgendaDragOverlayHandle | null>(null);

  const timeZone = useAgendaTimeZone();
  const messages = useAgendaMessages();
  const validationMessages = useMemo(
    () => validationMessagesFromAgendaMessages(messages),
    [messages],
  );
  const clockTick = useAgendaClock();
  const brtTodayKey = useMemo(() => zoneNowParts(timeZone).dayKey, [timeZone, clockTick]);
  const [gridNotice, setGridNotice] = useState<string | null>(null);
  const gridDays = useMemo(() => (days?.length ? days : [date]), [date, days]);
  const gridDayKeys = useMemo(
    () => gridDays.map((day) => dateKey(day)).join("|"),
    [gridDays],
  );
  const gridMeasureKey = useMemo(
    // rowHeight belongs here: the ref below keeps the tallest viewport ever seen
    // for a given key, so leaving it out makes a density change reuse a stale
    // measurement and the rows appear not to move.
    () => [gridDayKeys, startDay, endDay, gridMin, slots.length, rowHeight ?? 0].join("|"),
    [endDay, gridDayKeys, gridMin, slots.length, startDay, rowHeight],
  );
  const scrollViewportHeight = useAgendaViewportHeight(scrollRef, gridMeasureKey);

  const slotHeight = useMemo(
    () =>
      calculateAgendaDynamicSlotHeight({
        baseSlotHeight: rowHeight && rowHeight > 0 ? rowHeight : SLOT_H,
        availableHeight: scrollViewportHeight,
        slotCount: slots.length,
      }),
    [rowHeight, scrollViewportHeight, slots.length],
  );
  const visualEndDay = useMemo(
    () =>
      getAgendaVisualEndMinute({
        startMinute: startDay,
        endMinute: endDay,
        snapMinutes: gridMin,
      }),
    [endDay, gridMin, startDay],
  );
  const axisEndDay = useMemo(
    () => (slots.length > 0 ? slots[slots.length - 1] + gridMin : visualEndDay),
    [gridMin, slots, visualEndDay],
  );
  const autoScrollKeyRef = useRef<string | null>(null);
  const dismissGridNotice = useCallback(() => setGridNotice(null), []);
  const getColumnBusinessHours = useCallback(
    (dayKey: string) => {
      const fallback = {
        startMinute: startDay,
        endMinute: endDay,
        isClosed: Boolean(selectedDayClosedMessage),
        closedMessage: selectedDayClosedMessage ?? undefined,
      };
      return getBusinessHoursForDay?.(dayKey) ?? fallback;
    },
    [endDay, getBusinessHoursForDay, selectedDayClosedMessage, startDay],
  );

  const getColumnProfessionalBusinessHours = useCallback(
    (dayKey: string, profissionalId: string | null) => {
      const businessHours = getColumnBusinessHours(dayKey);
      if (!getProfessionalBusinessHoursForDay) return businessHours;
      const professionalHours = getProfessionalBusinessHoursForDay?.(dayKey, profissionalId);
      return professionalHours ?? {
        ...businessHours,
        endMinute: businessHours.startMinute,
        isClosed: true,
      };
    },
    [getColumnBusinessHours, getProfessionalBusinessHoursForDay],
  );

  const getColumnPausaIntervalo = useCallback(
    (dayKey: string, profissionalId: string | null) => {
      return getPausaIntervaloForProfessionalDay
        ? getPausaIntervaloForProfessionalDay(dayKey, profissionalId)
        : tenantPausaIntervalo;
    },
    [getPausaIntervaloForProfessionalDay, tenantPausaIntervalo],
  );

  const findRenderedAgById = useCallback(
    (agId: string): Appointment | null => {
      let foundAg: Appointment | null = null;
      agsByDay.forEach((dayAgs) => {
        if (foundAg) return;
        foundAg = dayAgs.find((ag) => ag.id === agId) ?? null;
      });
      return foundAg;
    },
    [agsByDay],
  );


  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || slots.length === 0) return;
    const autoScrollKey = `${gridDayKeys}-${startDay}-${endDay}-${gridMin}-${axisEndDay}-${slotHeight}`;
    if (autoScrollKeyRef.current === autoScrollKey) return;
    autoScrollKeyRef.current = autoScrollKey;

    const frameId = window.requestAnimationFrame(() => {
      const gridHeight = Math.max(1, slots.length * slotHeight);
      const targetTop = dayMinuteToPx(startDay, gridHeight);
      const maxScrollTop = Math.max(
        0,
        scrollEl.scrollHeight - scrollEl.clientHeight,
      );
      scrollEl.scrollTop = Math.max(0, Math.min(maxScrollTop, targetTop));
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [
    axisEndDay,
    dayMinuteToPx,
    endDay,
    gridDayKeys,
    gridMin,
    slotHeight,
    slots.length,
    startDay,
  ]);

  const syncHeaderScroll = useCallback(() => {
    const scrollEl = scrollRef.current;
    const headerEl = headerScrollRef.current;
    if (!scrollEl || !headerEl) return;
    headerEl.scrollLeft = scrollEl.scrollLeft;
  }, []);

  const {
    prepareDndHits,
    releaseDndHits,
    hitTest,
    updateDropColumnHighlight,
    clearDropColumnHighlight,
  } = useAgendaGridDndHitSystem({
    dayColRefs,
    scrollRef,
    startDay,
    endDay,
    axisEndDay,
    snapMinutes: DND_SNAP_MINUTES,
  });

  const resolveDropResourceId = useCallback(
    (hitProfId: string | null, fallbackProfId: string | null): string | null =>
      hitProfId ?? fallbackProfId ?? null,
    [],
  );

  const agendaEngine = useMemo(
    () =>
      buildAgendaEngineContext({
        resources: displayProfs,
        date,
        timeZone,
        appointmentsByDay: mutationAgsByDay,
        blocksByDay: bloqsByDay,
        businessHours: {
          startMinute: startDay,
          endMinute: endDay,
          isClosed: Boolean(selectedDayClosedMessage),
          closedMessage: selectedDayClosedMessage ?? undefined,
        },
        getBusinessHoursForDay: getColumnBusinessHours,
        getResourceBusinessHoursForDay: (resourceId, dayKey) => {
          if (!resourceId) return undefined;
          return getProfessionalBusinessHoursForDay?.(dayKey, resourceId);
        },
        breakWindow: tenantPausaIntervalo,
        getResourceBreakWindowForDay: (resourceId, dayKey) => {
          if (!resourceId) return undefined;
          return getColumnPausaIntervalo(dayKey, resourceId);
        },
        snapMinutes: gridMin,
        temporalGuards: {
          isDayBeforeToday: isSelectedDateBeforeBrazilToday,
          isDayClosedForToday: isDiaEncerradoParaHoje,
          isSlotInPast: isSlotInPastBrazil,
        },
      }),
    [
      bloqsByDay,
      date,
      displayProfs,
      endDay,
      getColumnBusinessHours,
      getColumnPausaIntervalo,
      getProfessionalBusinessHoursForDay,
      isDiaEncerradoParaHoje,
      isSelectedDateBeforeBrazilToday,
      isSlotInPastBrazil,
      mutationAgsByDay,
      selectedDayClosedMessage,
      gridMin,
      startDay,
      tenantPausaIntervalo,
      timeZone,
    ],
  );

  const getDropBlockReason = useCallback(
    (
      payload: DragPayload,
      dayKey: string,
      profId: string | null,
      minute: number,
    ): string | null => {
      const appointment = findAppointmentEvent(agendaEngine, payload.agId);
      const result = validateAppointmentMutation(
        agendaEngine,
        appointment,
        appointment
          ? buildMoveMutation(appointment, {
              dayKey,
              resourceId: profId || null,
              startMinute: minute,
              endMinute: minute + payload.durationMinutes,
            })
          : null,
        { messages: validationMessages },
      );

      return result.ok ? null : result.message;
    },
    [agendaEngine, validationMessages],
  );

  const getSelectionPreview = useAgendaGridSelectionPreview({
    agendaEngine,
    startDay,
    endDay,
    axisEndDay,
    gridMin,
    validationMessages,
  });

  const { timeHoverTooltipRef, hideTimeHoverTooltip, showTimeHoverTooltip } =
    useAgendaGridTimeHoverTooltip({
      scrollRef,
      dayDragRef,
      pendingSelectionRef,
      endDay,
      gridMin,
    });

  const { getPointerMinuteInColumn, dndCallbacks, resizeCallbacks } =
    useAgendaGridDragResizeCallbacks({
      dayColRefs,
      scrollRef,
      dragOverlayRef,
      dayMinuteFromY,
      startDay,
      endDay,
      gridMin,
      prepareDndHits,
      releaseDndHits,
      hitTest,
      findRenderedAgById,
      updateDropColumnHighlight,
      clearDropColumnHighlight,
      resolveDropResourceId,
      getDropBlockReason,
      agendaEngine,
      validationMessages,
      onDropAg,
      onResizeAg,
      onMutationError,
      onSetDayClosedNotice,
      setGridNotice,
    });

  const {
    colDefs,
    cols,
    singleDayGrid,
    dayBlockMinHeight,
    gridTemplate,
    minWidth,
    dataColumnHeight,
    axisBoundaryTop,
    visualGridMinutes,
    gridRows,
    hasAuxiliaryWeekGrid,
    columnItemsByKey,
    timedOverlapByColKey,
  } = useAgendaGridLayoutModel({
    gridDays,
    displayProfs,
    slots,
    slotHeight,
    gridMin,
    startDay,
    axisEndDay,
    agsByDay,
    bloqsByDay,
    columnMinWidth,
  });

  useEffect(() => {
    syncHeaderScroll();
  }, [cols, gridDayKeys, syncHeaderScroll]);

  if (!displayProfs.length) {
    if (loading) {
      return (
        <AgendaGridLoadingState
          gridNotice={gridNotice}
          dismissGridNotice={dismissGridNotice}
        />
      );
    }

    return (
      <section className="flex-1 min-w-0 min-h-0 bg-white p-4">
        <div className="rounded-md border border-[#D1D5DB] bg-[#F8FAFC] px-4 py-3 text-sm text-[#475569]">
          {messages.filters.professionals}: {messages.noItems}
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex-1 min-w-0 min-h-0 bg-white flex flex-col overflow-hidden">
      <AgendaGridHeader
        headerScrollRef={headerScrollRef}
        colDefs={colDefs}
        brtTodayKey={brtTodayKey}
        displayProfs={displayProfs}
        themeProfs={colorReferenceProfs}
        gridTemplate={gridTemplate}
        minWidth={minWidth}
        agsByDay={agsByDay}
        bloqsByDay={bloqsByDay}
        columnItemsByKey={columnItemsByKey}
        getColumnBusinessHours={getColumnBusinessHours}
      />

      <div
        ref={scrollRef}
        data-agenda-scroll="true"
        onScroll={() => {
          syncHeaderScroll();
          hideTimeHoverTooltip();
        }}
        onPointerDownCapture={hideTimeHoverTooltip}
        onPointerLeave={hideTimeHoverTooltip}
        className="relative flex-1 h-0 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain"
      >
        <AgendaDragOverlay
          ref={dragOverlayRef}
          // Same inputs the card uses; without them the preview falls back to the
          // professional color and the appointment appears to change while
          // dragging.
          appointmentColorMode={appointmentColorMode}
          appointmentDefaultColor={appointmentDefaultColor}
          dayColRefs={dayColRefs}
          scrollRef={scrollRef}
          startDay={startDay}
          endDay={endDay}
          gridMin={gridMin}
          slotHeight={slotHeight}
          dayMinuteToPx={dayMinuteToPx}
          getProfCardTheme={getVisibleProfCardTheme}
          getAppointmentServiceLabel={getAppointmentServiceLabel}
        />
        <div
          ref={selectionOverlayRef}
          data-agenda-selection-overlay="true"
          className="pointer-events-none absolute z-[31] hidden overflow-hidden rounded-sm border border-[#2563EB] bg-[#EFF6FF]/80"
          style={{ display: "none" }}
        />
        <div
          ref={timeHoverTooltipRef}
          className="pointer-events-none absolute left-0 top-0 z-[90] rounded-md border border-[#CBD5E1] bg-[#020617] px-2 py-1 text-[11px] font-semibold tabular-nums text-white shadow-lg"
          style={{ display: "none", transform: "translate(0px, 0px)" }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: gridTemplate,
            minWidth,
            minHeight: dataColumnHeight,
          }}
        >
          <AgendaTimeAxis
            dataColumnHeight={dataColumnHeight}
            gridRows={gridRows}
            dayMinuteToPx={dayMinuteToPx}
            axisEndDay={axisEndDay}
            visualGridMinutes={visualGridMinutes}
            majors={majors}
            singleDayGrid={singleDayGrid}
            hasAuxiliaryWeekGrid={hasAuxiliaryWeekGrid}
            calendarOptions={calendarOptions}
            calendarView={calendarView}
            onAgendaCallbackError={onAgendaCallbackError}
            axisBoundaryTop={axisBoundaryTop}
          />

          {colDefs.map((col) => {
            const columnItems =
              columnItemsByKey.get(col.key) ?? EMPTY_COLUMN_ITEMS;
            const overlap =
              timedOverlapByColKey.get(col.key) ??
              new Map<string, { col: number; cols: number }>();

            return (
              <AgendaGridColumn
                key={col.key}
                col={col}
                columnItems={columnItems}
                overlap={overlap}
                displayProfs={displayProfs}
                brtTodayKey={brtTodayKey}
                startDay={startDay}
                endDay={endDay}
                axisEndDay={axisEndDay}
                gridMin={gridMin}
                dataColumnHeight={dataColumnHeight}
                dayBlockMinHeight={dayBlockMinHeight}
                slotHeight={slotHeight}
                gridRows={gridRows}
                visualGridMinutes={visualGridMinutes}
                majors={majors}
                singleDayGrid={singleDayGrid}
                hasCustomSlotLaneRendering={hasCustomSlotLaneRendering}
                calendarOptions={calendarOptions}
                calendarView={calendarView}
                pendingAppointmentIds={pendingAppointmentIds}
                daySelection={daySelection}
                dayDragRef={dayDragRef}
                dayColRefs={dayColRefs}
                pendingSelectionRef={pendingSelectionRef}
                canUpdateAppointments={canUpdateAppointments}
                getVisibleProfCardTheme={getVisibleProfCardTheme}
                appointmentColorMode={appointmentColorMode}
                appointmentDefaultColor={appointmentDefaultColor}
                getColumnBusinessHours={getColumnBusinessHours}
                getColumnProfessionalBusinessHours={
                  getColumnProfessionalBusinessHours
                }
                getColumnPausaIntervalo={getColumnPausaIntervalo}
                dayMinuteToPx={dayMinuteToPx}
                getPointerMinuteInColumn={getPointerMinuteInColumn}
                getSelectionPreview={getSelectionPreview}
                slotTakenInCol={slotTakenInCol}
                resolveSelectableStartInCol={resolveSelectableStartInCol}
                isSelectedDateBeforeBrazilToday={
                  isSelectedDateBeforeBrazilToday
                }
                isDiaEncerradoParaHoje={isDiaEncerradoParaHoje}
                isSlotInPastBrazil={isSlotInPastBrazil}
                hideTimeHoverTooltip={hideTimeHoverTooltip}
                showTimeHoverTooltip={showTimeHoverTooltip}
                onSetDaySelection={onSetDaySelection}
                onSetDayClosedNotice={onSetDayClosedNotice}
                onCloseDaySelection={onCloseDaySelection}
                onOpenBloqueio={onOpenBloqueio}
                onOpenAgendamento={onOpenAgendamento}
                dndCallbacks={dndCallbacks}
                resizeCallbacks={resizeCallbacks}
                onAgendaCallbackError={onAgendaCallbackError}
              />
            );
          })}
        </div>
      </div>
      <InlineGridNotice message={gridNotice} onDismiss={dismissGridNotice} />
    </section>
  );
});
