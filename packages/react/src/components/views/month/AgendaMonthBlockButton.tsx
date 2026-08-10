"use client";

import { memo, useRef } from "react";
import type {
  AppointmentColor,
  AppointmentColorMode,
} from "@zigoschedule/scheduler-core";
import { formatAgendaTime } from "@zigoschedule/scheduler-core";
import type { Appointment, Block, Professional } from "@zigoschedule/scheduler-engine";
import {
  getProfessionalCardThemeForVisibleList,
  getBlockEndTime,
  getBlockProfessionalId,
  getBlockReason,
  getBlockStartTime,
} from "@zigoschedule/scheduler-engine";
import {
  blockToAgendaEventInput,
  type AgendaResolvedOptions,
  type AgendaViewId,
  type AgendaMoreLinkAction,
  type AgendaMoreLinkClick,
  type AgendaMoreLinkText,
  type AgendaNativeInteractionEvent,
} from "@zigoschedule/scheduler-engine";
import {
  toMin,
} from "@zigoschedule/scheduler-engine";
import {
} from "../../grid/AgendaCellRenderHooks";
import {
  AgendaEventContent,
  AgendaEventTooltip,
  useAgendaEventRender,
  useAgendaEventTooltip,
} from "../../events/AgendaEventContent";
import {
} from "../../grid/AgendaMorePopover";
import { useAgendaLocale, useAgendaMessages, useAgendaTimeZone } from "../../../config/AgendaConfigContext";

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


type AgendaMonthBlockButtonProps = {
  bloq: Block;
  dayKey: string;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  themeProfs?: Professional[];
  onAgendaCallbackError?: (error: Error | null) => void;
  onOpenBloqueio: (
    bloq: Block,
    dayKey: string,
    s: number,
    e: number,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
};

export const AgendaMonthBlockButton = memo(function AgendaMonthBlockButton({
  bloq,
  dayKey,
  calendarOptions,
  calendarView,
  themeProfs,
  onAgendaCallbackError,
  onOpenBloqueio,
}: AgendaMonthBlockButtonProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const locale = useAgendaLocale();
  const messages = useAgendaMessages();
  const timeZone = useAgendaTimeZone();
  const blockProfessionalId = getBlockProfessionalId(bloq);
  const start = toMin(getBlockStartTime(bloq));
  const end = toMin(getBlockEndTime(bloq));
  const theme = blockProfessionalId
    ? getProfessionalCardThemeForVisibleList(blockProfessionalId, themeProfs)
    : null;
  const event = blockToAgendaEventInput(bloq, timeZone);
  const { dispatchMouseEnter, dispatchMouseLeave, optionClassName, renderArg } =
    useAgendaEventRender({
      options: calendarOptions,
      event,
      view: calendarView,
      display: "dayGrid",
      density: "tiny",
      timeText: formatAgendaTime(start, locale),
      title: getBlockReason(bloq) ?? messages.block,
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
        onClick={(ev) =>
          onOpenBloqueio(bloq, dayKey, start, end, ev.nativeEvent)
        }
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
        className={`w-full rounded-sm border px-1.5 py-0.5 text-left transition-colors ${
          theme
            ? `${theme.borderClass} ${theme.bgClass} ${theme.hoverClass} ${theme.ringClass}`
            : "border-[#D1D5DB] bg-[#F3F4F6] hover:bg-[#E5E7EB]"
        } ${optionClassName}`}
      >
        <AgendaEventContent
          options={calendarOptions}
          renderArg={renderArg}
          timeClassName={`text-[11px] leading-tight font-medium ${theme ? theme.timeClass : "text-[#475569]"}`}
          titleClassName={`text-[11px] leading-tight font-medium ${theme ? theme.clientClass : "text-[#334155]"}`}
          subtitleClassName="hidden"
          showSubtitle={false}
        />
      </button>
      <AgendaEventTooltip tooltip={tooltip} />
    </>
  );
});
