"use client";
import { forwardRef, memo, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import type { Appointment, DayProfCardTheme } from "@zigoschedule/scheduler-engine";
import {
  DAY_CANCELED_CARD_THEME,
  getAppointmentCardTheme,
  getAppointmentClientName,
  getAppointmentColor,
  getAppointmentColorIsCustom,
  isCanceledStatus,
} from "@zigoschedule/scheduler-engine";
import { formatAgendaTimeRange, type AppointmentColorMode } from "@zigoschedule/scheduler-core";
import { useAgendaLocale, useAgendaMessages } from "../../config/AgendaConfigContext";

type AgendaPreviewPhase = "dragging" | "resizing" | "committing" | "reverting";

export type DragPreview = {
  agId: string;
  dayKey: string;
  profId: string | null;
  minute: number;
  durationMinutes: number;
  blockedMessage: string | null;
  phase: AgendaPreviewPhase;
};

export type ResizePreview = {
  agId: string;
  dayKey: string;
  profId: string | null;
  startMinute: number;
  endMinute: number;
  blockedMessage: string | null;
  phase: AgendaPreviewPhase;
};

export type AgendaDragOverlayHandle = {
  setDragPreview: (p: DragPreview | null) => void;
  setResizePreview: (p: ResizePreview | null) => void;
  setDraggedAg: (ag: Appointment | null) => void;
};

type AgendaDragOverlayProps = {
  dayColRefs: MutableRefObject<Map<string, HTMLDivElement>>;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  startDay: number;
  endDay: number;
  gridMin: number;
  slotHeight: number;
  dayMinuteToPx: (minute: number, colHeight: number) => number;
  getProfCardTheme: (profId?: string | null) => DayProfCardTheme;
  getAppointmentServiceLabel: (ag: Appointment, short?: boolean) => string;
  /**
   * Same color inputs as the card. The preview must use both, otherwise it
   * paints by professional while the card paints by appointment color, making the
   * appointment appear to change color during drag.
   */
  appointmentColorMode: AppointmentColorMode;
  appointmentDefaultColor: string;
};

export const AgendaDragOverlay = memo(forwardRef<AgendaDragOverlayHandle, AgendaDragOverlayProps>(function AgendaDragOverlay({
  dayColRefs,
  scrollRef,
  startDay,
  endDay,
  gridMin,
  slotHeight,
  dayMinuteToPx,
  getProfCardTheme: resolveProfCardTheme,
  getAppointmentServiceLabel: formatAppointmentServiceLabel,
  appointmentColorMode,
  appointmentDefaultColor,
}, ref) {
  const previewDivRef = useRef<HTMLDivElement | null>(null);
  const prevColKeyRef = useRef<string | null>(null);
  const lastBaseTopRef = useRef(0);
  const lastBaseHeightRef = useRef(0);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const [resizePreview, setResizePreview] = useState<ResizePreview | null>(null);
  const [draggedAg, setDraggedAg] = useState<Appointment | null>(null);
  const locale = useAgendaLocale();
  const messages = useAgendaMessages();

  useImperativeHandle(ref, () => ({
    setDragPreview,
    setResizePreview,
    setDraggedAg,
  }), []);

  const activePreview = useMemo(
    () =>
      dragPreview
        ? {
            agId: dragPreview.agId,
            dayKey: dragPreview.dayKey,
            profId: dragPreview.profId,
            startMinute: dragPreview.minute,
            endMinute: dragPreview.minute + dragPreview.durationMinutes,
            blockedMessage: dragPreview.blockedMessage,
            phase: dragPreview.phase,
          }
        : resizePreview
          ? {
              agId: resizePreview.agId,
              dayKey: resizePreview.dayKey,
              profId: resizePreview.profId,
              startMinute: resizePreview.startMinute,
              endMinute: resizePreview.endMinute,
              blockedMessage: resizePreview.blockedMessage,
              phase: resizePreview.phase,
            }
          : null,
    [dragPreview, resizePreview],
  );

  useEffect(() => {
    const previewEl = previewDivRef.current;
    if (!previewEl) return;

    const hidePreview = () => {
      previewEl.style.display = "none";
      previewEl.style.transform = "none";
      previewEl.style.transition = "none";
      prevColKeyRef.current = null;
      lastBaseTopRef.current = 0;
      lastBaseHeightRef.current = 0;
    };

    if (!activePreview || !draggedAg) {
      hidePreview();
      return;
    }

    const scrollEl = scrollRef.current;
    const expectedProfId = activePreview.profId || "";
    const exactKey = `${activePreview.dayKey}-${expectedProfId}`;
    const exactEl = dayColRefs.current.get(exactKey) ?? null;
    const fallbackEntry =
      Array.from(dayColRefs.current.entries()).find(
        ([, el]) => el.dataset.dndDay === activePreview.dayKey && (el.dataset.dndProf || "") === expectedProfId,
      ) ??
      Array.from(dayColRefs.current.entries()).find(
        ([, el]) => el.dataset.dndDay === activePreview.dayKey && !(el.dataset.dndProf || ""),
      ) ??
      null;
    const colKey = exactEl ? exactKey : fallbackEntry?.[0] ?? exactKey;
    const colEl = exactEl ?? fallbackEntry?.[1] ?? null;

    if (!scrollEl || !colEl) {
      hidePreview();
      return;
    }

    const visibleStart = Math.max(startDay, activePreview.startMinute);
    const visibleEnd = Math.min(endDay, activePreview.endMinute);
    if (visibleEnd <= visibleStart) {
      hidePreview();
      return;
    }

    const colHeight = colEl.clientHeight;
    const top = dayMinuteToPx(visibleStart, colHeight);
    const preEnd = dayMinuteToPx(visibleEnd, colHeight);
    const height = Math.max(slotHeight, preEnd - top);
    const colRect = colEl.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();
    const left = colRect.left - scrollRect.left + scrollEl.scrollLeft + 8;
    const width = Math.max(1, colEl.clientWidth - 16);

    previewEl.style.display = "block";
    previewEl.style.position = "absolute";
    previewEl.style.zIndex = "48";
    previewEl.style.pointerEvents = "none";

    const columnChanged = prevColKeyRef.current !== colKey;
    if (columnChanged) {
      previewEl.style.transition = "none";
      previewEl.style.transform = "none";
      previewEl.style.top = `${top}px`;
      previewEl.style.left = `${left}px`;
      previewEl.style.width = `${width}px`;
      previewEl.style.height = `${height}px`;
      prevColKeyRef.current = colKey;
      lastBaseTopRef.current = top;
      lastBaseHeightRef.current = height;
      return;
    }

    const nextLeft = `${left}px`;
    const nextWidth = `${width}px`;
    if (previewEl.style.left !== nextLeft) previewEl.style.left = nextLeft;
    if (previewEl.style.width !== nextWidth) previewEl.style.width = nextWidth;

    const deltaY = top - lastBaseTopRef.current;
    previewEl.style.transition = "transform 75ms ease-out";
    previewEl.style.transform = deltaY === 0 ? "none" : `translateY(${deltaY}px)`;

    if (height !== lastBaseHeightRef.current) {
      previewEl.style.height = `${height}px`;
      lastBaseHeightRef.current = height;
    }
  }, [activePreview, dayColRefs, dayMinuteToPx, draggedAg, endDay, scrollRef, slotHeight, startDay]);

  /**
   * The preview uses the appointment color, just like the card.
   *
   * This used to call `resolveProfCardTheme(profId)`, which picks from the
   * internal professional palette. A user could hold a custom purple card, see it
   * turn blue while dragging, and watch it return to purple after dropping.
   *
   * The card resolves through `getAppointmentCardTheme`; the preview now follows
   * the same path with the same appointment. Without `draggedAg`, during the tiny
   * gap between gesture start and state update, it falls back to the old
   * professional theme.
   */
  const theme = draggedAg
    ? isCanceledStatus(draggedAg.status)
      ? DAY_CANCELED_CARD_THEME
      : getAppointmentCardTheme({
          appointmentColor: getAppointmentColor(draggedAg),
          appointmentColorIsCustom: getAppointmentColorIsCustom(draggedAg),
          mode: appointmentColorMode,
          defaultColor: appointmentDefaultColor,
        })
    : resolveProfCardTheme(activePreview?.profId);
  const blocked = Boolean(activePreview?.blockedMessage) || activePreview?.phase === "reverting";
  const committing = activePreview?.phase === "committing";
  const previewDuration = activePreview ? Math.max(gridMin, activePreview.endMinute - activePreview.startMinute) : gridMin;
  const estimatedHeight = Math.max(slotHeight, (previewDuration / gridMin) * slotHeight);
  const isTiny = estimatedHeight < 30;
  const isCompact = estimatedHeight < 46;
  const canShowBlockedMessage = estimatedHeight >= 58;
  const canShowCommitMessage = committing && estimatedHeight >= 58;

  return (
    <div
      ref={previewDivRef}
      className={`pointer-events-none overflow-hidden rounded-md border text-left shadow-lg transition-colors duration-100 ${
        blocked
          ? "border-[#EF4444] bg-[#FEF2F2] ring-2 ring-[#FECACA] opacity-90 scale-[0.985]"
          : committing
            ? "border-[#0284C7] bg-[#E0F2FE] ring-2 ring-[#0284C7]/30 opacity-95"
            : `${theme.borderClass} ${theme.bgClass} ring-2 ring-[#0284C7]/25`
      }`}
      style={{
        display: "none",
        position: "absolute",
        zIndex: 48,
        transform: "none",
        transition: "none",
      }}
    >
      {activePreview && draggedAg && (
        <>
          <div className={`px-2 pt-1.5 text-[11px] font-semibold ${blocked ? "text-[#B91C1C]" : committing ? "text-[#075985]" : theme.timeClass}`}>
            {formatAgendaTimeRange(activePreview.startMinute, activePreview.endMinute, locale)}
          </div>
          {!isTiny && (
            <div className={`px-2 text-[12px] font-semibold truncate ${blocked ? "text-[#991B1B]" : committing ? "text-[#0C4A6E]" : theme.clientClass}`}>
              {getAppointmentClientName(draggedAg) || messages.appointment}
            </div>
          )}
          {!isCompact && (
            <div className={`px-2 text-[11px] font-medium truncate ${blocked ? "text-[#B91C1C]" : committing ? "text-[#0369A1]" : theme.serviceClass}`}>
              {formatAppointmentServiceLabel(draggedAg, true)}
            </div>
          )}
          {blocked && canShowBlockedMessage && (
            <div className="px-2 pb-1 pt-0.5 text-[10px] font-semibold text-[#B91C1C] truncate">
              {activePreview.blockedMessage ?? messages.occupiedSlot}
            </div>
          )}
          {canShowCommitMessage && (
            <div className="px-2 pb-1 pt-0.5 text-[10px] font-semibold text-[#0369A1] truncate">
              {messages.updating}
            </div>
          )}
        </>
      )}
    </div>
  );
}));
