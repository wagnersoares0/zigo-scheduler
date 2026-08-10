"use client";

import { memo } from "react";
import type { MutableRefObject } from "react";
import type { Appointment, Block, Professional } from "@zigoschedule/scheduler-engine";
import { getProfessionalCardThemeForVisibleList } from "@zigoschedule/scheduler-engine";
import {
  getProfessionalName,
  getProfessionalPhotoUrl,
  truncateProfessionalName,
} from "@zigoschedule/scheduler-engine";
import { ProfessionalAvatar } from "../shell/ProfessionalAvatar";
import { AgendaAllDayLane } from "./AgendaAllDayLane";
import { useAgendaLocale, useAgendaMessages } from "../../config/AgendaConfigContext";

type AgendaGridHeaderColumn = {
  key: string;
  day: Date;
  dayKey: string;
  profId: string | null;
  profName: string;
  showResourceHeader: boolean;
  deferResourceValidation: boolean;
};

type AgendaGridHeaderColumnItems = {
  ags: Appointment[];
  bloqs: Block[];
};

type AgendaGridHeaderProps = {
  headerScrollRef: MutableRefObject<HTMLDivElement | null>;
  colDefs: AgendaGridHeaderColumn[];
  brtTodayKey: string;
  displayProfs: Professional[];
  themeProfs?: Professional[];
  gridTemplate: string;
  minWidth: string;
  agsByDay: Map<string, Appointment[]>;
  bloqsByDay: Map<string, Block[]>;
  columnItemsByKey?: Map<string, AgendaGridHeaderColumnItems>;
  getColumnBusinessHours: (dayKey: string) => {
    startMinute: number;
    endMinute: number;
    isClosed?: boolean;
    closedMessage?: string;
  };
};

export const AgendaGridHeader = memo(function AgendaGridHeader({
  headerScrollRef,
  colDefs,
  brtTodayKey,
  displayProfs,
  themeProfs,
  gridTemplate,
  minWidth,
  agsByDay,
  bloqsByDay,
  columnItemsByKey,
  getColumnBusinessHours,
}: AgendaGridHeaderProps) {
  const colorReferenceProfs = themeProfs?.length ? themeProfs : displayProfs;
  const locale = useAgendaLocale();
  const messages = useAgendaMessages();

  return (
    <div ref={headerScrollRef} className="sticky top-0 z-20 overflow-hidden bg-white border-b border-[#D1D5DB]">
      <div style={{ display: "grid", gridTemplateColumns: gridTemplate, minWidth }}>
        <div className="sticky left-0 z-[60] h-11 border-r border-[#D1D5DB] bg-[#F8FAFC]" />
        {colDefs.map((col) => (
          <div
            key={col.key}
            className={`flex h-11 min-w-0 items-center justify-center overflow-hidden border-r border-[#E5E7EB] px-3 text-center ${
              col.dayKey === brtTodayKey
                ? "bg-[#EFF6FF] border-b-2 border-b-[#2563EB]"
                : "bg-white"
            }`}
          >
            <div className="flex min-w-0 max-w-full items-center justify-center gap-2">
              {col.showResourceHeader && col.profId && (() => {
                const prof = displayProfs.find((p) => p.id === col.profId);
                if (!prof) return null;
                const theme = getProfessionalCardThemeForVisibleList(prof.id, colorReferenceProfs);
                return (
                  <ProfessionalAvatar
                    nome={getProfessionalName(prof)}
                    fotoUrl={getProfessionalPhotoUrl(prof)}
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                    initialsClassName={`text-[10px] font-bold ${theme.timeClass}`}
                    fallbackClassName={`flex items-center justify-center ${theme.borderClass} ${theme.bgClass}`}
                  />
                );
              })()}
              <div className="min-w-0 max-w-full leading-tight">
                <div
                  className={`text-[10px] uppercase ${
                    col.dayKey === brtTodayKey ? "font-bold text-[#2563EB]" : "font-medium text-[#64748B]"
                  }`}
                >
                  {col.day.toLocaleDateString(locale, col.showResourceHeader
                    ? { weekday: "short", day: "2-digit", month: "short" }
                    : { weekday: "short" })}
                </div>
                <div
                  title={col.showResourceHeader ? col.profName || messages.dayAgenda : undefined}
                  className={`mt-0.5 truncate text-[13px] ${
                    col.dayKey === brtTodayKey
                      ? `${col.showResourceHeader ? "font-semibold" : "font-medium"} text-[#2563EB]`
                      : col.showResourceHeader
                        ? "font-semibold text-[#020617]"
                        : "font-medium text-[#020617]"
                  }`}
                >
                  {col.showResourceHeader
                    ? truncateProfessionalName(col.profName || messages.dayAgenda, 14)
                    : col.day.toLocaleDateString(locale, { day: "2-digit", month: "short" })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <AgendaAllDayLane
        colDefs={colDefs}
        gridTemplate={gridTemplate}
        minWidth={minWidth}
        agsByDay={agsByDay}
        bloqsByDay={bloqsByDay}
        columnItemsByKey={columnItemsByKey}
        getColumnBusinessHours={getColumnBusinessHours}
      />
    </div>
  );
});
