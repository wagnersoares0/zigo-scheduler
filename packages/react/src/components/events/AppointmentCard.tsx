"use client";

import { memo, useEffect, useMemo, useRef } from "react";
import type { Appointment, DayProfCardTheme } from "@zigoschedule/scheduler-engine";
import { AgendaElementDragging } from "@zigoschedule/scheduler-interaction";
import type { DragPayload, DraggableCallbacks } from "@zigoschedule/scheduler-interaction";
import { AgendaEventResizing } from "@zigoschedule/scheduler-interaction";
import type { ResizableCallbacks, ResizePayload } from "@zigoschedule/scheduler-interaction";
import {
  appointmentToAgendaEventInput,
  type AgendaNativeInteractionEvent,
  type AgendaResolvedOptions,
  type AgendaViewId,
} from "@zigoschedule/scheduler-engine";
import { getAppointmentServiceLabel } from "@zigoschedule/scheduler-engine";
import { formatAgendaTime, formatAgendaTimeRange } from "@zigoschedule/scheduler-core";
import { truncateProfessionalName } from "@zigoschedule/scheduler-engine";
import { getAgendaAppointmentCardStatus } from "@zigoschedule/scheduler-engine";
import { getAppointmentClientName } from "@zigoschedule/scheduler-engine";
import {
  AgendaEventTooltip,
  useAgendaEventRender,
  useAgendaEventTooltip,
} from "./AgendaEventContent";
import { DayAppointmentCard } from "./DayAppointmentCard";
import { WeekAppointmentCard } from "./WeekAppointmentCard";
import { useAgendaLocale, useAgendaMessages } from "../../config/AgendaConfigContext";

const getProfessionalInitials = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const initials = parts.length > 1
    ? `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`
    : (parts[0] ?? "").slice(0, 2);

  return initials.toUpperCase();
};

type AppointmentCardVariant = "day" | "week";

type AgCardProps = {
  ag: Appointment;
  dayKey: string;
  s: number;
  e: number;
  top: number;
  height: number;
  left: string;
  width: string;
  theme: DayProfCardTheme;
  isCanceled: boolean;
  isPendingMutation: boolean;
  agDuracao: number;
  agProfId: string | null;
  professionalName?: string;
  showProfessionalName?: boolean;
  cardVariant?: AppointmentCardVariant;
  compactOverlap?: boolean;
  gridMin: number;
  canDrag: boolean;
  canResize: boolean;
  dndCallbacks: DraggableCallbacks;
  resizeCallbacks: ResizableCallbacks;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
  onOpen: (ag: Appointment, dayKey: string, s: number, e: number, jsEvent?: AgendaNativeInteractionEvent) => void;
};

export const AgCard = memo(function AgCard({
  ag,
  dayKey,
  s,
  e,
  top,
  height,
  left,
  width,
  theme,
  isCanceled,
  isPendingMutation,
  agDuracao,
  agProfId,
  professionalName,
  showProfessionalName = false,
  cardVariant = "day",
  compactOverlap = false,
  gridMin,
  canDrag,
  canResize,
  dndCallbacks,
  resizeCallbacks,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
  onOpen,
}: AgCardProps) {
  const messages = useAgendaMessages();
  const locale = useAgendaLocale();
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const resizeStartHandleRef = useRef<HTMLSpanElement | null>(null);
  const resizeHandleRef = useRef<HTMLSpanElement | null>(null);
  const cbsRef = useRef<DraggableCallbacks>(dndCallbacks);
  const resizeCbsRef = useRef<ResizableCallbacks>(resizeCallbacks);
  const suppressClickRef = useRef(false);
  const isTiny = height < 30;
  const isCompact = height < 46;
  const canShowStatusBadge = compactOverlap ? height >= 62 : height >= 58;
  const cardStatus = getAgendaAppointmentCardStatus({
    appointment: ag,
    dayKey,
    endMinute: e,
  });
  const event = useMemo(() => appointmentToAgendaEventInput(ag), [ag]);
  const clientName = getAppointmentClientName(ag) || messages.appointment;
  const serviceLabel = getAppointmentServiceLabel(ag, true);
  const compactProfessionalDisplayName = professionalName ? truncateProfessionalName(professionalName, 13) : "";
  // The service owns the subtitle. The professional gets its own `meta` line
  // when it fits, or initials in the badge when it does not. Showing the same
  // name in both places made compact cards noisy.
  const subtitle = compactOverlap && showProfessionalName && professionalName
    ? compactProfessionalDisplayName
    : serviceLabel;
  const metaText = !compactOverlap && showProfessionalName && professionalName
    ? professionalName
    : "";
  const showMeta = Boolean(metaText) && height >= 56;
  const shouldShowSubtitle = compactOverlap ? height >= 42 : showProfessionalName ? height >= 34 : !isCompact;
  // Badge only when the professional line does not fit. Initials read better
  // than a name chopped in the middle.
  const professionalBadge = !compactOverlap && showProfessionalName && professionalName && !showMeta
    ? {
        label: professionalName,
        text: getProfessionalInitials(professionalName),
        compact: true,
      }
    : null;
  const contentRightPadding = professionalBadge ? "pr-14" : "";
  const titleClassName = compactOverlap ? "px-1 text-[10px]" : "px-1.5 text-[12px]";
  const subtitleClassName = compactOverlap
    ? "px-1 text-[10px]"
    : `px-1.5 ${isCanceled ? "pb-0.5" : "pb-1"} text-[12px]`;
  const badgeClassName = compactOverlap ? "px-1 pb-0.5" : "px-2 pb-1";
  const timeText = formatAgendaTimeRange(s, e, locale);
  const compactTimeText = `${formatAgendaTime(s, locale)}-${formatAgendaTime(e, locale)}`;
  const { dispatchMouseEnter, dispatchMouseLeave, optionClassName, renderArg } = useAgendaEventRender({
    options: calendarOptions,
    event,
    view: calendarView,
    display: "timeGrid",
    density: isTiny ? "tiny" : isCompact ? "compact" : "regular",
    timeText,
    title: clientName,
    subtitle,
    isPending: isPendingMutation,
    elementRef: btnRef,
    onCallbackError: onAgendaCallbackError,
  });
  const { hideTooltip, showTooltipFromElement, showTooltipFromMouseEvent, tooltip } = useAgendaEventTooltip({
    renderArg,
    elementRef: btnRef,
  });
  cbsRef.current = dndCallbacks;
  resizeCbsRef.current = resizeCallbacks;

  useEffect(() => {
    const el = btnRef.current;
    if (!el || !canDrag) return;
    const payload: DragPayload = {
      agId: ag.id,
      startMinute: s,
      durationMinutes: agDuracao,
      profId: agProfId,
      dayKey,
    };
    const wrapped: DraggableCallbacks = {
      onDragStart: (p, hit) => {
        suppressClickRef.current = true;
        if (btnRef.current) {
          btnRef.current.style.opacity = "0";
          btnRef.current.style.pointerEvents = "none";
        }
        cbsRef.current.onDragStart?.(p, hit);
      },
      onDragMove: (p, hit, nextStartMinute, x, y) =>
        cbsRef.current.onDragMove?.(p, hit, nextStartMinute, x, y),
      onDrop: (r) => {
        const result = cbsRef.current.onDrop?.(r);
        void Promise.resolve(result).finally(() => {
          window.setTimeout(() => {
            suppressClickRef.current = false;
            if (btnRef.current) {
              btnRef.current.style.opacity = "";
              btnRef.current.style.pointerEvents = "";
            }
          }, 0);
        });
      },
      onDragCancel: (id) => {
        cbsRef.current.onDragCancel?.(id);
        window.setTimeout(() => {
          suppressClickRef.current = false;
          if (btnRef.current) {
            btnRef.current.style.transition = "opacity 150ms ease-out";
            btnRef.current.style.opacity = "";
            btnRef.current.style.pointerEvents = "";
            window.setTimeout(() => {
              if (btnRef.current) btnRef.current.style.transition = "";
            }, 150);
          }
        }, 200);
      },
      getScrollContainer: () => cbsRef.current.getScrollContainer(),
      hitTest: (x, y) => cbsRef.current.hitTest(x, y),
      prepareHits: () => cbsRef.current.prepareHits?.(),
      releaseHits: () => cbsRef.current.releaseHits?.(),
    };
    const dnd = new AgendaElementDragging(el, payload, wrapped);
    return () => dnd.destroy();
  }, [ag.id, agDuracao, agProfId, canDrag, dayKey, s]);

  useEffect(() => {
    const el = resizeHandleRef.current;
    if (!el || !canResize) return;
    const payload: ResizePayload = {
      agId: ag.id,
      dayKey,
      profId: agProfId,
      startMinute: s,
      endMinute: e,
      snapMinutes: gridMin,
      direction: "end",
    };
    const wrapped: ResizableCallbacks = {
      onResizeStart: (p) => {
        suppressClickRef.current = true;
        if (btnRef.current) {
          btnRef.current.style.opacity = "0";
          btnRef.current.style.pointerEvents = "none";
        }
        resizeCbsRef.current.onResizeStart?.(p);
      },
      onResizeMove: (p, hit, nextEndMinute) =>
        resizeCbsRef.current.onResizeMove?.(p, hit, nextEndMinute),
      onResizeEnd: (r) => {
        const result = resizeCbsRef.current.onResizeEnd?.(r);
        void Promise.resolve(result).finally(() => {
          window.setTimeout(() => {
            suppressClickRef.current = false;
            if (btnRef.current) {
              btnRef.current.style.opacity = "";
              btnRef.current.style.pointerEvents = "";
            }
          }, 0);
        });
      },
      onResizeCancel: (id) => {
        resizeCbsRef.current.onResizeCancel?.(id);
        window.setTimeout(() => {
          suppressClickRef.current = false;
          if (btnRef.current) {
            btnRef.current.style.opacity = "";
            btnRef.current.style.pointerEvents = "";
          }
        }, 0);
      },
      getScrollContainer: () => resizeCbsRef.current.getScrollContainer(),
      hitTest: (x, y) => resizeCbsRef.current.hitTest(x, y),
      prepareHits: () => resizeCbsRef.current.prepareHits?.(),
      releaseHits: () => resizeCbsRef.current.releaseHits?.(),
    };
    const resizing = new AgendaEventResizing(el, payload, wrapped);
    return () => resizing.destroy();
  }, [ag.id, agProfId, canResize, dayKey, e, gridMin, s]);

  useEffect(() => {
    const el = resizeStartHandleRef.current;
    if (!el || !canResize || height < 46) return;
    const payload: ResizePayload = {
      agId: ag.id,
      dayKey,
      profId: agProfId,
      startMinute: s,
      endMinute: e,
      snapMinutes: gridMin,
      direction: "start",
    };
    const wrapped: ResizableCallbacks = {
      onResizeStart: (p) => {
        suppressClickRef.current = true;
        if (btnRef.current) {
          btnRef.current.style.opacity = "0";
          btnRef.current.style.pointerEvents = "none";
        }
        resizeCbsRef.current.onResizeStart?.(p);
      },
      onResizeMove: (p, hit, nextBoundaryMinute) =>
        resizeCbsRef.current.onResizeMove?.(p, hit, nextBoundaryMinute),
      onResizeEnd: (r) => {
        const result = resizeCbsRef.current.onResizeEnd?.(r);
        void Promise.resolve(result).finally(() => {
          window.setTimeout(() => {
            suppressClickRef.current = false;
            if (btnRef.current) {
              btnRef.current.style.opacity = "";
              btnRef.current.style.pointerEvents = "";
            }
          }, 0);
        });
      },
      onResizeCancel: (id) => {
        resizeCbsRef.current.onResizeCancel?.(id);
        window.setTimeout(() => {
          suppressClickRef.current = false;
          if (btnRef.current) {
            btnRef.current.style.opacity = "";
            btnRef.current.style.pointerEvents = "";
          }
        }, 0);
      },
      getScrollContainer: () => resizeCbsRef.current.getScrollContainer(),
      hitTest: (x, y) => resizeCbsRef.current.hitTest(x, y),
      prepareHits: () => resizeCbsRef.current.prepareHits?.(),
      releaseHits: () => resizeCbsRef.current.releaseHits?.(),
    };
    const resizing = new AgendaEventResizing(el, payload, wrapped);
    return () => resizing.destroy();
  }, [ag.id, agProfId, canResize, dayKey, e, gridMin, height, s]);

  return (
    <>
    <button
      ref={btnRef}
      type="button"
      aria-disabled={isPendingMutation}
      aria-keyshortcuts="Enter Space"
      aria-label={messages.openAppointmentDetails({
        clientName,
        start: formatAgendaTime(s, locale),
        end: formatAgendaTime(e, locale),
        service: getAppointmentServiceLabel(ag, true),
        professionalName,
        canceled: isCanceled,
      })}
      onClick={(ev) => {
        ev.stopPropagation();
        if (suppressClickRef.current || isPendingMutation) {
          ev.preventDefault();
          return;
        }
        onOpen(ag, dayKey, s, e, ev.nativeEvent);
      }}
      onMouseEnter={(ev) => {
        dispatchMouseEnter(ev.nativeEvent);
        showTooltipFromMouseEvent(ev.nativeEvent);
      }}
      onMouseMove={(ev) => showTooltipFromMouseEvent(ev.nativeEvent)}
      onMouseLeave={(ev) => {
        dispatchMouseLeave(ev.nativeEvent);
        hideTooltip();
      }}
      onFocus={showTooltipFromElement}
      onBlur={hideTooltip}
      className={`absolute min-w-0 overflow-hidden rounded-sm border z-[45] text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F172A] focus-visible:ring-offset-2 ${theme.borderClass} ${theme.bgClass} ${theme.ringClass} ${isPendingMutation ? "cursor-wait opacity-70" : `${theme.hoverClass} ${canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`} ${optionClassName}`}
      style={{ top, height, left, width, touchAction: canDrag ? "none" : "auto" }}
    >
      {isPendingMutation && (
        <span
          className={`pointer-events-none absolute top-1.5 h-1.5 w-1.5 rounded-full bg-[#0284C7] animate-pulse ${
            professionalBadge ? "left-1.5" : "right-1.5"
          }`}
        />
      )}
      {cardVariant === "week" ? (
        <WeekAppointmentCard
          calendarOptions={calendarOptions}
          renderArg={renderArg}
          theme={theme}
          professionalBadge={professionalBadge}
          compactOverlap={compactOverlap}
          cardStatus={cardStatus}
          compactTimeText={compactTimeText}
          compactProfessionalDisplayName={compactProfessionalDisplayName}
          titleClassName={titleClassName}
          subtitleClassName={subtitleClassName}
          meta={metaText}
          metaClassName={`${subtitleClassName} opacity-80`}
          showMeta={showMeta}
          badgeClassName={badgeClassName}
          contentRightPadding={contentRightPadding}
          isTiny={isTiny}
          shouldShowSubtitle={shouldShowSubtitle}
          canShowStatusBadge={canShowStatusBadge}
        />
      ) : (
        <DayAppointmentCard
          calendarOptions={calendarOptions}
          renderArg={renderArg}
          theme={theme}
          professionalBadge={professionalBadge}
          cardStatus={cardStatus}
          titleClassName={titleClassName}
          subtitleClassName={subtitleClassName}
          meta={metaText}
          metaClassName={`${subtitleClassName} opacity-80`}
          showMeta={showMeta}
          badgeClassName={badgeClassName}
          contentRightPadding={contentRightPadding}
          isTiny={isTiny}
          shouldShowSubtitle={shouldShowSubtitle}
          canShowStatusBadge={canShowStatusBadge}
        />
      )}
      {canResize && height >= 46 && (
        <span
          ref={resizeStartHandleRef}
          data-ag-resize-handle="true"
          data-ag-resize-direction="start"
          role="presentation"
          className="absolute inset-x-1 top-0 h-2 cursor-ns-resize rounded-t-md z-10"
          onClick={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
          }}
          onPointerDown={(ev) => ev.stopPropagation()}
        >
          <span className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-35" />
        </span>
      )}
      {canResize && (
        <span
          ref={resizeHandleRef}
          data-ag-resize-handle="true"
          data-ag-resize-direction="end"
          role="presentation"
          className="absolute inset-x-1 bottom-0 h-2 cursor-ns-resize rounded-b-md"
          onClick={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
          }}
          onPointerDown={(ev) => ev.stopPropagation()}
        >
          <span className="absolute left-1/2 top-1/2 h-0.5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current opacity-35" />
        </span>
      )}
    </button>
    <AgendaEventTooltip tooltip={tooltip} />
    </>
  );
});
