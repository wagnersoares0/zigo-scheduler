"use client";

import { memo } from "react";
import type { AgendaEventRenderArg, AgendaResolvedOptions } from "@zigoschedule/scheduler-engine";
import type { DayProfCardTheme } from "@zigoschedule/scheduler-engine";
import type { AgendaAppointmentCardStatus } from "@zigoschedule/scheduler-engine";
import { AppointmentCardHeader } from "./AppointmentCardHeader";
import { AgendaEventContent } from "./AgendaEventContent";
import { AppointmentProfessionalBadgeMark, type AppointmentProfessionalBadge } from "./AppointmentCardParts";

type WeekAppointmentCardProps = {
  calendarOptions: AgendaResolvedOptions;
  renderArg: AgendaEventRenderArg;
  theme: DayProfCardTheme;
  professionalBadge: AppointmentProfessionalBadge;
  compactOverlap: boolean;
  cardStatus: AgendaAppointmentCardStatus;
  compactTimeText: string;
  compactProfessionalDisplayName: string;
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

export const WeekAppointmentCard = memo(function WeekAppointmentCard({
  calendarOptions,
  renderArg,
  theme,
  professionalBadge,
  compactOverlap,
  cardStatus,
  compactTimeText,
  compactProfessionalDisplayName,
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
}: WeekAppointmentCardProps) {
  if (compactOverlap) {
    return (
      <div className="flex h-full min-w-0 flex-col overflow-hidden px-1 py-1">
        <AppointmentCardHeader
          timeText={compactTimeText}
          headerClass={theme.headerClass}
          status={canShowStatusBadge ? cardStatus : null}
          compact
        />
        {!isTiny && (
          <span className="mt-1 block max-w-full truncate text-[10px] font-bold leading-[1.05] text-[#020617]">
            {renderArg.title}
          </span>
        )}
        {shouldShowSubtitle && compactProfessionalDisplayName && (
          <span className="mt-0.5 block max-w-full truncate text-[9px] font-semibold leading-[1.05] text-[#334155]">
            {compactProfessionalDisplayName}
          </span>
        )}
      </div>
    );
  }

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
