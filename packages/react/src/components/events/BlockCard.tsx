"use client";

import { memo, useMemo, useRef } from "react";
import type { Block, DayProfCardTheme } from "@zigoschedule/scheduler-engine";
import {
  blockToAgendaEventInput,
  type AgendaNativeInteractionEvent,
  type AgendaResolvedOptions,
  type AgendaViewId,
} from "@zigoschedule/scheduler-engine";
import { formatAgendaTime, formatAgendaTimeRange } from "@zigoschedule/scheduler-core";
import {
  AgendaEventContent,
  AgendaEventTooltip,
  useAgendaEventRender,
  useAgendaEventTooltip,
} from "./AgendaEventContent";
import { useAgendaLocale, useAgendaMessages } from "../../config/AgendaConfigContext";

type BloqCardProps = {
  bloq: Block;
  dayKey: string;
  s: number;
  e: number;
  top: number;
  height: number;
  left: string;
  width: string;
  theme: DayProfCardTheme | null;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
  onOpen: (bloq: Block, dayKey: string, s: number, e: number, jsEvent?: AgendaNativeInteractionEvent) => void;
};

export const BloqCard = memo(function BloqCard({
  bloq,
  dayKey,
  s,
  e,
  top,
  height,
  left,
  width,
  theme,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
  onOpen,
}: BloqCardProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const locale = useAgendaLocale();
  const messages = useAgendaMessages();
  const isTiny = height < 34;
  const event = useMemo(() => blockToAgendaEventInput(bloq), [bloq]);
  const blockTitle = bloq.motivo?.trim() || messages.block;
  const rangeText = formatAgendaTimeRange(s, e, locale);
  const timeText = isTiny
    ? `${rangeText} • ${messages.block}`
    : rangeText;
  const { dispatchMouseEnter, dispatchMouseLeave, optionClassName, renderArg } = useAgendaEventRender({
    options: calendarOptions,
    event,
    view: calendarView,
    display: "timeGrid",
    density: isTiny ? "tiny" : height < 50 ? "compact" : "regular",
    timeText,
    title: blockTitle,
    subtitle: "",
    elementRef: btnRef,
    onCallbackError: onAgendaCallbackError,
  });
  const { hideTooltip, showTooltipFromElement, showTooltipFromMouseEvent, tooltip } = useAgendaEventTooltip({
    renderArg,
    elementRef: btnRef,
  });
  return (
    <>
    <button
      ref={btnRef}
      type="button"
      aria-label={messages.openBlock(formatAgendaTime(s, locale), formatAgendaTime(e, locale))}
      onClick={(ev) => { ev.stopPropagation(); onOpen(bloq, dayKey, s, e, ev.nativeEvent); }}
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
      className={`absolute overflow-hidden rounded-sm border z-[40] text-left transition-colors ${
        theme
          ? `${theme.borderClass} ${theme.bgClass} ${theme.hoverClass} ${theme.ringClass}`
          : "border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9]"
      } ${optionClassName}`}
      style={{ top, height, left, width }}
    >
      <AgendaEventContent
        options={calendarOptions}
        renderArg={renderArg}
        timeClassName={`px-2 pt-1 text-[11px] font-medium ${theme ? theme.timeClass : "text-[#334155]"}`}
        titleClassName={`px-2 text-[10px] ${theme ? theme.serviceClass : "text-[#64748B]"}`}
        subtitleClassName="px-2 pb-1 text-[9px] font-semibold uppercase tracking-wide text-[#1D4ED8]"
        showTitle={!isTiny}
        showSubtitle={false}
        showSourceBadge={false}
      />
      {!isTiny && (
        <div className={`hidden px-2 text-[10px] truncate ${theme ? theme.serviceClass : "text-[#64748B]"}`}>
          {blockTitle}
        </div>
      )}
    </button>
    <AgendaEventTooltip tooltip={tooltip} />
    </>
  );
});
