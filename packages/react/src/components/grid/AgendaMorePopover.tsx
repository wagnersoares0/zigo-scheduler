"use client";

import { memo, useRef } from "react";
import type { CSSProperties } from "react";
import { X } from "lucide-react";
import type {
  AppointmentColor,
  AppointmentColorMode,
} from "@zigoschedule/scheduler-core";
import { formatAgendaTime, formatAgendaTimeRange } from "@zigoschedule/scheduler-core";
import type { Appointment, Block, Professional } from "@zigoschedule/scheduler-engine";
import {
  DAY_CANCELED_CARD_THEME,
  getAppointmentCardTheme,
  getAppointmentClientName,
  getAppointmentColor,
  getAppointmentColorIsCustom,
  getAppointmentStartsAt,
  getBlockEndTime,
  getBlockProfessionalId,
  getBlockReason,
  getBlockStartTime,
  getProfessionalCardThemeForVisibleList,
  isCanceledStatus,
} from "@zigoschedule/scheduler-engine";
import { toMin, zoneMins } from "@zigoschedule/scheduler-engine";
import { getAppointmentServiceLabel } from "@zigoschedule/scheduler-engine";
import {
  appointmentToAgendaEventInput,
  blockToAgendaEventInput,
  type AgendaNativeInteractionEvent,
  type AgendaResolvedOptions,
  type AgendaViewId,
} from "@zigoschedule/scheduler-engine";
import {
  AgendaEventContent,
  AgendaEventTooltip,
  useAgendaEventRender,
  useAgendaEventTooltip,
} from "../events/AgendaEventContent";
import {
  useAgendaLocale,
  useAgendaMessages,
  useAgendaTimeZone,
} from "../../config/AgendaConfigContext";

export type AgendaMonthMoreItem =
  | { kind: "ag"; ag: Appointment; start: number }
  | { kind: "bloq"; bloq: Block; start: number };

export type AgendaMorePopoverAnchorRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
};

type Props = {
  dayKey: string;
  items: AgendaMonthMoreItem[];
  anchorRect?: AgendaMorePopoverAnchorRect;
  themeProfs?: Professional[];
  appointmentColorMode: AppointmentColorMode;
  appointmentDefaultColor: AppointmentColor;
  onClose: () => void;
  onOpenAgendamento: (
    ag: Appointment,
    dayKey: string,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
  onOpenBloqueio: (
    bloq: Block,
    dayKey: string,
    start: number,
    end: number,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
};

const POPOVER_WIDTH_PX = 360;
const POPOVER_ESTIMATED_HEIGHT_PX = 420;
const POPOVER_VIEWPORT_PADDING_PX = 16;
const POPOVER_ANCHOR_GAP_PX = 8;

const getPopoverStyle = (
  anchorRect?: AgendaMorePopoverAnchorRect,
): CSSProperties => {
  if (!anchorRect || typeof window === "undefined") {
    return {
      top: 64,
      left: "50%",
      transform: "translateX(-50%)",
      width: POPOVER_WIDTH_PX,
    };
  }

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(
    POPOVER_WIDTH_PX,
    Math.max(280, viewportWidth - POPOVER_VIEWPORT_PADDING_PX * 2),
  );
  const estimatedHeight = Math.min(
    POPOVER_ESTIMATED_HEIGHT_PX,
    viewportHeight - POPOVER_VIEWPORT_PADDING_PX * 2,
  );
  const belowTop = anchorRect.bottom + POPOVER_ANCHOR_GAP_PX;
  const aboveTop = anchorRect.top - POPOVER_ANCHOR_GAP_PX - estimatedHeight;
  const hasRoomBelow =
    belowTop + estimatedHeight <= viewportHeight - POPOVER_VIEWPORT_PADDING_PX;
  const top = hasRoomBelow
    ? belowTop
    : Math.max(POPOVER_VIEWPORT_PADDING_PX, aboveTop);
  const maxLeft = Math.max(
    POPOVER_VIEWPORT_PADDING_PX,
    viewportWidth - width - POPOVER_VIEWPORT_PADDING_PX,
  );
  const left = Math.min(
    Math.max(POPOVER_VIEWPORT_PADDING_PX, anchorRect.left),
    maxLeft,
  );

  return { top, left, width };
};

const getDayLabel = (dayKey: string, locale: string): string => {
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!year || !month || !day) return dayKey;
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(year, month - 1, day, 12, 0, 0, 0));
};

type PopoverAppointmentButtonProps = {
  ag: Appointment;
  dayKey: string;
  appointmentColorMode: AppointmentColorMode;
  appointmentDefaultColor: AppointmentColor;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
  onClose: () => void;
  onOpenAgendamento: (
    ag: Appointment,
    dayKey: string,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
};

const PopoverAppointmentButton = memo(function PopoverAppointmentButton({
  ag,
  dayKey,
  appointmentColorMode,
  appointmentDefaultColor,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
  onClose,
  onOpenAgendamento,
}: PopoverAppointmentButtonProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const locale = useAgendaLocale();
  const timeZone = useAgendaTimeZone();
  const messages = useAgendaMessages();
  const clientName = getAppointmentClientName(ag) || messages.appointment;
  const start = zoneMins(getAppointmentStartsAt(ag), timeZone);
  const isCanceled = isCanceledStatus(ag.status);
  const theme = isCanceled
    ? DAY_CANCELED_CARD_THEME
    : getAppointmentCardTheme({
        appointmentColor: getAppointmentColor(ag),
        appointmentColorIsCustom: getAppointmentColorIsCustom(ag),
        mode: appointmentColorMode,
        defaultColor: appointmentDefaultColor,
      });
  const event = appointmentToAgendaEventInput(ag, timeZone);
  const { dispatchMouseEnter, dispatchMouseLeave, optionClassName, renderArg } =
    useAgendaEventRender({
      options: calendarOptions,
      event,
      view: calendarView,
      display: "popover",
      density: "regular",
      timeText: formatAgendaTime(start, locale),
      title: clientName,
      subtitle: getAppointmentServiceLabel(ag),
      elementRef: btnRef,
      onCallbackError: onAgendaCallbackError,
    });
  const {
    hideTooltip,
    showTooltipFromElement,
    showTooltipFromMouseEvent,
    tooltip,
  } = useAgendaEventTooltip({
    renderArg,
    elementRef: btnRef,
  });

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={messages.openAppointment(clientName)}
        onClick={(ev) => {
          onClose();
          onOpenAgendamento(ag, dayKey, ev.nativeEvent);
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
        className={`w-full rounded-sm border px-2 py-1.5 text-left transition-colors ${theme.borderClass} ${theme.bgClass} ${theme.hoverClass} ${theme.ringClass} ${optionClassName}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`w-11 shrink-0 text-[12px] font-semibold tabular-nums ${theme.timeClass}`}
          >
            {renderArg.timeText}
          </span>
          <span className="min-w-0 flex-1">
            <AgendaEventContent
              options={calendarOptions}
              renderArg={renderArg}
              timeClassName="hidden"
              titleClassName={`block truncate text-[13px] font-semibold ${theme.clientClass}`}
              subtitleClassName={`block truncate text-[11px] ${theme.serviceClass}`}
              badgeClassName="mt-1"
              showTime={false}
              showStatusBadge={isCanceled}
            />
          </span>
        </div>
      </button>
      <AgendaEventTooltip tooltip={tooltip} />
    </>
  );
});

type PopoverBlockButtonProps = {
  bloq: Block;
  dayKey: string;
  themeProfs?: Professional[];
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
  onClose: () => void;
  onOpenBloqueio: (
    bloq: Block,
    dayKey: string,
    start: number,
    end: number,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
};

const PopoverBlockButton = memo(function PopoverBlockButton({
  bloq,
  dayKey,
  themeProfs,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
  onClose,
  onOpenBloqueio,
}: PopoverBlockButtonProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const locale = useAgendaLocale();
  const timeZone = useAgendaTimeZone();
  const messages = useAgendaMessages();
  const blockProfessionalId = getBlockProfessionalId(bloq);
  const start = toMin(getBlockStartTime(bloq));
  const end = toMin(getBlockEndTime(bloq));
  const rangeText = formatAgendaTimeRange(start, end, locale);
  const theme = blockProfessionalId
    ? getProfessionalCardThemeForVisibleList(blockProfessionalId, themeProfs)
    : null;
  const event = blockToAgendaEventInput(bloq, timeZone);
  const { dispatchMouseEnter, dispatchMouseLeave, optionClassName, renderArg } =
    useAgendaEventRender({
      options: calendarOptions,
      event,
      view: calendarView,
      display: "popover",
      density: "regular",
      timeText: formatAgendaTime(start, locale),
      title: getBlockReason(bloq) ?? messages.block,
      subtitle: rangeText,
      elementRef: btnRef,
      onCallbackError: onAgendaCallbackError,
    });
  const {
    hideTooltip,
    showTooltipFromElement,
    showTooltipFromMouseEvent,
    tooltip,
  } = useAgendaEventTooltip({
    renderArg,
    elementRef: btnRef,
  });

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={messages.openBlock(formatAgendaTime(start, locale), formatAgendaTime(end, locale))}
        onClick={(ev) => {
          onClose();
          onOpenBloqueio(bloq, dayKey, start, end, ev.nativeEvent);
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
        className={`w-full rounded-sm border px-2 py-1.5 text-left transition-colors ${
          theme
            ? `${theme.borderClass} ${theme.bgClass} ${theme.hoverClass} ${theme.ringClass}`
            : "border-[#D1D5DB] bg-[#F3F4F6] hover:bg-[#E5E7EB]"
        } ${optionClassName}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`w-11 shrink-0 text-[12px] font-semibold tabular-nums ${theme ? theme.timeClass : "text-[#475569]"}`}
          >
            {renderArg.timeText}
          </span>
          <span className="min-w-0 flex-1">
            <AgendaEventContent
              options={calendarOptions}
              renderArg={renderArg}
              timeClassName="hidden"
              titleClassName={`block truncate text-[13px] font-semibold ${theme ? theme.clientClass : "text-[#334155]"}`}
              subtitleClassName={`block truncate text-[11px] ${theme ? theme.serviceClass : "text-[#64748B]"}`}
              showTime={false}
              showSourceBadge
            />
          </span>
        </div>
      </button>
      <AgendaEventTooltip tooltip={tooltip} />
    </>
  );
});

export function AgendaMorePopover({
  dayKey,
  items,
  anchorRect,
  themeProfs,
  appointmentColorMode,
  appointmentDefaultColor,
  onClose,
  onOpenAgendamento,
  onOpenBloqueio,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
}: Props) {
  const sortedItems = [...items].sort((a, b) => a.start - b.start);
  const popoverStyle = getPopoverStyle(anchorRect);
  const locale = useAgendaLocale();
  const messages = useAgendaMessages();

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label={messages.closeDayList}
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${messages.agenda}: ${dayKey}`}
        style={popoverStyle}
        className="fixed z-10 flex max-h-[min(640px,calc(100vh-96px))] max-w-[360px] flex-col overflow-hidden rounded-sm border border-[#9CA3AF] bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-[#D1D5DB] bg-[#F8FAFC] px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold capitalize text-[#0F172A]">
              {getDayLabel(dayKey, locale)}
            </p>
            <p className="text-[11px] text-[#64748B]">
              {messages.remainingItems(sortedItems.length)}
            </p>
          </div>
          <button
            type="button"
            aria-label={messages.close}
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-sm border border-[#D1D5DB] bg-white text-[#475569] transition-colors hover:bg-[#F3F4F6] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto p-2">
          <div className="space-y-1">
            {sortedItems.map((item) => {
              if (item.kind === "ag") {
                return (
                  <PopoverAppointmentButton
                    key={`more-ag-${item.ag.id}`}
                    ag={item.ag}
                    dayKey={dayKey}
                    appointmentColorMode={appointmentColorMode}
                    appointmentDefaultColor={appointmentDefaultColor}
                    calendarOptions={calendarOptions}
                    calendarView={calendarView}
                    onAgendaCallbackError={onAgendaCallbackError}
                    onClose={onClose}
                    onOpenAgendamento={onOpenAgendamento}
                  />
                );
              }

              return (
                <PopoverBlockButton
                  key={`more-bloq-${item.bloq.id}`}
                  bloq={item.bloq}
                  dayKey={dayKey}
                  themeProfs={themeProfs}
                  calendarOptions={calendarOptions}
                  calendarView={calendarView}
                  onAgendaCallbackError={onAgendaCallbackError}
                  onClose={onClose}
                  onOpenBloqueio={onOpenBloqueio}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
