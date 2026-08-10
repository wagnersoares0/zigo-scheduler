export type BusyInterval = {
  startMinute: number;
  endMinute: number;
};

type ResolveSelectableStartParams = {
  requestedMinute: number;
  visualSlotMinutes: number;
  dayEndMinute: number;
  busyIntervals: BusyInterval[];
};

const isValidInterval = (interval: BusyInterval): boolean =>
  Number.isFinite(interval.startMinute) &&
  Number.isFinite(interval.endMinute) &&
  interval.endMinute > interval.startMinute;

export function resolveSelectableStartInVisualSlot({
  requestedMinute,
  visualSlotMinutes,
  dayEndMinute,
  busyIntervals,
}: ResolveSelectableStartParams): number | null {
  if (!Number.isFinite(requestedMinute) || !Number.isFinite(dayEndMinute)) return null;

  const slotMinutes = Math.max(1, Math.trunc(visualSlotMinutes || 1));
  const slotEndMinute = Math.min(dayEndMinute, requestedMinute + slotMinutes);
  if (requestedMinute >= slotEndMinute) return null;

  const sortedIntervals = busyIntervals
    .filter(isValidInterval)
    .sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute);

  let candidateMinute = requestedMinute;

  for (const interval of sortedIntervals) {
    if (candidateMinute < interval.startMinute) {
      return candidateMinute < slotEndMinute ? candidateMinute : null;
    }

    if (candidateMinute >= interval.endMinute) continue;

    candidateMinute = interval.endMinute;
    if (candidateMinute >= slotEndMinute) return null;
  }

  return candidateMinute < slotEndMinute ? candidateMinute : null;
}
