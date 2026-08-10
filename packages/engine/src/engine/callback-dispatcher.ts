import type { AgendaResolvedOptions } from "./agenda-options";
import type { AgendaEventInput } from "./event-adapter";
import type { AgendaEventSourceInput } from "./event-sources";
import {
  createAgendaEventDidMountArg,
  createAgendaEventMouseArg,
  createAgendaEventWillUnmountArg,
  type AgendaEventDidMountArg,
  type AgendaEventMouseArg,
  type AgendaEventRenderArg,
  type AgendaEventWillUnmountArg,
} from "./event-rendering";
import {
  createAgendaDayCellDidMountArg,
  createAgendaDayCellWillUnmountArg,
  createAgendaSlotLabelDidMountArg,
  createAgendaSlotLabelWillUnmountArg,
  createAgendaSlotLaneDidMountArg,
  createAgendaSlotLaneWillUnmountArg,
  type AgendaDayCellDidMountArg,
  type AgendaDayCellRenderArg,
  type AgendaDayCellWillUnmountArg,
  type AgendaSlotLabelDidMountArg,
  type AgendaSlotLabelWillUnmountArg,
  type AgendaSlotLaneDidMountArg,
  type AgendaSlotLaneWillUnmountArg,
  type AgendaSlotRenderArg,
} from "./cell-rendering";
import {
  createAgendaDateClickArg,
  createAgendaEventClickArg,
  createAgendaEventSourceFailureArg,
  createAgendaEventSourceSuccessArg,
  createAgendaSelectArg,
  type AgendaDateClickArg,
  type AgendaEventClickArg,
  type AgendaEventSourceFailureArg,
  type AgendaEventSourceSuccessArg,
  type AgendaNativeInteractionEvent,
  type AgendaSelectArg,
} from "./callback-contracts";
import type { AgendaViewId } from "./view-defs";

export type AgendaCallbackName =
  | "eventClick"
  | "dateClick"
  | "select"
  | "loading"
  | "eventSourceSuccess"
  | "eventSourceFailure"
  | "eventDidMount"
  | "eventWillUnmount"
  | "eventMouseEnter"
  | "eventMouseLeave"
  | "dayCellDidMount"
  | "dayCellWillUnmount"
  | "slotLaneDidMount"
  | "slotLaneWillUnmount"
  | "slotLabelDidMount"
  | "slotLabelWillUnmount";

export type AgendaCallbackDispatchResult<Arg> = {
  callbackName: AgendaCallbackName;
  dispatched: boolean;
  arg: Arg;
  error: Error | null;
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error("Agenda callback failed");

const dispatchAgendaCallback = <Arg>(
  callbackName: AgendaCallbackName,
  arg: Arg,
  handler: ((arg: Arg) => void) | undefined,
): AgendaCallbackDispatchResult<Arg> => {
  if (!handler) {
    return { callbackName, dispatched: false, arg, error: null };
  }

  try {
    handler(arg);
    return { callbackName, dispatched: true, arg, error: null };
  } catch (error) {
    return { callbackName, dispatched: true, arg, error: toError(error) };
  }
};

export const dispatchAgendaEventClick = ({
  options,
  event,
  view,
  jsEvent,
}: {
  options: AgendaResolvedOptions;
  event: AgendaEventInput;
  view: AgendaViewId;
  jsEvent?: AgendaNativeInteractionEvent;
}): AgendaCallbackDispatchResult<AgendaEventClickArg> =>
  dispatchAgendaCallback(
    "eventClick",
    createAgendaEventClickArg(event, view, jsEvent),
    options.eventClick,
  );

export const dispatchAgendaDateClick = ({
  options,
  date,
  view,
  allDay = false,
  resourceId = null,
  jsEvent,
}: {
  options: AgendaResolvedOptions;
  date: Date;
  view: AgendaViewId;
  allDay?: boolean;
  resourceId?: string | null;
  jsEvent?: AgendaNativeInteractionEvent;
}): AgendaCallbackDispatchResult<AgendaDateClickArg> =>
  dispatchAgendaCallback(
    "dateClick",
    createAgendaDateClickArg({ date, view, allDay, resourceId, jsEvent }),
    options.dateClick,
  );

export const dispatchAgendaSelect = ({
  options,
  start,
  end,
  view,
  allDay = false,
  resourceId = null,
  jsEvent,
}: {
  options: AgendaResolvedOptions;
  start: Date;
  end: Date;
  view: AgendaViewId;
  allDay?: boolean;
  resourceId?: string | null;
  jsEvent?: AgendaNativeInteractionEvent;
}): AgendaCallbackDispatchResult<AgendaSelectArg> =>
  dispatchAgendaCallback(
    "select",
    createAgendaSelectArg({ start, end, view, allDay, resourceId, jsEvent }),
    options.select,
  );

export const dispatchAgendaLoading = ({
  options,
  isLoading,
}: {
  options: AgendaResolvedOptions;
  isLoading: boolean;
}): AgendaCallbackDispatchResult<boolean> =>
  dispatchAgendaCallback("loading", isLoading, options.loading);

export const dispatchAgendaEventSourceSuccess = ({
  options,
  source,
}: {
  options: AgendaResolvedOptions;
  source: AgendaEventSourceInput;
}): AgendaCallbackDispatchResult<AgendaEventSourceSuccessArg> =>
  dispatchAgendaCallback(
    "eventSourceSuccess",
    createAgendaEventSourceSuccessArg(source),
    options.eventSourceSuccess,
  );

export const dispatchAgendaEventSourceFailure = ({
  options,
  source,
}: {
  options: AgendaResolvedOptions;
  source: AgendaEventSourceInput;
}): AgendaCallbackDispatchResult<AgendaEventSourceFailureArg> =>
  dispatchAgendaCallback(
    "eventSourceFailure",
    createAgendaEventSourceFailureArg(source),
    options.eventSourceFailure,
  );

export const dispatchAgendaEventDidMount = ({
  options,
  arg,
  el,
}: {
  options: AgendaResolvedOptions;
  arg: AgendaEventRenderArg;
  el: HTMLElement;
}): AgendaCallbackDispatchResult<AgendaEventDidMountArg> =>
  dispatchAgendaCallback(
    "eventDidMount",
    createAgendaEventDidMountArg(arg, el),
    options.eventDidMount,
  );

export const dispatchAgendaEventWillUnmount = ({
  options,
  arg,
  el,
}: {
  options: AgendaResolvedOptions;
  arg: AgendaEventRenderArg;
  el: HTMLElement;
}): AgendaCallbackDispatchResult<AgendaEventWillUnmountArg> =>
  dispatchAgendaCallback(
    "eventWillUnmount",
    createAgendaEventWillUnmountArg(arg, el),
    options.eventWillUnmount,
  );

export const dispatchAgendaEventMouseEnter = ({
  options,
  arg,
  el,
  jsEvent,
}: {
  options: AgendaResolvedOptions;
  arg: AgendaEventRenderArg;
  el: HTMLElement;
  jsEvent: MouseEvent;
}): AgendaCallbackDispatchResult<AgendaEventMouseArg> =>
  dispatchAgendaCallback(
    "eventMouseEnter",
    createAgendaEventMouseArg(arg, el, jsEvent),
    options.eventMouseEnter,
  );

export const dispatchAgendaEventMouseLeave = ({
  options,
  arg,
  el,
  jsEvent,
}: {
  options: AgendaResolvedOptions;
  arg: AgendaEventRenderArg;
  el: HTMLElement;
  jsEvent: MouseEvent;
}): AgendaCallbackDispatchResult<AgendaEventMouseArg> =>
  dispatchAgendaCallback(
    "eventMouseLeave",
    createAgendaEventMouseArg(arg, el, jsEvent),
    options.eventMouseLeave,
  );

export const dispatchAgendaDayCellDidMount = ({
  options,
  arg,
  el,
}: {
  options: AgendaResolvedOptions;
  arg: AgendaDayCellRenderArg;
  el: HTMLElement;
}): AgendaCallbackDispatchResult<AgendaDayCellDidMountArg> =>
  dispatchAgendaCallback(
    "dayCellDidMount",
    createAgendaDayCellDidMountArg(arg, el),
    options.dayCellDidMount,
  );

export const dispatchAgendaDayCellWillUnmount = ({
  options,
  arg,
  el,
}: {
  options: AgendaResolvedOptions;
  arg: AgendaDayCellRenderArg;
  el: HTMLElement;
}): AgendaCallbackDispatchResult<AgendaDayCellWillUnmountArg> =>
  dispatchAgendaCallback(
    "dayCellWillUnmount",
    createAgendaDayCellWillUnmountArg(arg, el),
    options.dayCellWillUnmount,
  );

export const dispatchAgendaSlotLaneDidMount = ({
  options,
  arg,
  el,
}: {
  options: AgendaResolvedOptions;
  arg: AgendaSlotRenderArg;
  el: HTMLElement;
}): AgendaCallbackDispatchResult<AgendaSlotLaneDidMountArg> =>
  dispatchAgendaCallback(
    "slotLaneDidMount",
    createAgendaSlotLaneDidMountArg(arg, el),
    options.slotLaneDidMount,
  );

export const dispatchAgendaSlotLaneWillUnmount = ({
  options,
  arg,
  el,
}: {
  options: AgendaResolvedOptions;
  arg: AgendaSlotRenderArg;
  el: HTMLElement;
}): AgendaCallbackDispatchResult<AgendaSlotLaneWillUnmountArg> =>
  dispatchAgendaCallback(
    "slotLaneWillUnmount",
    createAgendaSlotLaneWillUnmountArg(arg, el),
    options.slotLaneWillUnmount,
  );

export const dispatchAgendaSlotLabelDidMount = ({
  options,
  arg,
  el,
}: {
  options: AgendaResolvedOptions;
  arg: AgendaSlotRenderArg;
  el: HTMLElement;
}): AgendaCallbackDispatchResult<AgendaSlotLabelDidMountArg> =>
  dispatchAgendaCallback(
    "slotLabelDidMount",
    createAgendaSlotLabelDidMountArg(arg, el),
    options.slotLabelDidMount,
  );

export const dispatchAgendaSlotLabelWillUnmount = ({
  options,
  arg,
  el,
}: {
  options: AgendaResolvedOptions;
  arg: AgendaSlotRenderArg;
  el: HTMLElement;
}): AgendaCallbackDispatchResult<AgendaSlotLabelWillUnmountArg> =>
  dispatchAgendaCallback(
    "slotLabelWillUnmount",
    createAgendaSlotLabelWillUnmountArg(arg, el),
    options.slotLabelWillUnmount,
  );
