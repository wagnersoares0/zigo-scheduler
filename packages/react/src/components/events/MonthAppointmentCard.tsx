"use client";

import { memo } from "react";
import type { AgendaEventRenderArg, AgendaResolvedOptions } from "@zigoschedule/scheduler-engine";
import type { DayProfCardTheme } from "@zigoschedule/scheduler-engine";
import { AgendaEventContent } from "./AgendaEventContent";

type MonthAppointmentCardProps = {
  calendarOptions: AgendaResolvedOptions;
  renderArg: AgendaEventRenderArg;
  theme: DayProfCardTheme;
  isCanceled: boolean;
};

export const MonthAppointmentCard = memo(function MonthAppointmentCard({
  calendarOptions,
  renderArg,
  theme,
  isCanceled,
}: MonthAppointmentCardProps) {
  return (
    <AgendaEventContent
      options={calendarOptions}
      renderArg={renderArg}
      timeClassName={`text-[10px] leading-tight font-semibold ${theme.timeClass}`}
      titleClassName={`text-[11px] leading-tight font-semibold ${theme.clientClass}`}
      subtitleClassName={`text-[10px] leading-tight ${theme.serviceClass}`}
      badgeClassName="pt-0.5"
      showTime
      showTitle
      showSubtitle
      showStatusBadge={isCanceled}
    />
  );
});
