"use client";

import type { AgendaAppointmentCardStatus } from "@zigoschedule/scheduler-engine";

type AppointmentCardStatusIconProps = {
  status: Exclude<AgendaAppointmentCardStatus, null>;
  compact?: boolean;
};

export function AppointmentCardStatusIcon({
  status,
  compact = false,
}: AppointmentCardStatusIconProps) {
  const iconSize = compact ? 10 : 12;
  const badgeSize = compact ? "h-4 w-4" : "h-[17px] w-[17px]";
  const badgeColor = status === "paid" ? "bg-[#334155]" : "bg-[#F59E0B]";

  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full ${badgeSize} ${badgeColor}`}>
      {status === "paid" ? (
        <svg
          aria-hidden="true"
          width={iconSize}
          height={iconSize}
          viewBox="0 0 512 512"
          fill="none"
          stroke="white"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="32"
        >
          <polyline points="416 128 192 384 96 288" />
        </svg>
      ) : (
        <svg aria-hidden="true" width={iconSize} height={iconSize} viewBox="0 0 512 512" fill="white">
          <path d="M449.07,399.08,278.64,82.58c-12.08-22.44-44.26-22.44-56.35,0L51.87,399.08A32,32,0,0,0,80,446.25H420.89A32,32,0,0,0,449.07,399.08Zm-198.6-1.83a20,20,0,1,1,20-20A20,20,0,0,1,250.47,397.25ZM272.19,196.1l-5.74,122a16,16,0,0,1-32,0l-5.74-121.95v0a21.73,21.73,0,0,1,21.5-22.69h.21a21.74,21.74,0,0,1,21.73,22.7Z" />
        </svg>
      )}
    </span>
  );
}
