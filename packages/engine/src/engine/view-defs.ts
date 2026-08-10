import type { LegacyView, View } from "../types";
import { dateKey, monthEnd, monthStart, weekDays } from "../utils/time";

export type AgendaViewFamily = "timeGrid" | "dayGrid" | "list";
export type AgendaDateUnit = "day" | "week" | "month";

export type AgendaCanonicalViewId =
  | "timeGridDay"
  | "timeGridWeek"
  | "dayGridMonth"
  | "listWeek";

export type AgendaViewId = AgendaCanonicalViewId | LegacyView;

export type AgendaDateRange = {
  start: string;
  end: string;
};

export type AgendaDateIncrement = {
  unit: AgendaDateUnit;
  amount: number;
};

export type AgendaViewSpec = {
  id: AgendaCanonicalViewId;
  family: AgendaViewFamily;
  label: string;
  buttonText: string;
  rangeUnit: AgendaDateUnit;
  dateIncrement: AgendaDateIncrement;
  supportsResources: boolean;
  supportsTimeSlots: boolean;
  supportsAllDaySlot: boolean;
  supportsListRows: boolean;
  supportsMorePopover: boolean;
  legacyView?: View;
};

export const AGENDA_LEGACY_VIEW_MAP: Record<LegacyView, AgendaCanonicalViewId> = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
  list: "listWeek",
  lista: "listWeek",
};

export const AGENDA_VIEW_SPECS: Record<AgendaCanonicalViewId, AgendaViewSpec> = {
  timeGridDay: {
    id: "timeGridDay",
    family: "timeGrid",
    label: "Dia",
    buttonText: "Dia",
    rangeUnit: "day",
    dateIncrement: { unit: "day", amount: 1 },
    supportsResources: true,
    supportsTimeSlots: true,
    supportsAllDaySlot: true,
    supportsListRows: false,
    supportsMorePopover: false,
    legacyView: "day",
  },
  timeGridWeek: {
    id: "timeGridWeek",
    family: "timeGrid",
    label: "Semana",
    buttonText: "Semana",
    rangeUnit: "week",
    dateIncrement: { unit: "week", amount: 1 },
    supportsResources: true,
    supportsTimeSlots: true,
    supportsAllDaySlot: true,
    supportsListRows: false,
    supportsMorePopover: false,
    legacyView: "week",
  },
  dayGridMonth: {
    id: "dayGridMonth",
    family: "dayGrid",
    label: "Mes",
    buttonText: "Mes",
    rangeUnit: "month",
    dateIncrement: { unit: "month", amount: 1 },
    supportsResources: true,
    supportsTimeSlots: false,
    supportsAllDaySlot: true,
    supportsListRows: false,
    supportsMorePopover: true,
    legacyView: "month",
  },
  listWeek: {
    id: "listWeek",
    family: "list",
    label: "Agenda",
    buttonText: "Agenda",
    rangeUnit: "week",
    dateIncrement: { unit: "week", amount: 1 },
    supportsResources: true,
    supportsTimeSlots: false,
    supportsAllDaySlot: true,
    supportsListRows: true,
    supportsMorePopover: false,
    legacyView: "list",
  },
};

export const AGENDA_CANONICAL_VIEW_ORDER: AgendaCanonicalViewId[] = [
  "timeGridDay",
  "timeGridWeek",
  "dayGridMonth",
  "listWeek",
];

export const isAgendaCanonicalViewId = (value: string): value is AgendaCanonicalViewId =>
  Object.prototype.hasOwnProperty.call(AGENDA_VIEW_SPECS, value);

export const toAgendaCanonicalViewId = (viewId: AgendaViewId): AgendaCanonicalViewId => {
  if (isAgendaCanonicalViewId(viewId)) return viewId;
  return AGENDA_LEGACY_VIEW_MAP[viewId];
};

export const getAgendaViewSpec = (viewId: AgendaViewId): AgendaViewSpec =>
  AGENDA_VIEW_SPECS[toAgendaCanonicalViewId(viewId)];

export const getAgendaDateIncrement = (viewId: AgendaViewId): AgendaDateIncrement =>
  getAgendaViewSpec(viewId).dateIncrement;

export const getAgendaViewDateRange = (viewId: AgendaViewId, date: Date): AgendaDateRange => {
  const spec = getAgendaViewSpec(viewId);

  if (spec.rangeUnit === "day") {
    const key = dateKey(date);
    return { start: key, end: key };
  }

  if (spec.rangeUnit === "week") {
    const days = weekDays(date);
    return { start: dateKey(days[0]), end: dateKey(days[6]) };
  }

  return { start: dateKey(monthStart(date)), end: dateKey(monthEnd(date)) };
};
