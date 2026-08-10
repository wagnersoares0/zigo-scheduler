"use client";

import { memo } from "react";
import type { AgendaEventRenderArg, AgendaResolvedOptions } from "@zigoschedule/scheduler-engine";
import type { DayProfCardTheme } from "@zigoschedule/scheduler-engine";
import type { AgendaAppointmentCardStatus } from "@zigoschedule/scheduler-engine";
import { AppointmentCardHeader } from "./AppointmentCardHeader";
import { AgendaEventContent } from "./AgendaEventContent";
import { AppointmentProfessionalBadgeMark, type AppointmentProfessionalBadge } from "./AppointmentCardParts";

type DayAppointmentCardProps = {
  calendarOptions: AgendaResolvedOptions;
  renderArg: AgendaEventRenderArg;
  theme: DayProfCardTheme;
  professionalBadge: AppointmentProfessionalBadge;
  cardStatus: AgendaAppointmentCardStatus;
  titleClassName: string;
  subtitleClassName: string;
  meta?: string;
  metaClassName?: string;
  showMeta?: boolean;
  badgeClassName: string;
  contentRightPadding: string;
  isTiny: boolean;
  shouldShowSubtitle: boolean;
  canShowStatusBadge: boolean;
};

export const DayAppointmentCard = memo(function DayAppointmentCard({
  calendarOptions,
  renderArg,
  theme,
  professionalBadge,
  cardStatus,
  titleClassName,
  subtitleClassName,
  meta,
  metaClassName,
  showMeta,
  badgeClassName,
  contentRightPadding,
  isTiny,
  shouldShowSubtitle,
  canShowStatusBadge,
}: DayAppointmentCardProps) {
  return (
    <>
      {professionalBadge && <AppointmentProfessionalBadgeMark badge={professionalBadge} />}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2]">
        <AppointmentCardHeader
          timeText={renderArg.timeText}
          headerClass={theme.headerClass}
          status={canShowStatusBadge ? cardStatus : null}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-6 z-[2]">
        <AgendaEventContent
          options={calendarOptions}
          renderArg={renderArg}
          timeClassName="hidden"
          titleClassName={`${titleClassName} pt-1 font-semibold leading-tight ${theme.clientClass} ${contentRightPadding}`}
          subtitleClassName={`${subtitleClassName} font-medium leading-tight ${theme.serviceClass} ${contentRightPadding}`}
          badgeClassName={badgeClassName}
          showTime={false}
          showTitle={!isTiny}
          showSubtitle={shouldShowSubtitle}
          meta={meta}
          metaClassName={metaClassName}
          showMeta={showMeta}
          showStatusBadge={false}
        />
      </div>
    </>
  );
});
