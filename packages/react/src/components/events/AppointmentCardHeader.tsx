"use client";

import type { AgendaAppointmentCardStatus } from "@zigoschedule/scheduler-engine";
import { AppointmentCardStatusIcon } from "./AppointmentCardStatusIcon";
import { useAgendaMessages } from "../../config/AgendaConfigContext";

type AppointmentCardHeaderProps = {
  timeText: string;
  headerClass: string;
  status: AgendaAppointmentCardStatus;
  compact?: boolean;
};

export function AppointmentCardHeader({
  timeText,
  headerClass,
  status,
  compact = false,
}: AppointmentCardHeaderProps) {
  const messages = useAgendaMessages();
  const statusLabel = (value: Exclude<AgendaAppointmentCardStatus, null>) =>
    value === "paid" ? messages.status.paid : messages.status.overdue;

  return (
    <div className={`flex min-w-0 items-center justify-between gap-1 ${headerClass} ${compact ? "min-h-4 px-1 py-0.5" : "min-h-6 px-1.5 py-1"}`}>
      <span className={`min-w-0 truncate font-bold tabular-nums leading-none text-white ${compact ? "text-[9px]" : "text-[11px]"}`}>
        {timeText}
      </span>
      {status ? (
        <span
          aria-label={statusLabel(status)}
          title={statusLabel(status)}
          className="inline-flex shrink-0"
        >
          <AppointmentCardStatusIcon status={status} compact={compact} />
        </span>
      ) : null}
    </div>
  );
}
