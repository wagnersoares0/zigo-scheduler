type SnapMinuteOptions = {
  snapMinutes: number;
  minMinute?: number;
  maxMinute?: number;
  originMinute?: number;
};

type MinuteFromAgendaGridYInput = {
  y: number;
  height: number;
  startMinute: number;
  endMinute: number;
  snapMinutes: number;
  maxMinute?: number;
};

const normalizeSnapMinutes = (snapMinutes: number): number => {
  if (!Number.isFinite(snapMinutes) || snapMinutes <= 0) return 1;
  return Math.max(1, Math.floor(snapMinutes));
};

const clampMinute = (minute: number, minMinute: number, maxMinute: number): number =>
  Math.max(minMinute, Math.min(maxMinute, minute));

export const snapMinuteToFloorSlot = (
  minute: number,
  options: SnapMinuteOptions,
): number => {
  const snapMinutes = normalizeSnapMinutes(options.snapMinutes);
  const minMinute = options.minMinute ?? Number.NEGATIVE_INFINITY;
  const maxMinute = options.maxMinute ?? Number.POSITIVE_INFINITY;
  const originMinute = options.originMinute ?? (Number.isFinite(minMinute) ? minMinute : 0);
  const safeMinute = Number.isFinite(minute) ? minute : originMinute;
  const snapped = originMinute + Math.floor((safeMinute - originMinute) / snapMinutes) * snapMinutes;

  return clampMinute(snapped, minMinute, maxMinute);
};

export const minuteFromAgendaGridY = ({
  y,
  height,
  startMinute,
  endMinute,
  snapMinutes,
  maxMinute,
}: MinuteFromAgendaGridYInput): number => {
  const normalizedSnap = normalizeSnapMinutes(snapMinutes);
  const latestMinute = Math.max(startMinute, maxMinute ?? endMinute - normalizedSnap);

  if (height <= 0 || endMinute <= startMinute) {
    return clampMinute(startMinute, startMinute, latestMinute);
  }

  const clampedY = Math.max(0, Math.min(height, y));
  const rawMinute = startMinute + (clampedY / height) * (endMinute - startMinute);

  return snapMinuteToFloorSlot(rawMinute, {
    snapMinutes: normalizedSnap,
    minMinute: startMinute,
    maxMinute: latestMinute,
    originMinute: startMinute,
  });
};
