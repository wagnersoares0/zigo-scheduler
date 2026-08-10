"use client";

import { memo, useRef } from "react";
import type {
  AppointmentColor,
  AppointmentColorMode,
} from "@zigoschedule/scheduler-core";
import { formatAgendaTime } from "@zigoschedule/scheduler-core";
import type { Appointment, Block, Professional } from "@zigoschedule/scheduler-engine";
import {
  DAY_CANCELED_CARD_THEME,
  getAppointmentCardTheme,
  getAppointmentClientName,
  getAppointmentColor,
  getAppointmentColorIsCustom,
  getAppointmentStartsAt,
  isCanceledStatus,
} from "@zigoschedule/scheduler-engine";
import {
  appointmentToAgendaEventInput,
  type AgendaResolvedOptions,
  type AgendaViewId,
  type AgendaMoreLinkAction,
  type AgendaMoreLinkClick,
  type AgendaMoreLinkText,
  type AgendaNativeInteractionEvent,
} from "@zigoschedule/scheduler-engine";
import {
  zoneMins,
} from "@zigoschedule/scheduler-engine";
import { getAppointmentServiceLabel } from "@zigoschedule/scheduler-engine";
import {
} from "../../grid/AgendaCellRenderHooks";
import {
  AgendaEventTooltip,
  useAgendaEventRender,
  useAgendaEventTooltip,
} from "../../events/AgendaEventContent";
import { MonthAppointmentCard } from "../../events/MonthAppointmentCard";
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


type AgendaMonthAppointmentButtonProps = {
  ag: Appointment;
  dayKey: string;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  appointmentColorMode: AppointmentColorMode;
  appointmentDefaultColor: AppointmentColor;
  onAgendaCallbackError?: (error: Error | null) => void;
  onOpenAgendamento: (
    ag: Appointment,
    dayKey: string,
    jsEvent?: AgendaNativeInteractionEvent,
  ) => void;
};

export const AgendaMonthAppointmentButton = memo(
  function AgendaMonthAppointmentButton({
    ag,
    dayKey,
    calendarOptions,
    calendarView,
    appointmentColorMode,
    appointmentDefaultColor,
    onAgendaCallbackError,
    onOpenAgendamento,
  }: AgendaMonthAppointmentButtonProps) {
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
    const event = appointmentToAgendaEventInput(ag);
    const {
      dispatchMouseEnter,
      dispatchMouseLeave,
      optionClassName,
      renderArg,
    } = useAgendaEventRender({
      options: calendarOptions,
      event,
      view: calendarView,
      display: "dayGrid",
      density: "compact",
      timeText: formatAgendaTime(start, locale),
      title: clientName,
      subtitle: getAppointmentServiceLabel(ag, true),
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
          onClick={(ev) => onOpenAgendamento(ag, dayKey, ev.nativeEvent)}
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
          className={`w-full rounded-sm border px-1.5 py-0.5 text-left transition-colors ${theme.borderClass} ${theme.bgClass} ${theme.hoverClass} ${theme.ringClass} ${optionClassName}`}
        >
          <MonthAppointmentCard
            calendarOptions={calendarOptions}
            renderArg={renderArg}
            theme={theme}
            isCanceled={isCanceled}
          />
        </button>
        <AgendaEventTooltip tooltip={tooltip} />
      </>
    );
  },
);
