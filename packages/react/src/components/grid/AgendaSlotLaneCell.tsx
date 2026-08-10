"use client";
import { memo, useMemo, useRef } from "react";
import type { AgendaResolvedOptions, AgendaViewId } from "@zigoschedule/scheduler-engine";
import { toHHMM } from "@zigoschedule/scheduler-engine";
import { zonedTimeToUtc, type TimeZone } from "@zigoschedule/scheduler-core";
import {
  AgendaSlotLaneContent,
  useAgendaSlotLaneRender,
} from "./AgendaCellRenderHooks";
import { useAgendaTimeZone } from "../../config/AgendaConfigContext";

const buildDataHora = (
  dayKey: string,
  minute: number,
  timeZone: TimeZone,
): string => zonedTimeToUtc(dayKey, minute, timeZone).toISOString();

type AgendaSlotLaneCellProps = {
  minute: number;
  dayKey: string;
  resourceId: string | null;
  top: number;
  height: number;
  isMajor: boolean;
  timeGridStyle?: boolean;
  isBusinessHour: boolean;
  isPast: boolean;
  isToday: boolean;
  isPausa: boolean;
  isClosed: boolean;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
};

export const AgendaSlotLaneCell = memo(function AgendaSlotLaneCell({
  minute,
  dayKey,
  resourceId,
  top,
  height,
  isMajor,
  timeGridStyle = false,
  isBusinessHour,
  isPast,
  isToday,
  isPausa,
  isClosed,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
}: AgendaSlotLaneCellProps) {
  const laneRef = useRef<HTMLDivElement | null>(null);
  const timeZone = useAgendaTimeZone();
  const date = useMemo(() => new Date(buildDataHora(dayKey, minute, timeZone)), [dayKey, minute, timeZone]);
  const { optionClassName, renderArg } = useAgendaSlotLaneRender({
    options: calendarOptions,
    date,
    dateStr: dayKey,
    timeText: toHHMM(minute),
    minute,
    view: calendarView,
    resourceId,
    isMajor,
    isBusinessHour,
    isPast,
    isToday,
    isPausa,
    isClosed,
    elementRef: laneRef,
    onCallbackError: onAgendaCallbackError,
  });

  return (
    <div
      ref={laneRef}
      aria-hidden="true"
      data-time={toHHMM(minute)}
      className={`pointer-events-none absolute left-0 right-0 z-[7] overflow-hidden ${
        timeGridStyle
          ? `${isMajor ? "border-t border-[#D1D5DB]" : "border-t border-[#E5E7EB]"} ${isBusinessHour ? "bg-transparent" : "bg-[#F8FAFC]/55"}`
          : ""
      } ${optionClassName}`}
      style={{ top, height }}
    >
      <AgendaSlotLaneContent options={calendarOptions} renderArg={renderArg} />
    </div>
  );
});
