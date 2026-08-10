"use client";
import { memo, useRef } from "react";
import { formatAgendaAxisTimeParts } from "@zigoschedule/scheduler-core";
import type { AgendaResolvedOptions, AgendaViewId } from "@zigoschedule/scheduler-engine";
import { toHHMM } from "@zigoschedule/scheduler-engine";
import {
  AgendaSlotLabelContent,
  useAgendaSlotLabelRender,
} from "./AgendaCellRenderHooks";

type AgendaSlotLabelCellProps = {
  minute: number;
  index: number;
  isMajor: boolean;
  slotHeight: number;
  top?: number;
  showEverySlotLabel?: boolean;
  timeGridStyle?: boolean;
  boundaryLabel?: boolean;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
};

export const AgendaSlotLabelCell = memo(function AgendaSlotLabelCell({
  minute,
  index,
  isMajor,
  slotHeight,
  top,
  showEverySlotLabel = false,
  timeGridStyle = false,
  boundaryLabel = false,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
}: AgendaSlotLabelCellProps) {
  const labelRef = useRef<HTMLDivElement | null>(null);
  const { timeText, periodText } = formatAgendaAxisTimeParts(minute, calendarOptions.locale);
  const labelText = periodText ? `${timeText} ${periodText}` : timeText;
  const shouldShowLabel = showEverySlotLabel || index === 0 || minute % 60 === 0;
  const { optionClassName, renderArg } = useAgendaSlotLabelRender({
    options: calendarOptions,
    timeText: labelText,
    minute,
    view: calendarView,
    isMajor,
    elementRef: labelRef,
    onCallbackError: onAgendaCallbackError,
  });

  return (
    <div
      ref={labelRef}
      data-time={toHHMM(minute)}
      className={`${top == null ? "" : "absolute left-0 right-0"} flex items-start justify-end overflow-hidden whitespace-nowrap pl-1 pr-2 pt-1 text-[12px] font-medium leading-none tabular-nums ${
        boundaryLabel
          ? `border-t border-[#D1D5DB] ${timeGridStyle ? "bg-[#F8FAFC]" : ""} text-[#64748B]`
          : timeGridStyle
          ? `${isMajor ? "border-t border-[#D1D5DB] text-[#334155]" : "border-t border-[#E5E7EB] text-[#64748B]"} bg-[#F8FAFC]`
          : `${isMajor ? "border-t border-[#D1D5DB]" : "border-t border-[#E5E7EB]"} text-[#475569]`
      } ${optionClassName}`}
      style={top == null ? { height: slotHeight } : { top, height: slotHeight }}
    >
      <AgendaSlotLabelContent
        options={calendarOptions}
        renderArg={renderArg}
        defaultContent={
          shouldShowLabel ? (
            <span className={`relative inline-flex items-start justify-end tabular-nums ${periodText ? "pr-2.5" : ""}`}>
              <span>{timeText}</span>
              {periodText ? (
                <span className="absolute -right-0.5 -top-0.5 text-[7px] font-semibold leading-none text-[#64748B]">
                  {periodText}
                </span>
              ) : null}
            </span>
          ) : (
            ""
          )
        }
      />
    </div>
  );
});
