"use client";

import { memo, useEffect, useState } from "react";
import { zoneNowParts } from "@zigoschedule/scheduler-engine";
import { useAgendaTimeZone } from "../../config/AgendaConfigContext";

type AgendaNowColumnOverlayProps = {
  colStartDay: number;
  colEndDay: number;
  minuteToPx: (minute: number) => number;
};

export const AgendaNowColumnOverlay = memo(function AgendaNowColumnOverlay({
  colStartDay,
  colEndDay,
  minuteToPx,
}: AgendaNowColumnOverlayProps) {
  const timeZone = useAgendaTimeZone();
  const [nowMinutes, setNowMinutes] = useState(() => zoneNowParts(timeZone).minute);

  useEffect(() => {
    const tick = () => {
      const { minute } = zoneNowParts(timeZone);
      setNowMinutes((current) => (current === minute ? current : minute));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  if (nowMinutes < colStartDay) return null;

  const pastEnd = Math.min(nowMinutes, colEndDay);
  const showNowLine = nowMinutes <= colEndDay;

  return (
    <>
      {pastEnd > colStartDay && (
        <div
          className="pointer-events-none absolute z-[8] left-0 right-0 bg-[#E5E7EB]/70"
          style={{
            top: 0,
            height: minuteToPx(pastEnd),
          }}
        />
      )}
      {showNowLine && (
        <div
          className="pointer-events-none absolute z-[50] left-0 right-0"
          style={{ top: minuteToPx(nowMinutes) }}
        >
          <div className="flex items-center">
            <div className="w-3 h-3 shrink-0 rounded-full bg-[#EF4444]" />
            <div className="h-[2px] flex-1 bg-[#EF4444]" />
          </div>
        </div>
      )}
    </>
  );
});
