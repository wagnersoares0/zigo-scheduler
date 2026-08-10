"use client";
import { memo } from "react";
import type { Appointment, Block } from "@zigoschedule/scheduler-engine";
import { useAgendaMessages } from "../../config/AgendaConfigContext";

type AgendaGridColumn = {
  key: string;
  day: Date;
  dayKey: string;
  profId: string | null;
  profName: string;
  showResourceHeader: boolean;
  deferResourceValidation: boolean;
};

type AgendaAllDayLaneColumnItems = {
  ags: Appointment[];
  bloqs: Block[];
};

type AgendaAllDayLaneProps = {
  colDefs: AgendaGridColumn[];
  gridTemplate: string;
  minWidth: string;
  agsByDay: Map<string, Appointment[]>;
  bloqsByDay: Map<string, Block[]>;
  columnItemsByKey?: Map<string, AgendaAllDayLaneColumnItems>;
  getColumnBusinessHours: (dayKey: string) => {
    startMinute: number;
    endMinute: number;
    isClosed?: boolean;
    closedMessage?: string;
  };
};

export const AgendaAllDayLane = memo(function AgendaAllDayLane({
  colDefs,
  gridTemplate,
  minWidth,
  agsByDay,
  bloqsByDay,
  columnItemsByKey,
  getColumnBusinessHours,
}: AgendaAllDayLaneProps) {
  const messages = useAgendaMessages();
  return (
    <div className="border-t border-[#D1D5DB] bg-white" style={{ display: "grid", gridTemplateColumns: gridTemplate, minWidth }}>
      <div
        aria-hidden="true"
        className="sticky left-0 z-[60] h-9 border-r border-[#D1D5DB] bg-[#F8FAFC]"
      />
      {colDefs.map((col) => {
        const colKey = col.key;
        const businessHours = getColumnBusinessHours(col.dayKey);
        const columnItems = columnItemsByKey?.get(colKey);
        const dayAgs = columnItems?.ags ?? (agsByDay.get(col.dayKey) ?? []).filter((ag) =>
          col.profId ? (ag.profissional_id ?? "") === col.profId : true,
        );
        const dayBloqs = columnItems?.bloqs ?? (bloqsByDay.get(col.dayKey) ?? []).filter((bloq) =>
          col.profId
            ? (bloq.profissional_id ?? null) === col.profId || bloq.profissional_id == null
            : true,
        );
        const totalItems = dayAgs.length + dayBloqs.length;

        return (
          <div key={colKey} className="flex h-9 min-w-0 items-center border-r border-[#E5E7EB] bg-white px-1.5">
            {businessHours.isClosed ? (
              <span className="truncate rounded-sm border border-[#D1D5DB] bg-[#F9FAFB] px-2 py-0.5 text-[10px] font-semibold text-[#64748B]">
                {messages.closed}
              </span>
            ) : totalItems > 0 ? (
              <span className="truncate rounded-sm border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                {messages.dayItems(totalItems)}
              </span>
            ) : (
              <span className="truncate text-[11px] font-medium text-[#94A3B8]">
                {messages.free}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});
