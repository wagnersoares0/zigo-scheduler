import type { AgendaMessages } from "@zigoschedule/scheduler-core";
import type { AgendaValidationMessages } from "@zigoschedule/scheduler-engine";

export const validationMessagesFromAgendaMessages = (
  messages: AgendaMessages,
): AgendaValidationMessages => ({
  INVALID_DURATION: messages.invalidDuration,
  OUTSIDE_BUSINESS_HOURS: messages.outsideBusinessHours,
  PAST_TIME: messages.pastSlot,
  PAUSE_CONFLICT: messages.lunchSlot,
  APPOINTMENT_CONFLICT: messages.occupiedSlot,
  BLOCK_CONFLICT: messages.occupiedSlot,
  RESOURCE_NOT_ALLOWED: messages.resourceUnavailable,
  NO_EVENT: messages.appointmentNotFound,
  LOCKED_STATUS: messages.appointmentLocked,
});
