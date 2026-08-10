import type { Appointment, Block, BreakWindow, Professional } from "../types";
import type { TimeZone } from "@zigoschedule/scheduler-core";

export type AgendaResourceId = string | null;

export type AgendaResource = {
  id: AgendaResourceId;
  name: string;
  /** @deprecated Use `name`. */
  nome?: string;
  title: string;
  businessHours?: {
    startMinute: number;
    endMinute: number;
  };
};

export type AgendaTimeRange = {
  dayKey: string;
  resourceId: AgendaResourceId;
  startMinute: number;
  endMinute: number;
};

export type AgendaAppointmentEvent = AgendaTimeRange & {
  kind: "appointment";
  id: string;
  status: string;
  /** Start minute including reserved preparation/travel buffer. */
  bufferStartMinute?: number;
  /** End minute including reserved cleanup/travel buffer. */
  bufferEndMinute?: number;
  appointment: Appointment;
  /** @deprecated Use `appointment`. */
  ag?: Appointment;
};

export type AgendaBlockEvent = AgendaTimeRange & {
  kind: "block";
  id: string;
  block: Block;
  /** @deprecated Use `block`. */
  bloq?: Block;
};

export type AgendaEngineEvent = AgendaAppointmentEvent | AgendaBlockEvent;

export type AgendaBusinessHours = {
  startMinute: number;
  endMinute: number;
  isClosed?: boolean;
  closedMessage?: string;
};

export type AgendaTemporalGuards = {
  isDayBeforeToday: (dayKey: string) => boolean;
  isDayClosedForToday: (dayKey: string) => boolean;
  isSlotInPast: (dayKey: string, minute: number) => boolean;
};

export type AgendaEngineContext = {
  resources: AgendaResource[];
  appointmentsByDay: Map<string, AgendaAppointmentEvent[]>;
  blocksByDay: Map<string, AgendaBlockEvent[]>;
  businessHours: AgendaBusinessHours;
  getBusinessHoursForDay?: (dayKey: string) => AgendaBusinessHours;
  getResourceBusinessHoursForDay?: (resourceId: AgendaResourceId, dayKey: string) => AgendaBusinessHours | null | undefined;
  getResourceBreakWindowForDay?: (resourceId: AgendaResourceId, dayKey: string) => BreakWindow | null | undefined;
  breakWindow: BreakWindow | null;
  /** @deprecated Use `getResourceBreakWindowForDay`. */
  getResourcePausaIntervaloForDay?: (resourceId: AgendaResourceId, dayKey: string) => BreakWindow | null | undefined;
  /** @deprecated Use `breakWindow`. */
  pausaIntervalo?: BreakWindow | null;
  snapMinutes: number;
  temporalGuards: AgendaTemporalGuards;
};

export type AgendaEngineInput = {
  resources: Professional[];
  date: Date;
  timeZone?: TimeZone;
  appointmentsByDay: Map<string, Appointment[]>;
  blocksByDay: Map<string, Block[]>;
  businessHours: AgendaBusinessHours;
  getBusinessHoursForDay?: (dayKey: string) => AgendaBusinessHours;
  getResourceBusinessHoursForDay?: (resourceId: AgendaResourceId, dayKey: string) => AgendaBusinessHours | null | undefined;
  getResourceBreakWindowForDay?: (resourceId: AgendaResourceId, dayKey: string) => BreakWindow | null | undefined;
  breakWindow?: BreakWindow | null;
  /** @deprecated Use `getResourceBreakWindowForDay`. */
  getResourcePausaIntervaloForDay?: (resourceId: AgendaResourceId, dayKey: string) => BreakWindow | null | undefined;
  /** @deprecated Use `breakWindow`. */
  pausaIntervalo?: BreakWindow | null;
  snapMinutes: number;
  temporalGuards: AgendaTemporalGuards;
};

export type AgendaInteractionKind = "move" | "resize" | "select";

export type AgendaInteractionPhase =
  | "idle"
  | "dragging"
  | "resizing"
  | "selecting"
  | "committing"
  | "reverting";

export type AgendaInteractionState = {
  phase: AgendaInteractionPhase;
  kind: AgendaInteractionKind | null;
  eventId: string | null;
  origin: AgendaTimeRange | null;
  current: AgendaTimeRange | null;
  blockedMessage: string | null;
};

export type AgendaMutationKind = "move" | "resize";

export type AgendaEventMutation = {
  kind: AgendaMutationKind;
  eventId: string;
  oldRange: AgendaTimeRange;
  nextRange: AgendaTimeRange;
  durationMinutes: number;
};

export type AgendaValidationCode =
  | "NO_EVENT"
  | "LOCKED_STATUS"
  | "INVALID_DURATION"
  | "OUTSIDE_BUSINESS_HOURS"
  | "PAST_TIME"
  | "PAUSE_CONFLICT"
  | "APPOINTMENT_CONFLICT"
  | "BLOCK_CONFLICT"
  | "RESOURCE_NOT_ALLOWED";

export type AgendaValidationResult =
  | { ok: true }
  | { ok: false; code: AgendaValidationCode; message: string };

export type AgendaValidationMessages = Partial<Record<AgendaValidationCode, string>>;

export type AgendaValidationOptions = {
  ignoreAppointmentId?: string;
  ignoreBlockId?: string;
  skipAppointmentConflicts?: boolean;
  skipBlockConflicts?: boolean;
  messages?: AgendaValidationMessages;
};
