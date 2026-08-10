import type {
  AgendaInteractionKind,
  AgendaInteractionPhase,
  AgendaInteractionState,
  AgendaTimeRange,
} from "./types";

type BeginInteractionInput = {
  phase: Exclude<AgendaInteractionPhase, "idle" | "committing" | "reverting">;
  kind: AgendaInteractionKind;
  eventId: string | null;
  origin: AgendaTimeRange;
  current?: AgendaTimeRange | null;
  blockedMessage?: string | null;
};

export const createIdleInteractionState = (): AgendaInteractionState => ({
  phase: "idle",
  kind: null,
  eventId: null,
  origin: null,
  current: null,
  blockedMessage: null,
});

export const beginAgendaInteraction = ({
  phase,
  kind,
  eventId,
  origin,
  current = origin,
  blockedMessage = null,
}: BeginInteractionInput): AgendaInteractionState => ({
  phase,
  kind,
  eventId,
  origin,
  current,
  blockedMessage,
});

export const updateAgendaInteraction = (
  state: AgendaInteractionState,
  current: AgendaTimeRange | null,
  blockedMessage: string | null = state.blockedMessage,
): AgendaInteractionState => {
  if (state.phase === "idle") return state;
  return { ...state, current, blockedMessage };
};

export const commitAgendaInteraction = (state: AgendaInteractionState): AgendaInteractionState => {
  if (state.phase === "idle") return state;
  return { ...state, phase: "committing", blockedMessage: null };
};

export const revertAgendaInteraction = (
  state: AgendaInteractionState,
  blockedMessage: string | null = state.blockedMessage,
): AgendaInteractionState => {
  if (state.phase === "idle") return state;
  return { ...state, phase: "reverting", blockedMessage };
};

export const isAgendaInteractionActive = (state: AgendaInteractionState): boolean =>
  state.phase !== "idle";

export const isAgendaInteractionForEvent = (
  state: AgendaInteractionState,
  eventId: string,
): boolean => state.eventId === eventId && state.phase !== "idle";

export const shouldHideEventForInteraction = (
  state: AgendaInteractionState,
  eventId: string,
): boolean =>
  isAgendaInteractionForEvent(state, eventId) &&
  (state.phase === "dragging" ||
    state.phase === "resizing" ||
    state.phase === "committing" ||
    state.phase === "reverting");
