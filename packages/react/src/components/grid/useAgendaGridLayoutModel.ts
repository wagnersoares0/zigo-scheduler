"use client";

import { useMemo } from "react";
import type { Appointment, Block, Professional } from "@zigoschedule/scheduler-engine";
import { dateKey, toMin, zoneMins } from "@zigoschedule/scheduler-engine";
import {
  buildOverlapLayout,
  getAgendaResourceColumnMetrics,
  getAppointmentBufferAfterMinutes,
  getAppointmentBufferBeforeMinutes,
  getAppointmentDurationMinutes,
  getAppointmentProfessionalId,
  getAppointmentStartsAt,
  getBlockEndTime,
  getBlockProfessionalId,
  getBlockStartTime,
  getProfessionalName,
} from "@zigoschedule/scheduler-engine";
import { useAgendaTimeZone } from "../../config/AgendaConfigContext";

export type AgendaGridColumn = {
  key: string;
  day: Date;
  dayKey: string;
  profId: string | null;
  profName: string;
  showResourceHeader: boolean;
  deferResourceValidation: boolean;
};

export type AgendaGridColumnItems = {
  ags: Appointment[];
  bloqs: Block[];
};

type UseAgendaGridLayoutModelOptions = {
  /** Overrides the built-in minimum column width, in pixels. */
  columnMinWidth?: number;
  gridDays: Date[];
  displayProfs: Professional[];
  slots: number[];
  slotHeight: number;
  gridMin: number;
  startDay: number;
  axisEndDay: number;
  agsByDay: Map<string, Appointment[]>;
  bloqsByDay: Map<string, Block[]>;
};

export function useAgendaGridLayoutModel({
  gridDays,
  displayProfs,
  slots,
  slotHeight,
  gridMin,
  startDay,
  axisEndDay,
  agsByDay,
  bloqsByDay,
  columnMinWidth,
}: UseAgendaGridLayoutModelOptions) {
  const timeZone = useAgendaTimeZone();
  const isMultiProf = displayProfs.length > 1;
  const singleProf = !isMultiProf && displayProfs.length === 1 ? displayProfs[0] : null;

  const colDefs = useMemo<AgendaGridColumn[]>(
    () =>
      gridDays.map((day) => {
        const dayKey = dateKey(day);
        const isSingleDayGrid = gridDays.length === 1;

        if (isSingleDayGrid && isMultiProf) {
          return displayProfs.map((p) => ({
            key: `${dayKey}-${p.id}`,
            day,
            dayKey,
            profId: p.id,
            profName: getProfessionalName(p),
            showResourceHeader: true,
            deferResourceValidation: false,
          }));
        }

        const scopedProf = displayProfs.length === 1 ? displayProfs[0] : singleProf;
        return {
          key: `${dayKey}-${scopedProf?.id ?? "day"}`,
          day,
          dayKey,
          profId: scopedProf?.id ?? null,
          profName: isSingleDayGrid ? getProfessionalName(scopedProf) : "",
          showResourceHeader: isSingleDayGrid && Boolean(scopedProf),
          deferResourceValidation: !scopedProf,
        };
      }).flat(),
    [displayProfs, gridDays, isMultiProf, singleProf],
  );

  const cols = Math.max(1, colDefs.length);
  const singleDayGrid = gridDays.length === 1;
  const axisWidth = singleDayGrid ? 62 : 58;
  const dayBlockMinHeight = 22;
  const { gridTemplate, minWidth } = useMemo(
    () =>
      getAgendaResourceColumnMetrics({
        axisWidth,
        columnMinWidth,
        columnCount: cols,
        isSingleDayGrid: singleDayGrid,
        isMultiResource: isMultiProf,
      }),
    [axisWidth, cols, singleDayGrid, isMultiProf, columnMinWidth],
  );
  const dataColumnHeight = slots.length * slotHeight;
  const axisBoundaryTop = Math.max(0, dataColumnHeight - 1);
  // The guard exists to stop fine-grained day steps (5 min) from drawing too many
  // week rows. It must clamp the floor, not the ceiling: 60 is a valid week
  // scale, 5 is not.
  const visualGridMinutes = !singleDayGrid && gridMin < 30 ? 30 : gridMin;
  const gridRows = useMemo(() => {
    const rows: number[] = [];
    for (let minute = startDay; minute < axisEndDay; minute += visualGridMinutes) {
      rows.push(minute);
    }
    return rows;
  }, [axisEndDay, startDay, visualGridMinutes]);
  const hasAuxiliaryWeekGrid = !singleDayGrid && visualGridMinutes !== gridMin;

  const columnItemsByKey = useMemo(() => {
    const result = new Map<string, AgendaGridColumnItems>();
    colDefs.forEach((col) => {
      const dayAgs = (agsByDay.get(col.dayKey) ?? []).filter((ag) =>
        col.profId ? (getAppointmentProfessionalId(ag) ?? "") === col.profId : true,
      );
      const dayBloqs = (bloqsByDay.get(col.dayKey) ?? []).filter((bloq) =>
        col.profId
          ? getBlockProfessionalId(bloq) === col.profId || getBlockProfessionalId(bloq) == null
          : true,
      );
      result.set(col.key, { ags: dayAgs, bloqs: dayBloqs });
    });
    return result;
  }, [agsByDay, bloqsByDay, colDefs]);

  const timedOverlapByColKey = useMemo(() => {
    const result = new Map<string, Map<string, { col: number; cols: number }>>();
    colDefs.forEach((col) => {
      const colKey = col.key;
      const columnItems = columnItemsByKey.get(colKey);
      const dayAgs = columnItems?.ags ?? [];
      const dayBloqs = columnItems?.bloqs ?? [];

      const agItems = dayAgs.map((ag) => {
        const s = zoneMins(getAppointmentStartsAt(ag), timeZone);
        const e = s + Math.max(gridMin, getAppointmentDurationMinutes(ag, 30));
        return {
          id: `ag:${ag.id}`,
          start: s - getAppointmentBufferBeforeMinutes(ag),
          end: e + getAppointmentBufferAfterMinutes(ag),
        };
      });
      const blockItems = dayBloqs.map((bloq) => ({
        id: `bloq:${bloq.id}`,
        start: toMin(getBlockStartTime(bloq)),
        end: toMin(getBlockEndTime(bloq)),
      }));

      result.set(colKey, buildOverlapLayout([...agItems, ...blockItems]));
    });
    return result;
  }, [colDefs, columnItemsByKey, gridMin, timeZone]);

  return {
    colDefs,
    cols,
    singleDayGrid,
    dayBlockMinHeight,
    gridTemplate,
    minWidth,
    dataColumnHeight,
    axisBoundaryTop,
    visualGridMinutes,
    gridRows,
    hasAuxiliaryWeekGrid,
    columnItemsByKey,
    timedOverlapByColKey,
  };
}
