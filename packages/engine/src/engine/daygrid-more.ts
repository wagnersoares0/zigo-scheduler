export const DEFAULT_DAY_MAX_EVENTS = 3;

export type AgendaDayGridSplit<T> = {
  visibleItems: T[];
  hiddenItems: T[];
  hiddenCount: number;
  totalCount: number;
};

export const normalizeDayMaxEvents = (value: number | boolean | undefined): number => {
  if (value === false) return Number.POSITIVE_INFINITY;
  if (value === true || value === undefined) return DEFAULT_DAY_MAX_EVENTS;
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_DAY_MAX_EVENTS;
  return Math.floor(value);
};

export const splitAgendaDayGridItems = <T>(
  items: readonly T[],
  dayMaxEvents: number | boolean | undefined = DEFAULT_DAY_MAX_EVENTS,
): AgendaDayGridSplit<T> => {
  const maxVisible = normalizeDayMaxEvents(dayMaxEvents);
  const visibleItems = Number.isFinite(maxVisible)
    ? items.slice(0, maxVisible)
    : [...items];
  const hiddenItems = Number.isFinite(maxVisible)
    ? items.slice(maxVisible)
    : [];

  return {
    visibleItems,
    hiddenItems,
    hiddenCount: hiddenItems.length,
    totalCount: items.length,
  };
};
