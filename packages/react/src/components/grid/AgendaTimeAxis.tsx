"use client";

import { memo } from "react";
import type { AgendaResolvedOptions, AgendaViewId } from "@zigoschedule/scheduler-engine";
import { AgendaSlotLabelCell } from "./AgendaSlotLabelCell";

type AgendaTimeAxisProps = {
  dataColumnHeight: number;
  gridRows: number[];
  dayMinuteToPx: (minute: number, colHeight: number) => number;
  axisEndDay: number;
  visualGridMinutes: number;
  majors: Set<number>;
  singleDayGrid: boolean;
  hasAuxiliaryWeekGrid: boolean;
  calendarOptions: AgendaResolvedOptions;
  calendarView: AgendaViewId;
  onAgendaCallbackError?: (error: Error | null) => void;
  axisBoundaryTop: number;
};

export const AgendaTimeAxis = memo(function AgendaTimeAxis({
  dataColumnHeight,
  gridRows,
  dayMinuteToPx,
  axisEndDay,
  visualGridMinutes,
  majors,
  singleDayGrid,
  hasAuxiliaryWeekGrid,
  calendarOptions,
  calendarView,
  onAgendaCallbackError,
  axisBoundaryTop,
}: AgendaTimeAxisProps) {
  const lastGridRow = gridRows.at(-1);
  const boundaryLabelHeight =
    lastGridRow == null
      ? Math.max(1, dataColumnHeight)
      : Math.max(1, dataColumnHeight - dayMinuteToPx(lastGridRow, dataColumnHeight));
  const axisHeight = dataColumnHeight + boundaryLabelHeight;

  return (
    <div
      className="sticky left-0 z-[55] border-r border-[#D1D5DB] bg-[#F8FAFC]"
      style={{ height: axisHeight }}
    >
      {gridRows.map((m, idx) => {
        const top = dayMinuteToPx(m, dataColumnHeight);
        const nextTop = dayMinuteToPx(Math.min(axisEndDay, m + visualGridMinutes), dataColumnHeight);
        const rowHeight = Math.max(1, nextTop - top);
        return (
          <AgendaSlotLabelCell
            key={m}
            minute={m}
            index={idx}
            isMajor={majors.has(m)}
            slotHeight={rowHeight}
            top={top}
            // The week view used to label only full hours, which made sense when
            // it could draw 5-minute rows. With week scale limited to 30 or 60,
            // every row deserves a label; otherwise a 30-minute step leaves a
            // blank band between 09:00 and 10:00.
            showEverySlotLabel={singleDayGrid || visualGridMinutes >= 30}
            timeGridStyle={singleDayGrid || hasAuxiliaryWeekGrid}
            calendarOptions={calendarOptions}
            calendarView={calendarView}
            onAgendaCallbackError={onAgendaCallbackError}
          />
        );
      })}
      <AgendaSlotLabelCell
        key={`end-${axisEndDay}`}
        minute={axisEndDay}
        index={gridRows.length}
        isMajor={majors.has(axisEndDay)}
        slotHeight={boundaryLabelHeight}
        top={axisBoundaryTop}
        showEverySlotLabel
        timeGridStyle={singleDayGrid || hasAuxiliaryWeekGrid}
        boundaryLabel
        calendarOptions={calendarOptions}
        calendarView={calendarView}
        onAgendaCallbackError={onAgendaCallbackError}
      />
    </div>
  );
});
