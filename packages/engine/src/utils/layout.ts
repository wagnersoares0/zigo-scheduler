// Overlap layout for timed events.
//
// Receives items with start/end minutes and returns { col, cols } for each item:
// `col` is the assigned visual column, `cols` is the size of the overlapping
// cluster. Renderers use it to place appointments side by side without visual
// collisions.

import { normalizeSelectionRange } from "./selection";

export function buildOverlapLayout(
  items: { id: string; start: number; end: number }[],
): Map<string, { col: number; cols: number }> {
  const sorted = [...items].sort((a, b) => a.start - b.start || a.end - b.end);

  const active: { end: number; col: number; cluster: number }[] = [];
  const placement = new Map<string, { col: number; cluster: number }>();
  let clusterId = -1;

  for (const item of sorted) {
    for (let i = active.length - 1; i >= 0; i--) {
      if (active[i].end <= item.start) active.splice(i, 1);
    }

    const used = new Set(active.map((a) => a.col));
    let col = 0;
    while (used.has(col)) col += 1;

    if (active.length === 0) clusterId += 1;
    const cluster = active.length > 0 ? active[0].cluster : clusterId;

    active.push({ end: item.end, col, cluster });
    placement.set(item.id, { col, cluster });
  }

  const clusterCols = new Map<number, number>();
  placement.forEach(({ col, cluster }) =>
    clusterCols.set(cluster, Math.max(clusterCols.get(cluster) ?? 0, col + 1)),
  );

  const result = new Map<string, { col: number; cols: number }>();
  placement.forEach(({ col, cluster }, id) =>
    result.set(id, { col, cols: clusterCols.get(cluster) ?? 1 }),
  );

  return result;
}

export type AgendaDynamicSlotHeightInput = {
  baseSlotHeight: number;
  availableHeight: number;
  slotCount: number;
};

export function calculateAgendaDynamicSlotHeight({
  baseSlotHeight,
  availableHeight,
  slotCount,
}: AgendaDynamicSlotHeightInput): number {
  const safeBase = Number.isFinite(baseSlotHeight) && baseSlotHeight > 0 ? baseSlotHeight : 1;
  if (!Number.isFinite(availableHeight) || availableHeight <= 0 || slotCount <= 0) {
    return safeBase;
  }

  return Math.max(safeBase, Math.floor(availableHeight / slotCount));
}

export type AgendaVisualEndMinuteInput = {
  startMinute: number;
  endMinute: number;
  snapMinutes: number;
};

export function getAgendaVisualEndMinute({
  startMinute,
  endMinute,
  snapMinutes,
}: AgendaVisualEndMinuteInput): number {
  const safeStart = Number.isFinite(startMinute) ? startMinute : 0;
  const safeEnd = Number.isFinite(endMinute) ? endMinute : safeStart;
  const safeSnap = Number.isFinite(snapMinutes) && snapMinutes > 0 ? Math.floor(snapMinutes) : 1;

  if (safeEnd <= safeStart) {
    return safeStart;
  }

  const slotCount = Math.ceil((safeEnd - safeStart) / safeSnap);
  return safeStart + slotCount * safeSnap;
}

export type AgendaMinuteToPxInput = {
  minute: number;
  startMinute: number;
  visualEndMinute: number;
  height: number;
};

export function agendaMinuteToPx({
  minute,
  startMinute,
  visualEndMinute,
  height,
}: AgendaMinuteToPxInput): number {
  if (height <= 0 || visualEndMinute <= startMinute) {
    return 0;
  }

  const bounded = Math.max(startMinute, Math.min(visualEndMinute, minute));
  return ((bounded - startMinute) / (visualEndMinute - startMinute)) * height;
}

export type AgendaSelectionVisualRangeInput = {
  startMinute: number;
  endMinute: number;
  maxMinute: number;
  snapMinutes: number;
  isDrag?: boolean;
};

export function getAgendaSelectionExclusiveRange({
  startMinute,
  endMinute,
  maxMinute,
  snapMinutes,
  isDrag,
}: AgendaSelectionVisualRangeInput): { startMinute: number; endMinute: number } {
  const range = normalizeSelectionRange({
    startMinutes: startMinute,
    endPointerMinutes: endMinute,
    slotMinutes: snapMinutes,
    maxMinutes: maxMinute,
    isDrag: Boolean(isDrag),
  });

  return {
    startMinute: range.startMinutes,
    endMinute: range.endExclusiveMinutes,
  };
}

export function getAgendaSelectionVisualRange(input: AgendaSelectionVisualRangeInput): { startMinute: number; endMinute: number } {
  const range = getAgendaSelectionExclusiveRange(input);
  const safeSnap = Number.isFinite(input.snapMinutes) && input.snapMinutes > 0 ? input.snapMinutes : 1;
  const visualEnd = input.isDrag && range.endMinute > range.startMinute
    ? Math.min(input.maxMinute, range.endMinute + safeSnap)
    : range.endMinute;

  return {
    startMinute: range.startMinute,
    endMinute: visualEnd,
  };
}

export type AgendaSelectionOverlayVisualRangeInput = AgendaSelectionVisualRangeInput & {
  visualMaxMinute: number;
};

export function getAgendaSelectionOverlayVisualRange({
  visualMaxMinute,
  ...input
}: AgendaSelectionOverlayVisualRangeInput): { startMinute: number; endMinute: number } {
  const range = getAgendaSelectionExclusiveRange(input);
  const safeSnap = Number.isFinite(input.snapMinutes) && input.snapMinutes > 0 ? input.snapMinutes : 1;
  const safeVisualMax = Number.isFinite(visualMaxMinute)
    ? Math.max(input.maxMinute, visualMaxMinute)
    : input.maxMinute;
  const visualEnd = input.isDrag && range.endMinute > range.startMinute
    ? Math.min(safeVisualMax, range.endMinute + safeSnap)
    : range.endMinute;

  return {
    startMinute: range.startMinute,
    endMinute: visualEnd,
  };
}

export type AgendaBottomBlockedStartMinuteInput = {
  columnEndMinute: number;
  dayEndMinute: number;
  axisEndMinute: number;
  snapMinutes: number;
};

export function getAgendaBottomBlockedStartMinute({
  columnEndMinute,
  dayEndMinute,
  axisEndMinute,
  snapMinutes,
}: AgendaBottomBlockedStartMinuteInput): number {
  const safeColumnEnd = Number.isFinite(columnEndMinute) ? columnEndMinute : 0;
  const safeDayEnd = Number.isFinite(dayEndMinute) ? dayEndMinute : safeColumnEnd;
  const safeAxisEnd = Number.isFinite(axisEndMinute) ? axisEndMinute : safeDayEnd;
  const safeSnap = Number.isFinite(snapMinutes) && snapMinutes > 0 ? snapMinutes : 1;

  if (safeColumnEnd >= safeDayEnd) {
    return safeAxisEnd;
  }

  return Math.min(safeAxisEnd, safeColumnEnd + safeSnap);
}

export type AgendaSelectionOverlayStyleInput = {
  startMinute: number;
  endMinute: number;
  minuteToPx: (minute: number) => number;
  minHeight: number;
};

export function getAgendaSelectionOverlayStyle({
  startMinute,
  endMinute,
  minuteToPx,
  minHeight,
}: AgendaSelectionOverlayStyleInput): { top: number; height: number } {
  const top = minuteToPx(startMinute);
  const bottom = minuteToPx(endMinute);

  return {
    top,
    height: Math.max(minHeight, bottom - top),
  };
}

export type AgendaTimedItemBoxInput = {
  startMinute: number;
  endMinute: number;
  dayEndMinute: number;
  minuteToPx: (minute: number) => number;
  minHeight: number;
};

export function getAgendaTimedItemBox({
  startMinute,
  endMinute,
  dayEndMinute,
  minuteToPx,
  minHeight,
}: AgendaTimedItemBoxInput): { top: number; height: number } {
  const top = minuteToPx(startMinute);
  const bottom = minuteToPx(endMinute);
  const exactHeight = Math.max(0, bottom - top);
  const maxHeight = Math.max(1, minuteToPx(dayEndMinute) - top);

  return {
    top,
    height: Math.min(Math.max(minHeight, exactHeight), maxHeight),
  };
}

export type AgendaGridLocalYInput = {
  clientY: number;
  gridRectTop: number;
  scrollTop: number;
  contentTop?: number;
  maxY: number;
};

export function getAgendaGridLocalY({
  clientY,
  gridRectTop,
  scrollTop,
  contentTop = 0,
  maxY,
}: AgendaGridLocalYInput): number {
  const safeScrollTop = Number.isFinite(scrollTop) ? scrollTop : 0;
  const safeContentTop = Number.isFinite(contentTop) ? contentTop : 0;
  const safeMaxY = Number.isFinite(maxY) ? Math.max(0, maxY) : 0;
  const localY = clientY - gridRectTop + safeScrollTop - safeContentTop;

  return Math.max(0, Math.min(safeMaxY, localY));
}

export type AgendaSelectionOverlayBoxInput = AgendaSelectionOverlayStyleInput & {
  gridRectLeft: number;
  scrollLeft: number;
  columnRectLeft: number;
  columnWidth: number;
  insetX?: number;
};

export function getAgendaSelectionOverlayBox({
  gridRectLeft,
  scrollLeft,
  columnRectLeft,
  columnWidth,
  insetX = 6,
  ...styleInput
}: AgendaSelectionOverlayBoxInput): { left: number; top: number; width: number; height: number } {
  const safeInset = Number.isFinite(insetX) ? Math.max(0, insetX) : 0;
  const safeColumnWidth = Number.isFinite(columnWidth) ? Math.max(0, columnWidth) : 0;
  const { top, height } = getAgendaSelectionOverlayStyle(styleInput);

  return {
    left: columnRectLeft - gridRectLeft + scrollLeft + safeInset,
    top,
    width: Math.max(1, safeColumnWidth - safeInset * 2),
    height,
  };
}

export type AgendaResourceColumnMetricsInput = {
  axisWidth: number;
  columnCount: number;
  isSingleDayGrid: boolean;
  isMultiResource: boolean;
  /** Overrides the built-in minimum column width, in pixels. */
  columnMinWidth?: number;
};

export function getAgendaResourceColumnMetrics({
  axisWidth,
  columnCount,
  isSingleDayGrid,
  isMultiResource,
  columnMinWidth: overrideColumnMinWidth,
}: AgendaResourceColumnMetricsInput): { columnMinWidth: number; minWidth: string; gridTemplate: string } {
  const safeColumnCount = Math.max(1, columnCount);
  // A day column in the week view holds every professional's appointments at
  // once, so overlapping cards split whatever width it has. 180px is enough for
  // one card and cramped for three; hosts with a busy calendar should raise it.
  const columnMinWidth =
    overrideColumnMinWidth && overrideColumnMinWidth > 0
      ? overrideColumnMinWidth
      : !isSingleDayGrid
        ? 180
        : isMultiResource
          ? 220
          : 640;

  return {
    columnMinWidth,
    minWidth: `${axisWidth + safeColumnCount * columnMinWidth}px`,
    gridTemplate: `${axisWidth}px repeat(${safeColumnCount}, minmax(${columnMinWidth}px, 1fr))`,
  };
}
