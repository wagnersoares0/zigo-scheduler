export type AgendaSelectionSource = "click" | "drag" | "range";

export type NormalizeSelectionRangeInput = {
  startMinutes: number;
  endPointerMinutes: number;
  slotMinutes: number;
  maxMinutes: number;
  isDrag: boolean;
};

export type NormalizedSelectionRange = {
  startMinutes: number;
  endExclusiveMinutes: number;
};

export type BuildDrawerInitialValuesFromSelectionInput = {
  dayKey: string;
  professionalId: string | null;
  startMinutes: number;
  endExclusiveMinutes?: number | null;
  slotMinutes: number;
  maxMinutes: number;
  source?: AgendaSelectionSource;
  isDragSelection?: boolean;
};

export type DrawerInitialValuesFromSelection = {
  dayKey: string;
  professionalId: string;
  source: AgendaSelectionSource;
  isDragSelection: boolean;
  startMinutes: number;
  endExclusiveMinutes: number;
  startTime: string;
  endTime: string;
};

type SelectionDragFlags = {
  source?: AgendaSelectionSource;
  isDrag?: boolean;
  isDragSelection?: boolean;
};

export function normalizeSelectionRange({
  startMinutes,
  endPointerMinutes,
  slotMinutes,
  maxMinutes,
  isDrag,
}: NormalizeSelectionRangeInput): NormalizedSelectionRange {
  const safeSlot = Number.isFinite(slotMinutes) && slotMinutes > 0 ? slotMinutes : 1;
  const safeMax = Number.isFinite(maxMinutes) ? maxMinutes : 24 * 60;
  const safeStart = Number.isFinite(startMinutes) ? startMinutes : 0;
  const safeEndPointer = Number.isFinite(endPointerMinutes) ? endPointerMinutes : safeStart;

  const start = Math.min(safeStart, safeEndPointer);
  const endBoundary = Math.max(safeStart, safeEndPointer);
  const isLastSelectableSlot = isDrag && endBoundary > start && endBoundary === safeMax - safeSlot;
  const endExclusive = isLastSelectableSlot
    ? safeMax
    : isDrag && endBoundary > start
    ? endBoundary
    : start + safeSlot;

  return {
    startMinutes: start,
    endExclusiveMinutes: Math.min(safeMax, Math.max(start + safeSlot, endExclusive)),
  };
}

export function isDragSelection(selection: SelectionDragFlags): boolean {
  return selection.source === "drag" ||
    selection.source === "range" ||
    selection.isDrag === true ||
    selection.isDragSelection === true;
}

function toHHMM(minutes: number): string {
  const safeMinutes = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  return `${String(Math.floor(safeMinutes / 60)).padStart(2, "0")}:${String(safeMinutes % 60).padStart(2, "0")}`;
}

export function buildDrawerInitialValuesFromSelection({
  dayKey,
  professionalId,
  startMinutes,
  endExclusiveMinutes,
  slotMinutes,
  maxMinutes,
  source,
  isDragSelection: dragInput,
}: BuildDrawerInitialValuesFromSelectionInput): DrawerInitialValuesFromSelection {
  const hasExplicitEnd = Number.isFinite(endExclusiveMinutes);
  const selectionSource: AgendaSelectionSource = source ?? (dragInput ? "drag" : "click");
  const dragSelection = dragInput === true || selectionSource === "drag" || selectionSource === "range";
  const range = normalizeSelectionRange({
    startMinutes,
    endPointerMinutes: hasExplicitEnd ? Number(endExclusiveMinutes) : startMinutes,
    slotMinutes,
    maxMinutes,
    isDrag: dragSelection && hasExplicitEnd,
  });

  return {
    dayKey,
    professionalId: professionalId ?? "",
    source: selectionSource,
    isDragSelection: dragSelection,
    startMinutes: range.startMinutes,
    endExclusiveMinutes: range.endExclusiveMinutes,
    startTime: toHHMM(range.startMinutes),
    endTime: toHHMM(range.endExclusiveMinutes),
  };
}
