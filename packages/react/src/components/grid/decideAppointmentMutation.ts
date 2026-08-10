import {
  isMutationNoop,
  validateAppointmentMutation,
  type AgendaAppointmentEvent,
  type AgendaEngineContext,
  type AgendaEventMutation,
  type AgendaValidationMessages,
} from "@zigoschedule/scheduler-engine";

export const MSG_AGENDAMENTO_NAO_ENCONTRADO = "Appointment not found.";

export type AppointmentMutationDecision =
  /** The appointment is not in the current view; nothing to move. */
  | { status: "missing"; message: string }
  /** Dropped exactly where it already was. Not an error, not a change. */
  | { status: "noop" }
  /** A rule refused it. The message is meant for the user. */
  | { status: "blocked"; message: string }
  | { status: "ready"; mutation: AgendaEventMutation };

/**
 * Decides what happens to a dragged or resized appointment.
 *
 * Dragging and resizing looked like two features and were written twice, with
 * the same four branches in each: appointment gone, nothing changed, a rule
 * said no, or go ahead. Only the commit differs. Pulling the decision out
 * leaves each handler with its own preview and its own save call, and one
 * place where the rules are read.
 */
export function decideAppointmentMutation(
  engine: AgendaEngineContext,
  appointment: AgendaAppointmentEvent | null | undefined,
  mutation: AgendaEventMutation | null,
  messages?: AgendaValidationMessages,
): AppointmentMutationDecision {
  if (!appointment || !mutation) {
    return { status: "missing", message: messages?.NO_EVENT ?? MSG_AGENDAMENTO_NAO_ENCONTRADO };
  }
  if (isMutationNoop(mutation)) {
    return { status: "noop" };
  }

  const validation = validateAppointmentMutation(engine, appointment, mutation, { messages });
  if (!validation.ok) {
    return { status: "blocked", message: validation.message };
  }

  return { status: "ready", mutation };
}
