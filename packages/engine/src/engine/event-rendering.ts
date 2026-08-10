import { getBlockReason } from "../utils/appointment-fields";
import { normalizeStatus } from "../utils/format";
import type { AgendaContent } from "./content";
import type { AgendaEventInput } from "./event-adapter";
import {
  toAgendaCanonicalViewId,
  type AgendaCanonicalViewId,
  type AgendaViewId,
} from "./view-defs";

export type AgendaEventRenderDisplay = "timeGrid" | "dayGrid" | "list" | "popover";
export type AgendaEventRenderDensity = "tiny" | "compact" | "regular" | "comfortable";

export type AgendaEventRenderArg = {
  event: AgendaEventInput;
  eventId: string;
  sourceId: AgendaEventInput["sourceId"];
  kind: AgendaEventInput["kind"];
  view: AgendaCanonicalViewId;
  display: AgendaEventRenderDisplay;
  density: AgendaEventRenderDensity;
  timeText: string;
  title: string;
  subtitle: string;
  isMirror: boolean;
  isPending: boolean;
  isPast: boolean;
  isFuture: boolean;
  isToday: boolean;
};

export type AgendaEventContentReturn = AgendaContent | true | null | undefined;
export type AgendaEventContentHandler = (arg: AgendaEventRenderArg) => AgendaEventContentReturn;
export type AgendaEventClassNamesValue = string | string[] | null | undefined;
export type AgendaEventClassNamesInput =
  | AgendaEventClassNamesValue
  | ((arg: AgendaEventRenderArg) => AgendaEventClassNamesValue);
export type AgendaEventDidMountArg = AgendaEventRenderArg & {
  el: HTMLElement;
};
export type AgendaEventDidMountHandler = (arg: AgendaEventDidMountArg) => void;
export type AgendaEventWillUnmountArg = AgendaEventRenderArg & {
  el: HTMLElement;
};
export type AgendaEventWillUnmountHandler = (arg: AgendaEventWillUnmountArg) => void;
export type AgendaEventMouseArg = AgendaEventRenderArg & {
  el: HTMLElement;
  jsEvent: MouseEvent;
};
export type AgendaEventMouseHandler = (arg: AgendaEventMouseArg) => void;

export type AgendaEventBadge = {
  key: string;
  label: string;
  className: string;
};

const EVENT_STATUS_BADGES: Record<string, AgendaEventBadge> = {
  pendente: {
    key: "status-pendente",
    label: "Pending",
    className: "border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]",
  },
  confirmado: {
    key: "status-confirmado",
    label: "Confirmed",
    className: "border-[#CBD5E1] bg-[#F1F5F9] text-[#334155]",
  },
  concluido: {
    key: "status-concluido",
    label: "Completed",
    className: "border-[#CBD5E1] bg-[#E2E8F0] text-[#334155]",
  },
  cancelado: {
    key: "status-cancelado",
    label: "Canceled",
    className: "border-[#FECACA] bg-[#FEE2E2] text-[#B91C1C]",
  },
};

const EVENT_SOURCE_BADGES: Record<AgendaEventInput["sourceId"], AgendaEventBadge> = {
  appointments: {
    key: "source-appointments",
    label: "Appointment",
    className: "border-[#E2E8F0] bg-white/70 text-[#475569]",
  },
  blocks: {
    key: "source-blocks",
    label: "Block",
    className: "border-[#CBD5E1] bg-white/70 text-[#475569]",
  },
};

const isFolgaBlockEvent = (event: AgendaEventInput): boolean => {
  if (event.sourceId !== "blocks") return false;
  const raw = event.extendedProps.raw;
  if (!raw || typeof raw !== "object") return false;
  const reason = getBlockReason(raw as Parameters<typeof getBlockReason>[0]);
  return typeof reason === "string" && /\b(folga|time off|day off)\b/i.test(reason.trim());
};

const sanitizeAgendaClassName = (className: string): string | null => {
  const value = className.trim();
  if (!value || value.length > 120) return null;
  if (/[<>"'`]/.test(value)) return null;
  return value;
};

export const normalizeAgendaClassNames = (value: AgendaEventClassNamesValue): string[] => {
  if (typeof value === "string") {
    return value
      .split(/\s+/)
      .map(sanitizeAgendaClassName)
      .filter((className): className is string => Boolean(className));
  }

  if (!Array.isArray(value)) return [];

  return value
    .flatMap((item) => (typeof item === "string" ? item.split(/\s+/) : []))
    .map(sanitizeAgendaClassName)
    .filter((className): className is string => Boolean(className));
};

export const createAgendaEventRenderArg = ({
  event,
  view,
  display,
  density,
  timeText,
  title,
  subtitle,
  isMirror = false,
  isPending = false,
  isPast = false,
  isFuture = false,
  isToday = false,
}: {
  event: AgendaEventInput;
  view: AgendaViewId;
  display: AgendaEventRenderDisplay;
  density: AgendaEventRenderDensity;
  timeText: string;
  title?: string;
  subtitle?: string;
  isMirror?: boolean;
  isPending?: boolean;
  isPast?: boolean;
  isFuture?: boolean;
  isToday?: boolean;
}): AgendaEventRenderArg => ({
  event,
  eventId: event.id,
  sourceId: event.sourceId,
  kind: event.kind,
  view: toAgendaCanonicalViewId(view),
  display,
  density,
  timeText,
  title: title?.trim() || event.title,
  subtitle: subtitle?.trim() || "",
  isMirror,
  isPending,
  isPast,
  isFuture,
  isToday,
});

export const resolveAgendaEventClassNames = (
  input: AgendaEventClassNamesInput | undefined,
  arg: AgendaEventRenderArg,
): string[] => {
  try {
    return normalizeAgendaClassNames(typeof input === "function" ? input(arg) : input);
  } catch {
    return [];
  }
};

export const resolveAgendaEventContent = (
  handler: AgendaEventContentHandler | undefined,
  arg: AgendaEventRenderArg,
): AgendaContent | null => {
  if (!handler) return null;

  try {
    const content = handler(arg);
    return content === true || content === null || content === undefined ? null : content;
  } catch {
    return null;
  }
};

export const createAgendaEventDidMountArg = (
  arg: AgendaEventRenderArg,
  el: HTMLElement,
): AgendaEventDidMountArg => ({
  ...arg,
  el,
});

export const createAgendaEventWillUnmountArg = (
  arg: AgendaEventRenderArg,
  el: HTMLElement,
): AgendaEventWillUnmountArg => ({
  ...arg,
  el,
});

export const createAgendaEventMouseArg = (
  arg: AgendaEventRenderArg,
  el: HTMLElement,
  jsEvent: MouseEvent,
): AgendaEventMouseArg => ({
  ...arg,
  el,
  jsEvent,
});

export const getAgendaEventStatusBadge = (event: AgendaEventInput): AgendaEventBadge | null => {
  const status = event.extendedProps.status?.trim();
  return status ? EVENT_STATUS_BADGES[normalizeStatus(status)] ?? null : null;
};

export const getAgendaEventSourceBadge = (event: AgendaEventInput): AgendaEventBadge => {
  if (isFolgaBlockEvent(event)) {
    return {
      key: "source-folga",
      label: "Folga",
      className: "border-[#BAE6FD] bg-white/80 text-[#0369A1]",
    };
  }

  return EVENT_SOURCE_BADGES[event.sourceId];
};

export const getAgendaEventEarlyChargeBadge = (
  event: AgendaEventInput,
): AgendaEventBadge | null => {
  if (event.sourceId !== "appointments") return null;
  const raw = event.extendedProps.raw;
  if (!raw || typeof raw !== "object") return null;
  if ((raw as { cobranca_antecipada?: unknown }).cobranca_antecipada !== true) {
    return null;
  }

  return {
    key: "checkout-antecipado",
    label: "Antecipado",
    className: "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]",
  };
};

export const getAgendaEventDefaultBadges = (event: AgendaEventInput): AgendaEventBadge[] => {
  const badges = [getAgendaEventSourceBadge(event)];
  const statusBadge = getAgendaEventStatusBadge(event);
  if (statusBadge) badges.push(statusBadge);
  const earlyChargeBadge = getAgendaEventEarlyChargeBadge(event);
  if (earlyChargeBadge) badges.push(earlyChargeBadge);
  return badges;
};
