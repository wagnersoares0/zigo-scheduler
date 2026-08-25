export type AgendaHit = {
  dayKey: string;
  resourceId: string | null;
  minute: number;
};

type AgendaHitRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type AgendaHitEntry = {
  dayKey: string;
  resourceId: string | null;
  rect: AgendaHitRect;
  height: number;
};

export type AgendaHitSystem = {
  entries: AgendaHitEntry[];
  scrollTop: number;
  scrollLeft: number;
};

export type AgendaHitSnapOptions = {
  minMinute?: number;
  maxMinute?: number;
  originMinute?: number;
};

export type QueryAgendaHitInput = {
  hitSystem: AgendaHitSystem;
  scrollEl: HTMLElement;
  clientX: number;
  clientY: number;
  snapMinutes: number;
  minuteFromY: (y: number, height: number) => number;
  snapOptions?: AgendaHitSnapOptions;
};

const snapMinuteToFloorSlot = (minute: number, options: Required<AgendaHitSnapOptions> & { snapMinutes: number }) => {
  const snapMinutes = Number.isFinite(options.snapMinutes) && options.snapMinutes > 0
    ? Math.max(1, Math.floor(options.snapMinutes))
    : 1;
  const originMinute = Number.isFinite(options.originMinute) ? options.originMinute : 0;
  const raw = Number.isFinite(minute) ? minute : originMinute;
  const snapped = originMinute + Math.floor((raw - originMinute) / snapMinutes) * snapMinutes;
  return Math.max(options.minMinute, Math.min(options.maxMinute, snapped));
};

export const buildAgendaHitSystem = (
  columnEls: HTMLElement[],
  scrollEl: HTMLElement | null,
): AgendaHitSystem => {
  const entries: AgendaHitEntry[] = [];

  columnEls.forEach((el) => {
    const dayKey = el.dataset.dndDay ?? "";
    if (!dayKey) return;

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || el.clientHeight <= 0) return;

    entries.push({
      dayKey,
      resourceId: el.dataset.dndProf || null,
      rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
      height: el.clientHeight,
    });
  });

  return {
    entries,
    scrollTop: scrollEl?.scrollTop ?? 0,
    scrollLeft: scrollEl?.scrollLeft ?? 0,
  };
};

const containsPoint = (rect: AgendaHitRect, x: number, y: number): boolean =>
  x >= rect.left && x < rect.right && y >= rect.top && y < rect.bottom;

const shiftedRect = (entry: AgendaHitEntry, top: number, left: number): AgendaHitRect => ({
  left: entry.rect.left - left,
  right: entry.rect.right - left,
  top: entry.rect.top - top,
  bottom: entry.rect.bottom - top,
});

export const queryAgendaHit = ({
  hitSystem,
  scrollEl,
  clientX,
  clientY,
  snapMinutes,
  minuteFromY,
  snapOptions = {},
}: QueryAgendaHitInput): AgendaHit | null => {
  const scrollRect = scrollEl.getBoundingClientRect();
  if (!containsPoint(scrollRect, clientX, clientY)) return null;

  const scrollDeltaTop = scrollEl.scrollTop - hitSystem.scrollTop;
  const scrollDeltaLeft = scrollEl.scrollLeft - hitSystem.scrollLeft;

  for (const entry of hitSystem.entries) {
    const rect = shiftedRect(entry, scrollDeltaTop, scrollDeltaLeft);

    if (containsPoint(rect, clientX, clientY)) {
      const rawMinute = minuteFromY(clientY - rect.top, entry.height);
      const minute = snapMinuteToFloorSlot(rawMinute, {
        snapMinutes,
        minMinute: snapOptions.minMinute ?? Number.NEGATIVE_INFINITY,
        maxMinute: snapOptions.maxMinute ?? Number.POSITIVE_INFINITY,
        originMinute: snapOptions.originMinute ?? (
          typeof snapOptions.minMinute === "number" && Number.isFinite(snapOptions.minMinute)
            ? snapOptions.minMinute
            : 0
        ),
      });
      return { dayKey: entry.dayKey, resourceId: entry.resourceId, minute };
    }
  }

  return null;
};
