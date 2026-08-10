"use client";

import { Fragment, memo } from "react";
import type { MutableRefObject } from "react";
import type {
  AppointmentColor,
  AppointmentColorMode,
} from "@zigoschedule/scheduler-core";

import type {
  Appointment,
  AgendaGridSelectionDragRef,
  Block,
  DayProfCardTheme,
  DaySelection,
  BreakWindow,
  Professional,
} from "@zigoschedule/scheduler-engine";
import {
  DAY_CANCELED_CARD_THEME,
  getAppointmentCardTheme,
  getAppointmentBufferAfterMinutes,
  getAppointmentBufferBeforeMinutes,
  getAppointmentColor,
  getAppointmentColorIsCustom,
  getAppointmentDurationMinutes,
  getAppointmentProfessionalId,
  getAppointmentStartsAt,
  getBlockEndTime,
  getBlockProfessionalId,
  getBlockStartTime,
  getProfessionalName,
  isCanceledStatus,
  isCompletedStatus,
  getBreakEndMinute,
  getBreakStartMinute,
} from "@zigoschedule/scheduler-engine";
import {
  type AgendaResolvedOptions,
  type AgendaViewId,
} from "@zigoschedule/scheduler-engine";
import type { DraggableCallbacks } from "@zigoschedule/scheduler-interaction";
import type { ResizableCallbacks } from "@zigoschedule/scheduler-interaction";
import { isMinuteInsideBreakWindow, toHHMM, toMin, zoneMins } from "@zigoschedule/scheduler-engine";
import {
  getAgendaSelectionOverlayStyle,
  getAgendaTimedItemBox,
} from "@zigoschedule/scheduler-engine";
import { AgCard } from "../events/AppointmentCard";
import { BloqCard } from "../events/BlockCard";
import { AgendaNowColumnOverlay } from "./AgendaNowColumnOverlay";
import { AgendaSlotLaneCell } from "./AgendaSlotLaneCell";
import type {
  AgendaMonthMoreItem,
  AgendaMorePopoverAnchorRect,
} from "./AgendaMorePopover";
import { resolveAgendaColumnBounds } from "./useAgendaColumnBounds";
import { resolveColumnSelection } from "./resolveColumnSelection";
import type {
  AgendaGridColumn as AgendaGridColumnModel,
  AgendaGridColumnItems,
} from "./useAgendaGridLayoutModel";
import { useAgendaMessages, useAgendaTimeZone } from "../../config/AgendaConfigContext";

const MAX_EVENT_STACK = 3;
const EVENT_CARD_GAP_PX = 2;
const OUTSIDE_BUSINESS_HOURS_BACKGROUND = `repeating-linear-gradient(
  -45deg,
  rgba(226, 232, 240, 0.76),
  rgba(226, 232, 240, 0.76) 6px,
  rgba(248, 250, 252, 0.78) 6px,
  rgba(248, 250, 252, 0.78) 12px
)`;

type GridBusinessHours = {
  startMinute: number;
  endMinute: number;
  isClosed?: boolean;
  closedMessage?: string;
};

type SelectionPreview = {
  startMinute: number;
  endMinute: number;
  visualEndMinute: number;
  blockedMessage: string | null;
};

type AgendaGridColumnProps = {
  col: AgendaGridColumnModel;
  columnItems: AgendaGridColumnItems;
  overlap: Map<string, { col: number; cols: number }>;
  displayProfs: Professional[];
  brtTodayKey: string;
  startDay: number;
  endDay: number;
  axisEndDay: number;
  gridMin: number;
  dataColumnHeight: number;
  dayBlockMinHeight: number;
  slotHeight: number;
  gridRows: number[];
  visualGridMinutes: number;
  majors: Set<number>;
  singleDayGrid: boolean;
  hasCustomSlotLaneRendering: boolean;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  pendingAppointmentIds: ReadonlySet<string>;
  daySelection: DaySelection | null;
  dayDragRef: MutableRefObject<AgendaGridSelectionDragRef>;
  dayColRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  pendingSelectionRef: MutableRefObject<DaySelection | null>;
  canUpdateAppointments: boolean;
  getVisibleProfCardTheme: (profId?: string | null) => DayProfCardTheme;
  appointmentColorMode: AppointmentColorMode;
  appointmentDefaultColor: AppointmentColor;
  getColumnBusinessHours: (dayKey: string) => GridBusinessHours;
  getColumnProfessionalBusinessHours: (
    dayKey: string,
    profissionalId: string | null,
  ) => GridBusinessHours;
  getColumnPausaIntervalo: (
    dayKey: string,
    profissionalId: string | null,
  ) => BreakWindow | null;
  dayMinuteToPx: (minute: number, height: number) => number;
  getPointerMinuteInColumn: (
    colKey: string,
    clientY: number,
  ) => {
    minute: number;
    y: number;
    colEl: HTMLDivElement;
    scrollEl: HTMLDivElement;
  } | null;
  getSelectionPreview: (selection: DaySelection) => SelectionPreview;
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
  isSelectedDateBeforeBrazilToday: (dayKey: string) => boolean;
  isDiaEncerradoParaHoje: (dayKey: string) => boolean;
  isSlotInPastBrazil: (dayKey: string, minute: number) => boolean;
  hideTimeHoverTooltip: () => void;
  showTimeHoverTooltip: (options: {
    clientX: number;
    clientY: number;
    colKey: string;
    minute: number;
    colStartDay: number;
    colEndDay: number;
    pausaIntervalo: BreakWindow | null;
    outsideBusinessHoursLabel?: string;
  }) => void;
  onSetDaySelection: (selection: DaySelection | null) => void;
  onSetDayClosedNotice: (msg: string | null) => void;
  onCloseDaySelection: () => void;
  onOpenBloqueio: (
    bloq: Block,
    dayKey: string,
    start: number,
    end: number,
  ) => void;
  onOpenAgendamento: (
    ag: Appointment,
    dayKey: string,
    start: number,
    end: number,
  ) => void;
  onOpenMoreAppointments: (
    dayKey: string,
    items: AgendaMonthMoreItem[],
    anchorRect: AgendaMorePopoverAnchorRect,
  ) => void;
  dndCallbacks: DraggableCallbacks;
  resizeCallbacks: ResizableCallbacks;
  onAgendaCallbackError?: (error: Error | null) => void;
};

export const AgendaGridColumn = memo(function AgendaGridColumn({
  col,
  columnItems,
  overlap,
  displayProfs,
  brtTodayKey,
  startDay,
  endDay,
  axisEndDay,
  gridMin,
  dataColumnHeight,
  dayBlockMinHeight,
  slotHeight,
  gridRows,
  visualGridMinutes,
  majors,
  singleDayGrid,
  hasCustomSlotLaneRendering,
  calendarOptions,
  calendarView,
  pendingAppointmentIds,
  daySelection,
  dayDragRef,
  dayColRefs,
  pendingSelectionRef,
  canUpdateAppointments,
  getVisibleProfCardTheme,
  appointmentColorMode,
  appointmentDefaultColor,
  getColumnBusinessHours,
  getColumnProfessionalBusinessHours,
  getColumnPausaIntervalo,
  dayMinuteToPx,
  getPointerMinuteInColumn,
  getSelectionPreview,
  slotTakenInCol,
  resolveSelectableStartInCol,
  isSelectedDateBeforeBrazilToday,
  isDiaEncerradoParaHoje,
  isSlotInPastBrazil,
  hideTimeHoverTooltip,
  showTimeHoverTooltip,
  onSetDaySelection,
  onSetDayClosedNotice,
  onCloseDaySelection,
  onOpenBloqueio,
  onOpenAgendamento,
  onOpenMoreAppointments,
  dndCallbacks,
  resizeCallbacks,
  onAgendaCallbackError,
}: AgendaGridColumnProps) {
  const timeZone = useAgendaTimeZone();
  const messages = useAgendaMessages();
  const colKey = col.key;
  const dayAgs = columnItems.ags;
  const dayBloqs = columnItems.bloqs;
  const bounds = resolveAgendaColumnBounds({
    dayKey: col.dayKey,
    professionalId: col.profId || null,
    displayProfs,
    gridStartMinute: startDay,
    gridEndMinute: endDay,
    axisEndMinute: axisEndDay,
    snapMinutes: gridMin,
    getColumnBusinessHours,
    getColumnProfessionalBusinessHours,
    getColumnPausaIntervalo,
    fallbackClosedMessage: messages.closed,
    fallbackOutOfHoursMessage: messages.outsideBusinessHours,
    professionalOutOfHoursMessage: (professionalName) =>
      `${professionalName}: ${messages.outsideBusinessHours}`,
  });
  const colPausaIntervalo = bounds.pause;
  const colClosedMessage = bounds.closedMessage;
  const colStartDay = bounds.startMinute;
  const colEndDay = bounds.endMinute;
  const colBottomBlockedStartDay = bounds.bottomBlockedStartMinute;
  const colOutOfHoursMessage = bounds.outOfHoursMessage;
  const visibleDayAgs: Appointment[] = [];
  const overflowDayAgs: Appointment[] = [];
  dayAgs.forEach((ag) => {
    const lane = overlap.get(`ag:${ag.id}`);
    if (lane && lane.col >= MAX_EVENT_STACK) {
      overflowDayAgs.push(ag);
      return;
    }
    visibleDayAgs.push(ag);
  });

  const minuteToPx = (minute: number) =>
    dayMinuteToPx(minute, dataColumnHeight);
  const clearSelectionDrag = () => {
    const drag = dayDragRef.current;
    if (drag) {
      drag.active = false;
      drag.selectionStarted = false;
    }
    pendingSelectionRef.current = null;
  };
  const overflowButtonEl =
    overflowDayAgs.length > 0
      ? (() => {
          const overflowStart = Math.max(
            startDay,
            Math.min(...overflowDayAgs.map((ag) => zoneMins(getAppointmentStartsAt(ag), timeZone))),
          );
          const overflowEnd = Math.min(endDay, overflowStart + gridMin);
          if (overflowEnd <= startDay || overflowStart >= endDay) return null;

          const btnHeight = Math.max(22, Math.min(dayBlockMinHeight, 28));
          const btnTop = Math.min(
            Math.max(0, minuteToPx(overflowStart)),
            Math.max(0, dataColumnHeight - btnHeight),
          );
          const cardGap = EVENT_CARD_GAP_PX;
          const btnLeft = `calc(${((MAX_EVENT_STACK - 1) / MAX_EVENT_STACK) * 100}% + ${cardGap / 2}px)`;

          return (
            <button
              type="button"
              className="pointer-events-auto absolute z-[46] overflow-hidden rounded-sm border border-[#BFDBFE] bg-[#EFF6FF] px-1.5 text-left text-[11px] font-semibold text-[#1D4ED8] hover:bg-[#DBEAFE] cursor-pointer"
              style={{
                top: btnTop,
                height: btnHeight,
                left: btnLeft,
                right: "4px",
              }}
              aria-label={messages.viewMoreAppointments(overflowDayAgs.length)}
              onClick={(ev) => {
                ev.stopPropagation();
                const rect = ev.currentTarget.getBoundingClientRect();
                onOpenMoreAppointments(
                  col.dayKey,
                  overflowDayAgs.map((ag) => ({
                    kind: "ag",
                    ag,
                    start: zoneMins(getAppointmentStartsAt(ag), timeZone),
                  })),
                  {
                    top: rect.top,
                    right: rect.right,
                    bottom: rect.bottom,
                    left: rect.left,
                    width: rect.width,
                    height: rect.height,
                  },
                );
              }}
            >
              {messages.more(overflowDayAgs.length, overflowDayAgs.length)}
            </button>
          );
        })()
      : null;

  return (
    <div
      ref={(el) => {
        if (el) dayColRefs.current.set(colKey, el);
        else dayColRefs.current.delete(colKey);
      }}
      onPointerDown={(ev) => {
        if (ev.button !== 0) return;
        const target = ev.target as HTMLElement;
        if (target.closest("button")) {
          hideTimeHoverTooltip();
          return;
        }
        const pointerMinute = getPointerMinuteInColumn(colKey, ev.clientY);
        if (!pointerMinute) return;
        const { y, minute, scrollEl } = pointerMinute;
        const profId = col.profId || null;

        const decision = resolveColumnSelection({
          dayKey: col.dayKey,
          professionalId: profId,
          minute,
          startMinute: colStartDay,
          endMinute: colEndDay,
          pause: colPausaIntervalo,
          closedMessage: colClosedMessage,
          outOfHoursMessage: colOutOfHoursMessage,
          pastMessage: messages.pastSlot,
          lunchMessage: messages.lunchSlot,
          occupiedMessage: messages.occupiedSlot,
          fallbackOutOfHoursMessage: messages.outsideBusinessHours,
          deferResourceValidation: Boolean(col.deferResourceValidation),
          isDayInPast: isSelectedDateBeforeBrazilToday,
          isDayFinished: isDiaEncerradoParaHoje,
          isSlotInPast: isSlotInPastBrazil,
          isSlotTaken: slotTakenInCol,
          resolveSelectableStart: resolveSelectableStartInCol,
        });

        if (!decision.ok) {
          hideTimeHoverTooltip();
          onCloseDaySelection();
          onSetDayClosedNotice(decision.message);
          return;
        }
        onSetDayClosedNotice(null);

        const sel: DaySelection = {
          dayKey: col.dayKey,
          profId,
          start: decision.startMinute,
          end: decision.startMinute,
          colKey,
          source: "click",
          isDrag: false,
          isDragSelection: false,
          deferResourceValidation: col.deferResourceValidation,
        };
        pendingSelectionRef.current = sel;
        onSetDaySelection(null);
        try {
          ev.currentTarget.setPointerCapture(ev.pointerId);
        } catch {
          // Pointer capture may fail when the browser cancels the pointer early.
        }
        dayDragRef.current = {
          active: true,
          pointerId: ev.pointerId,
          colKey,
          dayKey: col.dayKey,
          profId,
          originY: y,
          originClientX: ev.clientX,
          originClientY: ev.clientY,
          scrollEl,
          lastClientX: ev.clientX,
          lastClientY: ev.clientY,
          selectionStarted: false,
        };
      }}
      onPointerMove={(ev) => {
        if (ev.pointerType === "touch") return;
        const target = ev.target as HTMLElement;
        if (target.closest("button")) {
          hideTimeHoverTooltip();
          return;
        }

        const pointerMinute = getPointerMinuteInColumn(colKey, ev.clientY);
        if (!pointerMinute) {
          hideTimeHoverTooltip();
          return;
        }

        const drag = dayDragRef.current;
        const pendingSelection = pendingSelectionRef.current;
        if (
          drag &&
          drag.active &&
          drag.pointerId === ev.pointerId &&
          drag.colKey === colKey &&
          pendingSelection
        ) {
          const moved =
            Math.abs(ev.clientY - drag.originClientY) >= 4 ||
            Math.abs(ev.clientX - drag.originClientX) >= 4;
          if (moved) drag.selectionStarted = true;
          if (drag.selectionStarted) {
            const nextSelection: DaySelection = {
              ...pendingSelection,
              end: pointerMinute.minute,
              source: "range",
              isDrag: true,
              isDragSelection: true,
            };
            pendingSelectionRef.current = nextSelection;
          }
        }

        showTimeHoverTooltip({
          clientX: ev.clientX,
          clientY: ev.clientY,
          colKey,
          minute: pointerMinute.minute,
          colStartDay,
          colEndDay,
          pausaIntervalo: colPausaIntervalo,
          outsideBusinessHoursLabel: colOutOfHoursMessage,
        });
      }}
      onPointerLeave={() => {
        if (!dayDragRef.current?.active) hideTimeHoverTooltip();
      }}
      onPointerUp={(ev) => {
        hideTimeHoverTooltip();
        const drag = dayDragRef.current;
        const pendingSelection = pendingSelectionRef.current;
        if (!drag || !drag.active || drag.pointerId !== ev.pointerId || drag.colKey !== colKey) return;

        const pointerMinute = getPointerMinuteInColumn(colKey, ev.clientY);
        const finalSelection: DaySelection | null = pendingSelection && pointerMinute
          ? {
              ...pendingSelection,
              end: pointerMinute.minute,
              source: "range",
              isDrag: true,
              isDragSelection: true,
            }
          : pendingSelection;

        try {
          ev.currentTarget.releasePointerCapture(ev.pointerId);
        } catch {
          // Pointer capture may already have been released by the browser.
        }
        pendingSelectionRef.current = null;
        drag.active = false;

        if (!finalSelection || !drag.selectionStarted) return;

        const preview = getSelectionPreview(finalSelection);
        if (preview.blockedMessage) {
          drag.selectionStarted = false;
          onSetDayClosedNotice(preview.blockedMessage);
          return;
        }

        drag.selectionStarted = false;
        onSetDayClosedNotice(null);
        onSetDaySelection({
          ...finalSelection,
          start: preview.startMinute,
          end: preview.endMinute,
          source: "range",
          isDrag: true,
          isDragSelection: true,
        });
      }}
      onPointerCancel={() => {
        hideTimeHoverTooltip();
        clearSelectionDrag();
      }}
      className="relative border-r border-[#E5E7EB] bg-white"
      style={{
        height: dataColumnHeight,
        boxShadow:
          col.dayKey === brtTodayKey ? "inset 0 1px 0 #2563EB" : undefined,
      }}
      data-dnd-day={col.dayKey}
      data-dnd-prof={col.profId || ""}
    >
      {colClosedMessage && (
        <div className="pointer-events-none absolute inset-0 z-[18] flex items-start justify-center bg-[#F8FAFC]/80 px-3 py-4">
          <span className="rounded-md border border-[#CBD5E1] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]">
            {messages.closed}
          </span>
        </div>
      )}

      {minuteToPx(colStartDay) > 0 && (
        <div
          className="pointer-events-none absolute z-[9] left-0 right-0 border-b border-[#CBD5E1]"
          style={{
            top: 0,
            height: minuteToPx(colStartDay),
            background: OUTSIDE_BUSINESS_HOURS_BACKGROUND,
          }}
        />
      )}

      {minuteToPx(colBottomBlockedStartDay) < dataColumnHeight && (
        <div
          className="pointer-events-none absolute z-[9] left-0 right-0 border-t border-[#CBD5E1]"
          style={{
            top: minuteToPx(colBottomBlockedStartDay),
            height: dataColumnHeight - minuteToPx(colBottomBlockedStartDay),
            background: OUTSIDE_BUSINESS_HOURS_BACKGROUND,
          }}
        />
      )}

      {gridRows.map((minute) => {
        const top = minuteToPx(minute);
        const nextTop = minuteToPx(
          Math.min(axisEndDay, minute + visualGridMinutes),
        );
        const laneHeight = Math.max(1, nextTop - top);
        const isBusinessHour =
          !colClosedMessage && minute >= colStartDay && minute <= colEndDay;
        const isMajor = majors.has(minute);
        if (!hasCustomSlotLaneRendering) {
          return (
            <div
              key={`${colKey}-slot-lane-${minute}`}
              aria-hidden="true"
              data-time={toHHMM(minute)}
              className={`pointer-events-none absolute left-0 right-0 z-[7] overflow-hidden ${
                isMajor
                  ? "border-t border-[#D1D5DB]"
                  : "border-t border-[#E5E7EB]"
              } ${isBusinessHour ? "bg-transparent" : "bg-[#F8FAFC]/55"}`}
              style={{ top, height: laneHeight }}
            />
          );
        }
        return (
          <AgendaSlotLaneCell
            key={`${colKey}-slot-lane-${minute}`}
            minute={minute}
            dayKey={col.dayKey}
            resourceId={col.profId || null}
            top={top}
            height={laneHeight}
            isMajor={isMajor}
            timeGridStyle={true}
            isBusinessHour={isBusinessHour}
            isPast={isSlotInPastBrazil(col.dayKey, minute)}
            isToday={col.dayKey === brtTodayKey}
            isPausa={isMinuteInsideBreakWindow(minute, colPausaIntervalo)}
            isClosed={Boolean(colClosedMessage)}
            calendarOptions={calendarOptions}
            calendarView={calendarView}
            onAgendaCallbackError={onAgendaCallbackError}
          />
        );
      })}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 z-[7] border-t border-[#D1D5DB]"
        style={{ top: Math.max(0, dataColumnHeight - 1) }}
      />

      {brtTodayKey === col.dayKey && (
        <AgendaNowColumnOverlay
          colStartDay={colStartDay}
          colEndDay={colEndDay}
          minuteToPx={minuteToPx}
        />
      )}

      {colPausaIntervalo &&
        (() => {
          const breakStart = getBreakStartMinute(colPausaIntervalo);
          const breakEnd = getBreakEndMinute(colPausaIntervalo);
          if (breakStart === null || breakEnd === null) return null;
          const pausaInicio = Math.max(startDay, breakStart);
          const pausaFim = Math.min(endDay, breakEnd);
          if (pausaFim <= pausaInicio) return null;
          return (
            <div
              className="pointer-events-none absolute z-[6] left-0 right-0"
              style={{
                top: minuteToPx(pausaInicio),
                height: Math.max(
                  slotHeight,
                  minuteToPx(pausaFim) - minuteToPx(pausaInicio),
                ),
                background: `repeating-linear-gradient(
                -45deg,
                rgba(226, 232, 240, 0.72),
                rgba(226, 232, 240, 0.72) 6px,
                rgba(248, 250, 252, 0.72) 6px,
                rgba(248, 250, 252, 0.72) 12px
              )`,
                borderLeft: "2px solid #CBD5E1",
                borderRight: "2px solid #CBD5E1",
              }}
            >
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#64748B] bg-[#F8FAFC]/85">
                {messages.lunchBreak}
              </div>
            </div>
          );
        })()}

      {daySelection &&
        daySelection.colKey === colKey &&
        (() => {
          const selectionPreview = getSelectionPreview(daySelection);
          const blocked = Boolean(selectionPreview.blockedMessage);
          return (
            <div
              className={`pointer-events-none absolute z-[30] left-1.5 right-1.5 overflow-hidden rounded-sm border ${
                blocked
                  ? "border-[#EF4444] bg-[#FEF2F2]/90 ring-1 ring-[#FECACA]"
                  : "border-[#2563EB] bg-[#EFF6FF]/80"
              }`}
              style={getAgendaSelectionOverlayStyle({
                startMinute: selectionPreview.startMinute,
                endMinute: selectionPreview.visualEndMinute,
                minuteToPx,
                minHeight: slotHeight,
              })}
            >
              {blocked && (
                <div className="truncate px-2 py-1 text-[10px] font-semibold text-[#B91C1C]">
                  {selectionPreview.blockedMessage}
                </div>
              )}
            </div>
          );
        })()}

      {dayBloqs.map((b) => {
        const blockProfessionalId = getBlockProfessionalId(b);
        const s = toMin(getBlockStartTime(b));
        const e = toMin(getBlockEndTime(b));
        const visibleStart = Math.max(startDay, s);
        const visualEnd = Math.min(endDay, e);
        const visibleEnd = Math.min(endDay, visualEnd);
        if (visibleEnd <= visibleStart) return null;
        const box = getAgendaTimedItemBox({
          startMinute: visibleStart,
          endMinute: visibleEnd,
          dayEndMinute: endDay,
          minuteToPx,
          minHeight: dayBlockMinHeight,
        });
        const theme = blockProfessionalId
          ? getVisibleProfCardTheme(blockProfessionalId)
          : null;
        const lane = overlap.get(`bloq:${b.id}`) ?? { col: 0, cols: 1 };
        const blockGap = EVENT_CARD_GAP_PX;
        const blockLeftPct = (lane.col / lane.cols) * 100;
        const blockWidthPct = 100 / lane.cols;
        return (
          <BloqCard
            key={b.id}
            bloq={b}
            dayKey={col.dayKey}
            s={s}
            e={e}
            top={box.top}
            height={box.height}
            left={`calc(${blockLeftPct}% + ${blockGap / 2}px)`}
            width={`calc(${blockWidthPct}% - ${blockGap}px)`}
            theme={theme}
            calendarOptions={calendarOptions}
            calendarView={calendarView}
            onAgendaCallbackError={onAgendaCallbackError}
            onOpen={onOpenBloqueio}
          />
        );
      })}

      {visibleDayAgs.map((a) => {
        const s = zoneMins(getAppointmentStartsAt(a), timeZone);
        const durationMinutes = getAppointmentDurationMinutes(a, 30);
        const e = s + Math.max(gridMin, durationMinutes);
        const bufferBeforeMinutes = getAppointmentBufferBeforeMinutes(a);
        const bufferAfterMinutes = getAppointmentBufferAfterMinutes(a);
        const visibleStart = Math.max(startDay, s);
        const visualEnd = Math.min(endDay, e);
        const visibleEnd = Math.min(endDay, visualEnd);
        if (visibleEnd <= visibleStart) return null;
        const box = getAgendaTimedItemBox({
          startMinute: visibleStart,
          endMinute: visibleEnd,
          dayEndMinute: endDay,
          minuteToPx,
          minHeight: dayBlockMinHeight,
        });
        const isCanceled = isCanceledStatus(a.status);
        const isCompleted = isCompletedStatus(a.status);
        const isPendingMutation = pendingAppointmentIds.has(a.id);
        const theme = isCanceled
          ? DAY_CANCELED_CARD_THEME
          : getAppointmentCardTheme({
              appointmentColor: getAppointmentColor(a),
              appointmentColorIsCustom: getAppointmentColorIsCustom(a),
              mode: appointmentColorMode,
              defaultColor: appointmentDefaultColor,
            });
        const cardProfId = col.profId || getAppointmentProfessionalId(a);
        const cardProfessionalName = cardProfId
          ? getProfessionalName(displayProfs.find((prof) => prof.id === cardProfId))
          : undefined;
        const lane = overlap.get(`ag:${a.id}`) ?? { col: 0, cols: 1 };
        const visibleCols = Math.min(lane.cols, MAX_EVENT_STACK);
        const isWeekOverlappedCard = !singleDayGrid && visibleCols > 1;
        const cardGap = EVENT_CARD_GAP_PX;
        const leftPct = (lane.col / visibleCols) * 100;
        const widthPct = 100 / visibleCols;
        const cardLeft = `calc(${leftPct}% + ${cardGap / 2}px)`;
        const cardWidth = `calc(${widthPct}% - ${cardGap}px)`;
        const renderBuffer = (kind: "before" | "after", bufferStart: number, bufferEnd: number) => {
          const clippedStart = Math.max(startDay, bufferStart);
          const clippedEnd = Math.min(endDay, bufferEnd);
          if (clippedEnd <= clippedStart) return null;
          const bufferBox = getAgendaTimedItemBox({
            startMinute: clippedStart,
            endMinute: clippedEnd,
            dayEndMinute: endDay,
            minuteToPx,
            minHeight: 1,
          });
          return (
            <div
              aria-hidden="true"
              data-ag-buffer={kind}
              className="pointer-events-none absolute z-[32] rounded-sm border border-dashed border-[#CBD5E1] bg-[#E2E8F0]/45"
              style={{
                top: bufferBox.top,
                height: bufferBox.height,
                left: cardLeft,
                width: cardWidth,
              }}
            />
          );
        };
        return (
          <Fragment key={a.id}>
            {renderBuffer("before", s - bufferBeforeMinutes, s)}
            {renderBuffer("after", s + durationMinutes, s + durationMinutes + bufferAfterMinutes)}
            <AgCard
              ag={a}
              dayKey={col.dayKey}
              s={s}
              e={e}
              top={box.top}
              height={box.height}
              left={cardLeft}
              width={cardWidth}
              theme={theme}
              isCanceled={isCanceled}
              isPendingMutation={isPendingMutation}
              agDuracao={durationMinutes}
              agProfId={cardProfId}
              professionalName={cardProfessionalName}
              showProfessionalName={!col.showResourceHeader}
              cardVariant={singleDayGrid ? "day" : "week"}
              compactOverlap={isWeekOverlappedCard}
              gridMin={gridMin}
              canDrag={
                canUpdateAppointments &&
                !isCanceled &&
                !isCompleted &&
                !isPendingMutation
              }
              canResize={
                canUpdateAppointments &&
                !isCanceled &&
                !isCompleted &&
                !isPendingMutation
              }
              dndCallbacks={dndCallbacks}
              resizeCallbacks={resizeCallbacks}
              calendarOptions={calendarOptions}
              calendarView={calendarView}
              onAgendaCallbackError={onAgendaCallbackError}
              onOpen={onOpenAgendamento}
            />
          </Fragment>
        );
      })}

      {overflowButtonEl}
    </div>
  );
});
