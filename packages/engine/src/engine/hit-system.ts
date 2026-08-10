import { snapMinuteToFloorSlot } from "../utils/snap";

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
      rect: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      },
      height: el.clientHeight,
    });
  });

  return {
    entries,
    scrollTop: scrollEl?.scrollTop ?? 0,
    scrollLeft: scrollEl?.scrollLeft ?? 0,
  };
};

export const queryAgendaHit = (
  hitSystem: AgendaHitSystem,
  scrollEl: HTMLElement,
  clientX: number,
  clientY: number,
  snapMinutes: number,
  minuteFromY: (y: number, height: number) => number,
  snapOptions: AgendaHitSnapOptions = {},
): AgendaHit | null => {
  const scrollRect = scrollEl.getBoundingClientRect();

  if (
    clientX < scrollRect.left ||
    clientX >= scrollRect.right ||
    clientY < scrollRect.top ||
    clientY >= scrollRect.bottom
  ) {
    return null;
  }

  const scrollDeltaTop = scrollEl.scrollTop - hitSystem.scrollTop;
  const scrollDeltaLeft = scrollEl.scrollLeft - hitSystem.scrollLeft;

  for (const entry of hitSystem.entries) {
    const left = entry.rect.left - scrollDeltaLeft;
    const right = entry.rect.right - scrollDeltaLeft;
    const top = entry.rect.top - scrollDeltaTop;
    const bottom = entry.rect.bottom - scrollDeltaTop;

    if (clientX >= left && clientX < right && clientY >= top && clientY < bottom) {
      const rawMinute = minuteFromY(clientY - top, entry.height);
      const minute = snapMinuteToFloorSlot(rawMinute, {
        snapMinutes,
        minMinute: snapOptions.minMinute,
        maxMinute: snapOptions.maxMinute,
        originMinute: snapOptions.originMinute,
      });
      return { dayKey: entry.dayKey, resourceId: entry.resourceId, minute };
    }
  }

  return null;
};
