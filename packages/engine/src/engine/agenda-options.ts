import { normalizeAgendaGranularity } from "@zigoschedule/scheduler-core";
import { DEFAULT_TIME_ZONE, isValidTimeZone } from "@zigoschedule/scheduler-core";
import { GRID_MIN, MAX_APPOINTMENT_DURATION_MINUTES } from "../constants";
import { isValidHHMM, toMin } from "../utils/time";
import type {
  AgendaDateClickHandler,
  AgendaEventClickHandler,
  AgendaEventSourceFailureHandler,
  AgendaEventSourceSuccessHandler,
  AgendaLoadingHandler,
  AgendaMoreLinkClick,
  AgendaMoreLinkText,
  AgendaSelectHandler,
} from "./callback-contracts";
import type {
  AgendaEventClassNamesInput,
  AgendaEventContentHandler,
  AgendaEventDidMountHandler,
  AgendaEventMouseHandler,
  AgendaEventWillUnmountHandler,
} from "./event-rendering";
import type {
  AgendaDayCellClassNamesInput,
  AgendaDayCellContentHandler,
  AgendaDayCellDidMountHandler,
  AgendaDayCellWillUnmountHandler,
  AgendaSlotLabelClassNamesInput,
  AgendaSlotLabelContentHandler,
  AgendaSlotLabelDidMountHandler,
  AgendaSlotLabelWillUnmountHandler,
  AgendaSlotLaneClassNamesInput,
  AgendaSlotLaneContentHandler,
  AgendaSlotLaneDidMountHandler,
  AgendaSlotLaneWillUnmountHandler,
} from "./cell-rendering";
import {
  DEFAULT_AGENDA_MORE_LINK_TEXT,
  isAgendaMoreLinkAction,
} from "./callback-contracts";
import {
  AGENDA_CANONICAL_VIEW_ORDER,
  AGENDA_VIEW_SPECS,
  toAgendaCanonicalViewId,
  type AgendaCanonicalViewId,
  type AgendaViewId,
} from "./view-defs";

export type AgendaToolbarSection = {
  left: string;
  center: string;
  right: string;
};

export type AgendaViewOption = {
  buttonText?: string;
  dayMaxEvents?: boolean | number;
  dayMaxEventRows?: boolean | number;
  slotDurationMinutes?: number;
  moreLinkText?: AgendaMoreLinkText;
  moreLinkClick?: AgendaMoreLinkClick;
};

export type AgendaOptionInput = {
  initialView?: AgendaViewId;
  locale?: string;
  timeZone?: string;
  firstDay?: number;
  slotMinTime?: string;
  slotMaxTime?: string;
  slotDurationMinutes?: number;
  snapDurationMinutes?: number;
  scrollTime?: string;
  allDaySlot?: boolean;
  nowIndicator?: boolean;
  editable?: boolean;
  eventStartEditable?: boolean;
  eventDurationEditable?: boolean;
  selectable?: boolean;
  selectMirror?: boolean;
  eventOverlap?: boolean;
  selectOverlap?: boolean;
  weekends?: boolean;
  navLinks?: boolean;
  dayMaxEvents?: boolean | number;
  dayMaxEventRows?: boolean | number;
  eventMaxStack?: number;
  maxAppointmentDurationMinutes?: number;
  moreLinkText?: AgendaMoreLinkText;
  moreLinkClick?: AgendaMoreLinkClick;
  eventClick?: AgendaEventClickHandler;
  dateClick?: AgendaDateClickHandler;
  select?: AgendaSelectHandler;
  loading?: AgendaLoadingHandler;
  eventSourceSuccess?: AgendaEventSourceSuccessHandler;
  eventSourceFailure?: AgendaEventSourceFailureHandler;
  eventContent?: AgendaEventContentHandler;
  eventClassNames?: AgendaEventClassNamesInput;
  eventDidMount?: AgendaEventDidMountHandler;
  eventWillUnmount?: AgendaEventWillUnmountHandler;
  eventMouseEnter?: AgendaEventMouseHandler;
  eventMouseLeave?: AgendaEventMouseHandler;
  dayCellClassNames?: AgendaDayCellClassNamesInput;
  dayCellContent?: AgendaDayCellContentHandler;
  dayCellDidMount?: AgendaDayCellDidMountHandler;
  dayCellWillUnmount?: AgendaDayCellWillUnmountHandler;
  slotLaneClassNames?: AgendaSlotLaneClassNamesInput;
  slotLaneContent?: AgendaSlotLaneContentHandler;
  slotLaneDidMount?: AgendaSlotLaneDidMountHandler;
  slotLaneWillUnmount?: AgendaSlotLaneWillUnmountHandler;
  slotLabelClassNames?: AgendaSlotLabelClassNamesInput;
  slotLabelContent?: AgendaSlotLabelContentHandler;
  slotLabelDidMount?: AgendaSlotLabelDidMountHandler;
  slotLabelWillUnmount?: AgendaSlotLabelWillUnmountHandler;
  headerToolbar?: AgendaToolbarSection;
  views?: Partial<Record<AgendaCanonicalViewId, AgendaViewOption>>;
};

type AgendaCallbackOptionKey =
  | "eventClick"
  | "dateClick"
  | "select"
  | "loading"
  | "eventSourceSuccess"
  | "eventSourceFailure"
  | "eventContent"
  | "eventClassNames"
  | "eventDidMount"
  | "eventWillUnmount"
  | "eventMouseEnter"
  | "eventMouseLeave"
  | "dayCellClassNames"
  | "dayCellContent"
  | "dayCellDidMount"
  | "dayCellWillUnmount"
  | "slotLaneClassNames"
  | "slotLaneContent"
  | "slotLaneDidMount"
  | "slotLaneWillUnmount"
  | "slotLabelClassNames"
  | "slotLabelContent"
  | "slotLabelDidMount"
  | "slotLabelWillUnmount";

export type AgendaResolvedOptions =
  Required<Omit<AgendaOptionInput, "views" | AgendaCallbackOptionKey>> &
  Pick<AgendaOptionInput, AgendaCallbackOptionKey> & {
  initialView: AgendaCanonicalViewId;
  views: Record<AgendaCanonicalViewId, AgendaViewOption>;
};

const DEFAULT_HEADER_TOOLBAR: AgendaToolbarSection = {
  left: "prev,next today",
  center: "title",
  right: "timeGridDay,timeGridWeek,dayGridMonth,listWeek",
};

const normalizeMinuteStep = (value: number | undefined, fallback: number): number =>
  normalizeAgendaGranularity(value, fallback);

const normalizeHHMM = (value: string | undefined, fallback: string): string =>
  isValidHHMM(value) && toMin(value) >= 0 && toMin(value) <= 24 * 60 ? value : fallback;

const normalizeFirstDay = (value: number | undefined): number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6 ? value : 0;

const normalizePositiveLimit = (value: number | undefined, fallback: number, max: number): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(Math.floor(value), max)
    : fallback;

const normalizeDayMax = (value: boolean | number | undefined, fallback: boolean | number): boolean | number => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  return fallback;
};

const normalizeMoreLinkText = (
  value: AgendaMoreLinkText | undefined,
  fallback: AgendaMoreLinkText,
): AgendaMoreLinkText => {
  if (typeof value === "function") return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
};

const normalizeMoreLinkClick = (
  value: AgendaMoreLinkClick | undefined,
  fallback: AgendaMoreLinkClick,
): AgendaMoreLinkClick => {
  if (typeof value === "function") return value;
  if (isAgendaMoreLinkAction(value)) return value;
  return fallback;
};

const buildDefaultViews = (): Record<AgendaCanonicalViewId, AgendaViewOption> =>
  AGENDA_CANONICAL_VIEW_ORDER.reduce((acc, viewId) => {
    acc[viewId] = {
      buttonText: AGENDA_VIEW_SPECS[viewId].buttonText,
    };
    return acc;
  }, {} as Record<AgendaCanonicalViewId, AgendaViewOption>);

const buildResolvedDefaultViews = (): Record<AgendaCanonicalViewId, AgendaViewOption> => {
  const views = buildDefaultViews();

  return {
    ...views,
    dayGridMonth: {
      ...views.dayGridMonth,
      dayMaxEvents: 2,
      dayMaxEventRows: 2,
    },
  };
};

export const DEFAULT_AGENDA_OPTIONS: AgendaResolvedOptions = {
  initialView: "timeGridWeek",
  locale: "en-US",
  timeZone: DEFAULT_TIME_ZONE,
  firstDay: 0,
  slotMinTime: "08:00",
  slotMaxTime: "18:00",
  slotDurationMinutes: GRID_MIN,
  snapDurationMinutes: GRID_MIN,
  scrollTime: "08:00",
  allDaySlot: true,
  nowIndicator: true,
  editable: true,
  eventStartEditable: true,
  eventDurationEditable: true,
  selectable: true,
  selectMirror: true,
  eventOverlap: false,
  selectOverlap: false,
  weekends: true,
  navLinks: true,
  dayMaxEvents: 3,
  dayMaxEventRows: 3,
  eventMaxStack: 8,
  maxAppointmentDurationMinutes: MAX_APPOINTMENT_DURATION_MINUTES,
  moreLinkText: DEFAULT_AGENDA_MORE_LINK_TEXT,
  moreLinkClick: "popover",
  headerToolbar: DEFAULT_HEADER_TOOLBAR,
  views: buildResolvedDefaultViews(),
};

export const createAgendaOptions = (input: AgendaOptionInput = {}): AgendaResolvedOptions => {
  const initialView = input.initialView
    ? toAgendaCanonicalViewId(input.initialView)
    : DEFAULT_AGENDA_OPTIONS.initialView;
  let slotMinTime = normalizeHHMM(input.slotMinTime, DEFAULT_AGENDA_OPTIONS.slotMinTime);
  const slotMaxCandidate = normalizeHHMM(input.slotMaxTime, DEFAULT_AGENDA_OPTIONS.slotMaxTime);
  let slotMaxTime = slotMaxCandidate;
  if (toMin(slotMaxTime) <= toMin(slotMinTime)) {
    slotMinTime = DEFAULT_AGENDA_OPTIONS.slotMinTime;
    slotMaxTime = DEFAULT_AGENDA_OPTIONS.slotMaxTime;
  }
  const dayMaxEvents = normalizeDayMax(input.dayMaxEvents, DEFAULT_AGENDA_OPTIONS.dayMaxEvents);
  const dayMaxEventRows = normalizeDayMax(input.dayMaxEventRows, DEFAULT_AGENDA_OPTIONS.dayMaxEventRows);
  const moreLinkText = normalizeMoreLinkText(input.moreLinkText, DEFAULT_AGENDA_OPTIONS.moreLinkText);
  const moreLinkClick = normalizeMoreLinkClick(input.moreLinkClick, DEFAULT_AGENDA_OPTIONS.moreLinkClick);
  const views = buildResolvedDefaultViews();

  Object.entries(input.views ?? {}).forEach(([viewId, option]) => {
    if (!option || !(viewId in views)) return;
    const key = viewId as AgendaCanonicalViewId;
    views[key] = {
      ...views[key],
      ...option,
      dayMaxEvents: normalizeDayMax(option.dayMaxEvents, views[key].dayMaxEvents ?? dayMaxEvents),
      dayMaxEventRows: normalizeDayMax(
        option.dayMaxEventRows,
        views[key].dayMaxEventRows ?? dayMaxEventRows,
      ),
      slotDurationMinutes: normalizeMinuteStep(option.slotDurationMinutes, DEFAULT_AGENDA_OPTIONS.slotDurationMinutes),
      moreLinkText: normalizeMoreLinkText(option.moreLinkText, views[key].moreLinkText ?? moreLinkText),
      moreLinkClick: normalizeMoreLinkClick(option.moreLinkClick, views[key].moreLinkClick ?? moreLinkClick),
    };
  });

  return {
    initialView,
    locale: input.locale || DEFAULT_AGENDA_OPTIONS.locale,
    // An invalid time zone silently shifts the whole schedule, so fall back to
    // the default instead of propagating it. `isValidTimeZone` rejects fixed
    // offsets on purpose.
    timeZone:
      input.timeZone && isValidTimeZone(input.timeZone)
        ? input.timeZone
        : DEFAULT_AGENDA_OPTIONS.timeZone,
    firstDay: normalizeFirstDay(input.firstDay),
    slotMinTime,
    slotMaxTime,
    slotDurationMinutes: normalizeMinuteStep(input.slotDurationMinutes, DEFAULT_AGENDA_OPTIONS.slotDurationMinutes),
    snapDurationMinutes: normalizeMinuteStep(input.snapDurationMinutes, DEFAULT_AGENDA_OPTIONS.snapDurationMinutes),
    scrollTime: normalizeHHMM(input.scrollTime, DEFAULT_AGENDA_OPTIONS.scrollTime),
    allDaySlot: input.allDaySlot ?? DEFAULT_AGENDA_OPTIONS.allDaySlot,
    nowIndicator: input.nowIndicator ?? DEFAULT_AGENDA_OPTIONS.nowIndicator,
    editable: input.editable ?? DEFAULT_AGENDA_OPTIONS.editable,
    eventStartEditable: input.eventStartEditable ?? input.editable ?? DEFAULT_AGENDA_OPTIONS.eventStartEditable,
    eventDurationEditable: input.eventDurationEditable ?? input.editable ?? DEFAULT_AGENDA_OPTIONS.eventDurationEditable,
    selectable: input.selectable ?? DEFAULT_AGENDA_OPTIONS.selectable,
    selectMirror: input.selectMirror ?? DEFAULT_AGENDA_OPTIONS.selectMirror,
    eventOverlap: input.eventOverlap ?? DEFAULT_AGENDA_OPTIONS.eventOverlap,
    selectOverlap: input.selectOverlap ?? DEFAULT_AGENDA_OPTIONS.selectOverlap,
    weekends: input.weekends ?? DEFAULT_AGENDA_OPTIONS.weekends,
    navLinks: input.navLinks ?? DEFAULT_AGENDA_OPTIONS.navLinks,
    dayMaxEvents,
    dayMaxEventRows,
    eventMaxStack: normalizePositiveLimit(input.eventMaxStack, DEFAULT_AGENDA_OPTIONS.eventMaxStack, 50),
    maxAppointmentDurationMinutes: normalizePositiveLimit(
      input.maxAppointmentDurationMinutes,
      DEFAULT_AGENDA_OPTIONS.maxAppointmentDurationMinutes,
      MAX_APPOINTMENT_DURATION_MINUTES,
    ),
    moreLinkText,
    moreLinkClick,
    eventClick: input.eventClick,
    dateClick: input.dateClick,
    select: input.select,
    loading: input.loading,
    eventSourceSuccess: input.eventSourceSuccess,
    eventSourceFailure: input.eventSourceFailure,
    eventContent: input.eventContent,
    eventClassNames: input.eventClassNames,
    eventDidMount: input.eventDidMount,
    eventWillUnmount: input.eventWillUnmount,
    eventMouseEnter: input.eventMouseEnter,
    eventMouseLeave: input.eventMouseLeave,
    dayCellClassNames: input.dayCellClassNames,
    dayCellContent: input.dayCellContent,
    dayCellDidMount: input.dayCellDidMount,
    dayCellWillUnmount: input.dayCellWillUnmount,
    slotLaneClassNames: input.slotLaneClassNames,
    slotLaneContent: input.slotLaneContent,
    slotLaneDidMount: input.slotLaneDidMount,
    slotLaneWillUnmount: input.slotLaneWillUnmount,
    slotLabelClassNames: input.slotLabelClassNames,
    slotLabelContent: input.slotLabelContent,
    slotLabelDidMount: input.slotLabelDidMount,
    slotLabelWillUnmount: input.slotLabelWillUnmount,
    headerToolbar: input.headerToolbar ?? DEFAULT_AGENDA_OPTIONS.headerToolbar,
    views,
  };
};

export const getAgendaViewOption = <Key extends keyof AgendaViewOption>(
  options: AgendaResolvedOptions,
  viewId: AgendaViewId,
  optionKey: Key,
): AgendaViewOption[Key] | undefined => {
  const canonicalViewId = toAgendaCanonicalViewId(viewId);
  return options.views[canonicalViewId]?.[optionKey];
};

export const getAgendaDayMaxEvents = (
  options: AgendaResolvedOptions,
  viewId: AgendaViewId,
): boolean | number => normalizeDayMax(
  getAgendaViewOption(options, viewId, "dayMaxEvents"),
  options.dayMaxEvents,
);

export const getAgendaMoreLinkText = (
  options: AgendaResolvedOptions,
  viewId: AgendaViewId,
): AgendaMoreLinkText => normalizeMoreLinkText(
  getAgendaViewOption(options, viewId, "moreLinkText"),
  options.moreLinkText,
);

export const getAgendaMoreLinkClick = (
  options: AgendaResolvedOptions,
  viewId: AgendaViewId,
): AgendaMoreLinkClick => normalizeMoreLinkClick(
  getAgendaViewOption(options, viewId, "moreLinkClick"),
  options.moreLinkClick,
);
