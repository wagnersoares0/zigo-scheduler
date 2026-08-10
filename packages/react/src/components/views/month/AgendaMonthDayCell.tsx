"use client";

import { memo, useRef } from "react";
import type { ReactNode } from "react";
import type {
  AppointmentColor,
  AppointmentColorMode,
} from "@zigoschedule/scheduler-core";
import type { Appointment, Block, Professional } from "@zigoschedule/scheduler-engine";
import {
  MONTH_DAY_CELL_HEIGHT_PX,
} from "@zigoschedule/scheduler-engine";
import {
  type AgendaResolvedOptions,
  type AgendaViewId,
  type AgendaMoreLinkAction,
  type AgendaMoreLinkClick,
  type AgendaMoreLinkText,
  type AgendaNativeInteractionEvent,
} from "@zigoschedule/scheduler-engine";
import {
} from "@zigoschedule/scheduler-engine";
import {
  AgendaDayCellContent,
  useAgendaDayCellRender,
} from "../../grid/AgendaCellRenderHooks";
import {
} from "../../events/AgendaEventContent";
import {
} from "../../grid/AgendaMorePopover";
import { useAgendaMessages } from "../../../config/AgendaConfigContext";

export type AgendaMonthViewProps = {
  date: Date;
  agsByDay: Map<string, Appointment[]>;
  bloqsByDay: Map<string, Block[]>;
  themeProfs?: Professional[];
  appointmentColorMode: AppointmentColorMode;
  appointmentDefaultColor: AppointmentColor;
  onOpenAgendamento: (
    ag: Appointment,
    dayKey: string,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
  onOpenBloqueio: (
    bloq: Block,
    dayKey: string,
    s: number,
    e: number,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
  onOpenDay: (dayKey: string, jsEvent?: AgendaNativeInteractionEvent) => void;
  onMoreLinkNavigate?: (
    action: AgendaMoreLinkAction,
    dayKey: string,
  ) => boolean;
  dayMaxEvents?: boolean | number;
  moreLinkText?: AgendaMoreLinkText;
  moreLinkClick?: AgendaMoreLinkClick;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
};


type AgendaMonthDayCellProps = {
  dayDate: Date;
  dayKey: string;
  todayKey: string;
  isToday: boolean;
  isSelected: boolean;
  weekend: boolean;
  totalItems: number;
  normalAgCount: number;
  canceledAgCount: number;
  blocksCount: number;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
  onOpenDay: (dayKey: string, jsEvent?: AgendaNativeInteractionEvent) => void;
  children: ReactNode;
};

export const AgendaMonthDayCell = memo(function AgendaMonthDayCell({
  dayDate,
  dayKey,
  todayKey,
  isToday,
  isSelected,
  weekend,
  totalItems,
  normalAgCount,
  canceledAgCount,
  blocksCount,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
  onOpenDay,
  children,
}: AgendaMonthDayCellProps) {
  const cellRef = useRef<HTMLDivElement | null>(null);
  const messages = useAgendaMessages();
  const dayNumberText = String(dayDate.getDate());
  const { optionClassName, renderArg } = useAgendaDayCellRender({
    options: calendarOptions,
    date: dayDate,
    dateStr: dayKey,
    dayNumberText,
    view: calendarView,
    isToday,
    isPast: dayKey < todayKey,
    isFuture: dayKey > todayKey,
    isWeekend: weekend,
    eventCount: totalItems,
    appointmentCount: normalAgCount + canceledAgCount,
    blockCount: blocksCount,
    elementRef: cellRef,
    onCallbackError: onAgendaCallbackError,
  });

  return (
    <div
      ref={cellRef}
      className={`flex flex-col overflow-hidden border-r border-b px-2 py-1.5 ${
        isSelected
          ? "border-[#2563EB] bg-[#EFF6FF]"
          : isToday
            ? "border-[#BFDBFE] bg-white"
            : "border-[#E5E7EB] bg-white"
      } ${optionClassName}`}
      style={{ height: `${MONTH_DAY_CELL_HEIGHT_PX}px` }}
    >
      <div className="flex items-start justify-end">
        <button
          type="button"
          aria-label={messages.openDay(dayKey)}
          onClick={(ev) => onOpenDay(dayKey, ev.nativeEvent)}
          className={`grid h-7 min-w-7 place-items-center rounded-full px-1 text-[12px] font-semibold leading-none hover:text-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 ${
            isSelected
              ? "bg-[#2563EB] text-white hover:text-white"
              : isToday
                ? "bg-[#2563EB] text-white hover:text-white"
                : "text-[#374151]"
          }`}
        >
          <AgendaDayCellContent
            options={calendarOptions}
            renderArg={renderArg}
            defaultContent={dayNumberText}
          />
        </button>
      </div>

      {children}
    </div>
  );
});
