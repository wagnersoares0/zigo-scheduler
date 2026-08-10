import type { AgendaContent } from "./content";
import { normalizeAgendaClassNames } from "./event-rendering";
import {
  toAgendaCanonicalViewId,
  type AgendaCanonicalViewId,
  type AgendaViewId,
} from "./view-defs";

export type AgendaCellClassNamesValue = string | string[] | null | undefined;
export type AgendaCellContentReturn = AgendaContent | true | null | undefined;

export type AgendaDayCellRenderArg = {
  date: Date;
  dateStr: string;
  dayNumberText: string;
  view: AgendaCanonicalViewId;
  resourceId: string | null;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  isOther: boolean;
  isDisabled: boolean;
  isWeekend: boolean;
  eventCount: number;
  appointmentCount: number;
  blockCount: number;
};

export type AgendaDayCellClassNamesInput =
  | AgendaCellClassNamesValue
  | ((arg: AgendaDayCellRenderArg) => AgendaCellClassNamesValue);
export type AgendaDayCellContentHandler = (arg: AgendaDayCellRenderArg) => AgendaCellContentReturn;
export type AgendaDayCellDidMountArg = AgendaDayCellRenderArg & {
  el: HTMLElement;
};
export type AgendaDayCellDidMountHandler = (arg: AgendaDayCellDidMountArg) => void;
export type AgendaDayCellWillUnmountArg = AgendaDayCellRenderArg & {
  el: HTMLElement;
};
export type AgendaDayCellWillUnmountHandler = (arg: AgendaDayCellWillUnmountArg) => void;

export type AgendaSlotRenderArg = {
  date: Date | null;
  dateStr: string | null;
  timeText: string;
  minute: number;
  view: AgendaCanonicalViewId;
  resourceId: string | null;
  isMajor: boolean;
  isBusinessHour: boolean;
  isPast: boolean;
  isToday: boolean;
  isPausa: boolean;
  isClosed: boolean;
};

export type AgendaSlotLaneClassNamesInput =
  | AgendaCellClassNamesValue
  | ((arg: AgendaSlotRenderArg) => AgendaCellClassNamesValue);
export type AgendaSlotLaneContentHandler = (arg: AgendaSlotRenderArg) => AgendaCellContentReturn;
export type AgendaSlotLaneDidMountArg = AgendaSlotRenderArg & {
  el: HTMLElement;
};
export type AgendaSlotLaneDidMountHandler = (arg: AgendaSlotLaneDidMountArg) => void;
export type AgendaSlotLaneWillUnmountArg = AgendaSlotRenderArg & {
  el: HTMLElement;
};
export type AgendaSlotLaneWillUnmountHandler = (arg: AgendaSlotLaneWillUnmountArg) => void;

export type AgendaSlotLabelClassNamesInput =
  | AgendaCellClassNamesValue
  | ((arg: AgendaSlotRenderArg) => AgendaCellClassNamesValue);
export type AgendaSlotLabelContentHandler = (arg: AgendaSlotRenderArg) => AgendaCellContentReturn;
export type AgendaSlotLabelDidMountArg = AgendaSlotRenderArg & {
  el: HTMLElement;
};
export type AgendaSlotLabelDidMountHandler = (arg: AgendaSlotLabelDidMountArg) => void;
export type AgendaSlotLabelWillUnmountArg = AgendaSlotRenderArg & {
  el: HTMLElement;
};
export type AgendaSlotLabelWillUnmountHandler = (arg: AgendaSlotLabelWillUnmountArg) => void;

export const createAgendaDayCellRenderArg = ({
  date,
  dateStr,
  dayNumberText,
  view,
  resourceId = null,
  isToday = false,
  isPast = false,
  isFuture = false,
  isOther = false,
  isDisabled = false,
  isWeekend = false,
  eventCount = 0,
  appointmentCount = 0,
  blockCount = 0,
}: {
  date: Date;
  dateStr: string;
  dayNumberText: string;
  view: AgendaViewId;
  resourceId?: string | null;
  isToday?: boolean;
  isPast?: boolean;
  isFuture?: boolean;
  isOther?: boolean;
  isDisabled?: boolean;
  isWeekend?: boolean;
  eventCount?: number;
  appointmentCount?: number;
  blockCount?: number;
}): AgendaDayCellRenderArg => ({
  date,
  dateStr,
  dayNumberText,
  view: toAgendaCanonicalViewId(view),
  resourceId,
  isToday,
  isPast,
  isFuture,
  isOther,
  isDisabled,
  isWeekend,
  eventCount,
  appointmentCount,
  blockCount,
});

export const createAgendaSlotRenderArg = ({
  date = null,
  dateStr = null,
  timeText,
  minute,
  view,
  resourceId = null,
  isMajor = false,
  isBusinessHour = true,
  isPast = false,
  isToday = false,
  isPausa = false,
  isClosed = false,
}: {
  date?: Date | null;
  dateStr?: string | null;
  timeText: string;
  minute: number;
  view: AgendaViewId;
  resourceId?: string | null;
  isMajor?: boolean;
  isBusinessHour?: boolean;
  isPast?: boolean;
  isToday?: boolean;
  isPausa?: boolean;
  isClosed?: boolean;
}): AgendaSlotRenderArg => ({
  date,
  dateStr,
  timeText,
  minute,
  view: toAgendaCanonicalViewId(view),
  resourceId,
  isMajor,
  isBusinessHour,
  isPast,
  isToday,
  isPausa,
  isClosed,
});

const resolveCellClassNames = <Arg>(
  input: AgendaCellClassNamesValue | ((arg: Arg) => AgendaCellClassNamesValue) | undefined,
  arg: Arg,
): string[] => {
  try {
    return normalizeAgendaClassNames(typeof input === "function" ? input(arg) : input);
  } catch {
    return [];
  }
};

const resolveCellContent = <Arg>(
  handler: ((arg: Arg) => AgendaCellContentReturn) | undefined,
  arg: Arg,
): AgendaContent | null => {
  if (!handler) return null;

  try {
    const content = handler(arg);
    return content === true || content === null || content === undefined ? null : content;
  } catch {
    return null;
  }
};

export const resolveAgendaDayCellClassNames = (
  input: AgendaDayCellClassNamesInput | undefined,
  arg: AgendaDayCellRenderArg,
): string[] => resolveCellClassNames(input, arg);

export const resolveAgendaDayCellContent = (
  handler: AgendaDayCellContentHandler | undefined,
  arg: AgendaDayCellRenderArg,
): AgendaContent | null => resolveCellContent(handler, arg);

export const resolveAgendaSlotLaneClassNames = (
  input: AgendaSlotLaneClassNamesInput | undefined,
  arg: AgendaSlotRenderArg,
): string[] => resolveCellClassNames(input, arg);

export const resolveAgendaSlotLaneContent = (
  handler: AgendaSlotLaneContentHandler | undefined,
  arg: AgendaSlotRenderArg,
): AgendaContent | null => resolveCellContent(handler, arg);

export const resolveAgendaSlotLabelClassNames = (
  input: AgendaSlotLabelClassNamesInput | undefined,
  arg: AgendaSlotRenderArg,
): string[] => resolveCellClassNames(input, arg);

export const resolveAgendaSlotLabelContent = (
  handler: AgendaSlotLabelContentHandler | undefined,
  arg: AgendaSlotRenderArg,
): AgendaContent | null => resolveCellContent(handler, arg);

export const createAgendaDayCellDidMountArg = (
  arg: AgendaDayCellRenderArg,
  el: HTMLElement,
): AgendaDayCellDidMountArg => ({
  ...arg,
  el,
});

export const createAgendaDayCellWillUnmountArg = (
  arg: AgendaDayCellRenderArg,
  el: HTMLElement,
): AgendaDayCellWillUnmountArg => ({
  ...arg,
  el,
});

export const createAgendaSlotLaneDidMountArg = (
  arg: AgendaSlotRenderArg,
  el: HTMLElement,
): AgendaSlotLaneDidMountArg => ({
  ...arg,
  el,
});

export const createAgendaSlotLaneWillUnmountArg = (
  arg: AgendaSlotRenderArg,
  el: HTMLElement,
): AgendaSlotLaneWillUnmountArg => ({
  ...arg,
  el,
});

export const createAgendaSlotLabelDidMountArg = (
  arg: AgendaSlotRenderArg,
  el: HTMLElement,
): AgendaSlotLabelDidMountArg => ({
  ...arg,
  el,
});

export const createAgendaSlotLabelWillUnmountArg = (
  arg: AgendaSlotRenderArg,
  el: HTMLElement,
): AgendaSlotLabelWillUnmountArg => ({
  ...arg,
  el,
});
