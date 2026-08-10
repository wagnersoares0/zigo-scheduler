import type {
  AgendaAppointmentEvent,
  AgendaEventMutation,
  AgendaMutationKind,
  AgendaTimeRange,
} from "./types";

export const getRangeDuration = (range: AgendaTimeRange): number => range.endMinute - range.startMinute;

export const buildMoveMutation = (
  event: AgendaAppointmentEvent,
  nextRange: AgendaTimeRange,
): AgendaEventMutation => ({
  kind: "move",
  eventId: event.id,
  oldRange: {
    dayKey: event.dayKey,
    resourceId: event.resourceId,
    startMinute: event.startMinute,
    endMinute: event.endMinute,
  },
  nextRange,
  durationMinutes: getRangeDuration(nextRange),
});

export const buildResizeMutation = (
  event: AgendaAppointmentEvent,
  nextEndMinute: number,
): AgendaEventMutation => ({
  kind: "resize",
  eventId: event.id,
  oldRange: {
    dayKey: event.dayKey,
    resourceId: event.resourceId,
    startMinute: event.startMinute,
    endMinute: event.endMinute,
  },
  nextRange: {
    dayKey: event.dayKey,
    resourceId: event.resourceId,
    startMinute: event.startMinute,
    endMinute: nextEndMinute,
  },
  durationMinutes: nextEndMinute - event.startMinute,
});

export const isMutationNoop = (mutation: AgendaEventMutation): boolean =>
  mutation.oldRange.dayKey === mutation.nextRange.dayKey &&
  (mutation.oldRange.resourceId ?? "") === (mutation.nextRange.resourceId ?? "") &&
  mutation.oldRange.startMinute === mutation.nextRange.startMinute &&
  mutation.oldRange.endMinute === mutation.nextRange.endMinute;

export const getMutationKindLabel = (kind: AgendaMutationKind): string => {
  if (kind === "resize") return "redimensionar";
  return "mover";
};
