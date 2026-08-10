import type { AgendaOptionInput, AgendaResolvedOptions } from "./agenda-options";
import { createAgendaOptions } from "./agenda-options";
import type { AgendaEventInput } from "./event-adapter";
import type { AgendaEventSourceInput } from "./event-sources";
import type { AgendaResourceInput } from "./resource-adapter";
import {
  getAgendaDateIncrement,
  getAgendaViewDateRange,
  toAgendaCanonicalViewId,
  type AgendaDateRange,
  type AgendaCanonicalViewId,
  type AgendaViewId,
} from "./view-defs";

export type AgendaCalendarApiState = {
  date: Date;
  view: AgendaViewId;
  options?: AgendaResolvedOptions;
  events?: AgendaEventInput[];
  eventSources?: AgendaEventSourceInput[];
  resources?: AgendaResourceInput[];
  loading?: boolean;
};

export type AgendaCalendarApiActions = {
  setDate?: (date: Date) => void;
  setView?: (view: AgendaCanonicalViewId) => void;
  setOptions?: (options: AgendaResolvedOptions) => void;
  refetchEvents?: () => void | Promise<void>;
};

export type AgendaCalendarApi = {
  getDate: () => Date;
  getView: () => AgendaCanonicalViewId;
  getCurrentRange: () => AgendaDateRange;
  changeView: (view: AgendaViewId, date?: Date | string) => AgendaCanonicalViewId;
  today: (referenceDate?: Date) => Date;
  prev: () => Date;
  next: () => Date;
  gotoDate: (date: Date | string) => Date;
  getOption: <Key extends keyof AgendaResolvedOptions>(name: Key) => AgendaResolvedOptions[Key];
  setOption: <Key extends keyof AgendaOptionInput>(name: Key, value: AgendaOptionInput[Key]) => AgendaResolvedOptions;
  getEvents: () => AgendaEventInput[];
  getEventById: (id: string) => AgendaEventInput | null;
  getEventSources: () => AgendaEventSourceInput[];
  getResources: () => AgendaResourceInput[];
  isLoading: () => boolean;
  refetchEvents: () => void | Promise<void>;
};

const cloneDate = (date: Date): Date => new Date(date.getTime());

const parseDateInput = (date: Date | string, fallback: Date): Date => {
  if (date instanceof Date && Number.isFinite(date.getTime())) return cloneDate(date);
  if (typeof date === "string") {
    const parsed = new Date(date);
    if (Number.isFinite(parsed.getTime())) return parsed;
  }
  return cloneDate(fallback);
};

export const addDateByAgendaView = (
  view: AgendaViewId,
  date: Date,
  direction: -1 | 1,
): Date => {
  const next = cloneDate(date);
  const increment = getAgendaDateIncrement(view);
  const amount = increment.amount * direction;

  if (increment.unit === "day") {
    next.setDate(next.getDate() + amount);
  } else if (increment.unit === "week") {
    next.setDate(next.getDate() + amount * 7);
  } else if (increment.unit === "month") {
    next.setMonth(next.getMonth() + amount);
  } else {
    next.setFullYear(next.getFullYear() + amount);
  }

  return next;
};

export const createAgendaCalendarApi = (
  state: AgendaCalendarApiState,
  actions: AgendaCalendarApiActions = {},
): AgendaCalendarApi => {
  const currentView = toAgendaCanonicalViewId(state.view);
  const options = state.options ?? createAgendaOptions({ initialView: currentView });
  const events = state.events ?? [];
  const eventSources = state.eventSources ?? [];
  const resources = state.resources ?? [];
  const loading = state.loading ?? false;

  const setDate = (date: Date): Date => {
    const next = cloneDate(date);
    actions.setDate?.(next);
    return next;
  };

  return {
    getDate: () => cloneDate(state.date),
    getView: () => currentView,
    getCurrentRange: () => getAgendaViewDateRange(currentView, state.date),
    changeView: (view, date) => {
      const nextView = toAgendaCanonicalViewId(view);
      actions.setView?.(nextView);
      if (date) setDate(parseDateInput(date, state.date));
      return nextView;
    },
    today: (referenceDate = new Date()) => setDate(referenceDate),
    prev: () => setDate(addDateByAgendaView(currentView, state.date, -1)),
    next: () => setDate(addDateByAgendaView(currentView, state.date, 1)),
    gotoDate: (date) => setDate(parseDateInput(date, state.date)),
    getOption: (name) => options[name],
    setOption: (name, value) => {
      const nextOptions = createAgendaOptions({ ...options, [name]: value });
      actions.setOptions?.(nextOptions);
      return nextOptions;
    },
    getEvents: () => [...events],
    getEventById: (id) => events.find((event) => event.id === id) ?? null,
    getEventSources: () => eventSources.map((source) => ({ ...source, events: [...source.events] })),
    getResources: () => resources.map((resource) => ({ ...resource })),
    isLoading: () => loading,
    refetchEvents: () => actions.refetchEvents?.(),
  };
};
