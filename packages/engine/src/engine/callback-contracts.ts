import { dateKey } from "../utils/time";
import type { AgendaEventInput } from "./event-adapter";
import type { AgendaEventSourceInput } from "./event-sources";
import {
  isAgendaCanonicalViewId,
  toAgendaCanonicalViewId,
  type AgendaCanonicalViewId,
  type AgendaViewId,
} from "./view-defs";

export type AgendaNativeInteractionEvent = Event | MouseEvent | PointerEvent | KeyboardEvent;

export type AgendaEventClickArg = {
  event: AgendaEventInput;
  eventId: string;
  kind: AgendaEventInput["kind"];
  dateStr: string;
  resourceId: string | null;
  view: AgendaCanonicalViewId;
  jsEvent?: AgendaNativeInteractionEvent;
};

export type AgendaDateClickArg = {
  date: Date;
  dateStr: string;
  allDay: boolean;
  resourceId: string | null;
  view: AgendaCanonicalViewId;
  jsEvent?: AgendaNativeInteractionEvent;
};

export type AgendaSelectArg = {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
  allDay: boolean;
  resourceId: string | null;
  view: AgendaCanonicalViewId;
  jsEvent?: AgendaNativeInteractionEvent;
};

export type AgendaEventSourceSuccessArg = {
  eventSource: AgendaEventSourceInput;
  sourceId: AgendaEventSourceInput["id"];
  eventCount: number;
  events: AgendaEventInput[];
};

export type AgendaEventSourceFailureArg = {
  eventSource: AgendaEventSourceInput;
  sourceId: AgendaEventSourceInput["id"];
  error: Error;
  message: string;
};

const SIMPLE_MORE_LINK_ACTIONS = ["popover", "day", "week", "month"] as const;

export type AgendaSimpleMoreLinkAction = (typeof SIMPLE_MORE_LINK_ACTIONS)[number];
export type AgendaMoreLinkAction = AgendaSimpleMoreLinkAction | AgendaCanonicalViewId;

export type AgendaMoreLinkArg<Item = unknown> = {
  date: Date;
  dateStr: string;
  view: AgendaCanonicalViewId;
  allItems: Item[];
  hiddenItems: Item[];
  hiddenCount: number;
  totalCount: number;
};

export type AgendaMoreLinkClick<Item = unknown> =
  | AgendaMoreLinkAction
  | ((arg: AgendaMoreLinkArg<Item>) => AgendaMoreLinkAction | null | undefined | void);

export type AgendaMoreLinkText =
  | string
  | ((hiddenCount: number, totalCount: number) => string);

export type AgendaEventClickHandler = (arg: AgendaEventClickArg) => void;
export type AgendaDateClickHandler = (arg: AgendaDateClickArg) => void;
export type AgendaSelectHandler = (arg: AgendaSelectArg) => void;
export type AgendaLoadingHandler = (isLoading: boolean) => void;
export type AgendaEventSourceSuccessHandler = (arg: AgendaEventSourceSuccessArg) => void;
export type AgendaEventSourceFailureHandler = (arg: AgendaEventSourceFailureArg) => void;

export const DEFAULT_AGENDA_MORE_LINK_ACTION: AgendaMoreLinkAction = "popover";
export const DEFAULT_AGENDA_MORE_LINK_TEXT: AgendaMoreLinkText = "mais";

const cloneDate = (date: Date): Date => new Date(date.getTime());

const cloneAgendaEventSource = (eventSource: AgendaEventSourceInput): AgendaEventSourceInput => ({
  ...eventSource,
  events: [...eventSource.events],
  extendedProps: {
    ...eventSource.extendedProps,
    allowedResourceIds: [...eventSource.extendedProps.allowedResourceIds],
    visibleResourceIds: [...eventSource.extendedProps.visibleResourceIds],
  },
});

const normalizeDate = (date: Date): Date =>
  date instanceof Date && Number.isFinite(date.getTime()) ? cloneDate(date) : new Date(0);

const formatDateArgString = (date: Date, allDay: boolean): string =>
  allDay ? dateKey(date) : normalizeDate(date).toISOString();

export const createAgendaEventClickArg = (
  event: AgendaEventInput,
  view: AgendaViewId,
  jsEvent?: AgendaNativeInteractionEvent,
): AgendaEventClickArg => ({
  event,
  eventId: event.id,
  kind: event.kind,
  dateStr: event.extendedProps.dayKey,
  resourceId: event.resourceId,
  view: toAgendaCanonicalViewId(view),
  jsEvent,
});

export const createAgendaDateClickArg = ({
  date,
  view,
  allDay = false,
  resourceId = null,
  jsEvent,
}: {
  date: Date;
  view: AgendaViewId;
  allDay?: boolean;
  resourceId?: string | null;
  jsEvent?: AgendaNativeInteractionEvent;
}): AgendaDateClickArg => {
  const normalizedDate = normalizeDate(date);

  return {
    date: normalizedDate,
    dateStr: formatDateArgString(normalizedDate, allDay),
    allDay,
    resourceId,
    view: toAgendaCanonicalViewId(view),
    jsEvent,
  };
};

export const createAgendaSelectArg = ({
  start,
  end,
  view,
  allDay = false,
  resourceId = null,
  jsEvent,
}: {
  start: Date;
  end: Date;
  view: AgendaViewId;
  allDay?: boolean;
  resourceId?: string | null;
  jsEvent?: AgendaNativeInteractionEvent;
}): AgendaSelectArg => {
  const normalizedStart = normalizeDate(start);
  const normalizedEnd = normalizeDate(end);

  return {
    start: normalizedStart,
    end: normalizedEnd,
    startStr: formatDateArgString(normalizedStart, allDay),
    endStr: formatDateArgString(normalizedEnd, allDay),
    allDay,
    resourceId,
    view: toAgendaCanonicalViewId(view),
    jsEvent,
  };
};

export const createAgendaEventSourceSuccessArg = (
  eventSource: AgendaEventSourceInput,
): AgendaEventSourceSuccessArg => {
  const clonedSource = cloneAgendaEventSource(eventSource);

  return {
    eventSource: clonedSource,
    sourceId: clonedSource.id,
    eventCount: clonedSource.eventCount,
    events: [...clonedSource.events],
  };
};

export const createAgendaEventSourceFailureArg = (
  eventSource: AgendaEventSourceInput,
): AgendaEventSourceFailureArg => {
  const clonedSource = cloneAgendaEventSource(eventSource);
  const message = clonedSource.error || "Failed to load scheduler source.";

  return {
    eventSource: clonedSource,
    sourceId: clonedSource.id,
    error: new Error(message),
    message,
  };
};

export const isAgendaMoreLinkAction = (value: unknown): value is AgendaMoreLinkAction =>
  typeof value === "string" &&
  (
    SIMPLE_MORE_LINK_ACTIONS.some((action) => action === value) ||
    isAgendaCanonicalViewId(value)
  );

export const normalizeAgendaMoreLinkAction = (
  value: unknown,
  fallback: AgendaMoreLinkAction = DEFAULT_AGENDA_MORE_LINK_ACTION,
): AgendaMoreLinkAction =>
  isAgendaMoreLinkAction(value) ? value : fallback;

export const createAgendaMoreLinkArg = <Item>({
  date,
  view,
  allItems,
  hiddenItems,
  hiddenCount,
  totalCount,
}: {
  date: Date;
  view: AgendaViewId;
  allItems: readonly Item[];
  hiddenItems: readonly Item[];
  hiddenCount?: number;
  totalCount?: number;
}): AgendaMoreLinkArg<Item> => {
  const normalizedDate = normalizeDate(date);
  const hiddenItemsCopy = [...hiddenItems];
  const allItemsCopy = [...allItems];

  return {
    date: normalizedDate,
    dateStr: dateKey(normalizedDate),
    view: toAgendaCanonicalViewId(view),
    allItems: allItemsCopy,
    hiddenItems: hiddenItemsCopy,
    hiddenCount: Math.max(0, Math.floor(hiddenCount ?? hiddenItemsCopy.length)),
    totalCount: Math.max(0, Math.floor(totalCount ?? allItemsCopy.length)),
  };
};

export const resolveAgendaMoreLinkAction = <Item>(
  moreLinkClick: AgendaMoreLinkClick<Item> | undefined,
  arg: AgendaMoreLinkArg<Item>,
  fallback: AgendaMoreLinkAction = DEFAULT_AGENDA_MORE_LINK_ACTION,
): AgendaMoreLinkAction => {
  if (typeof moreLinkClick !== "function") {
    return normalizeAgendaMoreLinkAction(moreLinkClick, fallback);
  }

  return normalizeAgendaMoreLinkAction(moreLinkClick(arg), fallback);
};

export const formatAgendaMoreLinkText = (
  hiddenCount: number,
  text: AgendaMoreLinkText | undefined = DEFAULT_AGENDA_MORE_LINK_TEXT,
  totalCount = hiddenCount,
): string => {
  const safeHiddenCount = Math.max(0, Math.floor(hiddenCount));
  const safeTotalCount = Math.max(safeHiddenCount, Math.floor(totalCount));
  const fallback = `+${safeHiddenCount} mais`;

  try {
    const isCustomFormatter = typeof text === "function";
    const rawText = isCustomFormatter
      ? text(safeHiddenCount, safeTotalCount)
      : text;
    const normalizedText = typeof rawText === "string" ? rawText.trim() : "";

    if (!normalizedText) return fallback;
    if (isCustomFormatter) return normalizedText;
    if (normalizedText.includes("{count}")) {
      return normalizedText.replaceAll("{count}", String(safeHiddenCount));
    }
    if (/^\+?\d/.test(normalizedText)) return normalizedText;
    return `+${safeHiddenCount} ${normalizedText}`;
  } catch {
    return fallback;
  }
};
