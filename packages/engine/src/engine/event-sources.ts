import type { Appointment, Block } from "../types";
import type { AgendaDateRange } from "./view-defs";
import {
  appointmentToAgendaEventInput,
  blockToAgendaEventInput,
  type AgendaEventInput,
  type LegacyAgendaEventSourceId,
  type AgendaEventSourceId,
  toAgendaEventSourceId,
} from "./event-adapter";
import { DEFAULT_TIME_ZONE, type TimeZone } from "@zigoschedule/scheduler-core";
import { isCanceledStatus } from "../utils/format";

export type AgendaEventSourceKind = "appointments" | "blocks";
export type AgendaEventSourceLifecycleStatus = "idle" | "loading" | "success" | "failure";

export type AgendaEventSourceLifecycle = {
  id: AgendaEventSourceId;
  status: AgendaEventSourceLifecycleStatus;
  loading: boolean;
  error: string | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  lastUpdatedAt: number | null;
};

export type AgendaEventSourceLifecycleMap = Record<AgendaEventSourceId, AgendaEventSourceLifecycle>;

export type AgendaEventSourceError = {
  sourceId: AgendaEventSourceId;
  title: string;
  message: string;
};

export type AgendaEventSourceInput = {
  id: AgendaEventSourceId;
  title: string;
  kind: AgendaEventSourceKind;
  events: AgendaEventInput[];
  eventCount: number;
  loading: boolean;
  status: AgendaEventSourceLifecycleStatus;
  error: string | null;
  lastSuccessAt: number | null;
  lastFailureAt: number | null;
  extendedProps: {
    schedulerScoped: true;
    /** @deprecated Use `schedulerScoped`. */
    tenantScoped?: true;
    range: AgendaDateRange;
    allowedResourceIds: string[];
    visibleResourceIds: string[];
    includeCanceled: boolean;
    status: AgendaEventSourceLifecycleStatus;
  };
};

export type AgendaEventSourcesSnapshot = {
  sources: AgendaEventSourceInput[];
  events: AgendaEventInput[];
  eventCount: number;
  loading: boolean;
  errorCount: number;
  errors: AgendaEventSourceError[];
  sourceStates: AgendaEventSourceLifecycleMap;
  range: AgendaDateRange;
};

export const AGENDA_EVENT_SOURCE_IDS: readonly AgendaEventSourceId[] = ["appointments", "blocks"];

export const AGENDA_EVENT_SOURCE_TITLES: Record<AgendaEventSourceId, string> = {
  appointments: "Appointments",
  blocks: "Blocks",
};

const normalizeEventSourceError = (error: unknown): string => {
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  return "Failed to load calendar source.";
};

export const createAgendaEventSourceLifecycle = (
  id: LegacyAgendaEventSourceId,
  input: Partial<Omit<AgendaEventSourceLifecycle, "id">> = {},
): AgendaEventSourceLifecycle => {
  const sourceId = toAgendaEventSourceId(id);
  const status = input.status ?? "idle";

  return {
    id: sourceId,
    status,
    loading: input.loading ?? status === "loading",
    error: input.error ?? null,
    lastSuccessAt: input.lastSuccessAt ?? null,
    lastFailureAt: input.lastFailureAt ?? null,
    lastUpdatedAt: input.lastUpdatedAt ?? null,
  };
};

export const markAgendaEventSourceLoading = (
  id: LegacyAgendaEventSourceId,
  previous?: AgendaEventSourceLifecycle,
): AgendaEventSourceLifecycle => ({
  id: toAgendaEventSourceId(id),
  status: "loading",
  loading: true,
  error: null,
  lastSuccessAt: previous?.lastSuccessAt ?? null,
  lastFailureAt: previous?.lastFailureAt ?? null,
  lastUpdatedAt: Date.now(),
});

export const markAgendaEventSourceSuccess = (
  id: LegacyAgendaEventSourceId,
  previous?: AgendaEventSourceLifecycle,
): AgendaEventSourceLifecycle => {
  const now = Date.now();

  return {
    id: toAgendaEventSourceId(id),
    status: "success",
    loading: false,
    error: null,
    lastSuccessAt: now,
    lastFailureAt: previous?.lastFailureAt ?? null,
    lastUpdatedAt: now,
  };
};

export const markAgendaEventSourceFailure = (
  id: LegacyAgendaEventSourceId,
  error: unknown,
  previous?: AgendaEventSourceLifecycle,
): AgendaEventSourceLifecycle => {
  const now = Date.now();

  return {
    id: toAgendaEventSourceId(id),
    status: "failure",
    loading: false,
    error: normalizeEventSourceError(error),
    lastSuccessAt: previous?.lastSuccessAt ?? null,
    lastFailureAt: now,
    lastUpdatedAt: now,
  };
};

const resolveEventSourceLifecycle = (
  id: AgendaEventSourceId,
  sourceStates: Partial<Record<LegacyAgendaEventSourceId, AgendaEventSourceLifecycle>> | undefined,
  fallbackLoading: boolean,
): AgendaEventSourceLifecycle => {
  const legacyId = id === "appointments" ? "agendamentos" : "bloqueios";
  const sourceState = sourceStates?.[id] ?? sourceStates?.[legacyId];
  if (sourceState) return createAgendaEventSourceLifecycle(id, sourceState);
  if (fallbackLoading) return createAgendaEventSourceLifecycle(id, { status: "loading", loading: true });
  return createAgendaEventSourceLifecycle(id);
};

const normalizeResourceId = (value: string | null | undefined): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || null;
};

const normalizeResourceSet = (resourceIds: readonly (string | null)[] | undefined): Set<string> | null => {
  if (!resourceIds?.length) return null;
  const normalized = resourceIds
    .map((resourceId) => normalizeResourceId(resourceId))
    .filter((resourceId): resourceId is string => Boolean(resourceId));
  return normalized.length ? new Set(normalized) : null;
};

const toSortedResourceIds = (resourceIds: readonly (string | null)[] | undefined): string[] => {
  const set = normalizeResourceSet(resourceIds);
  return set ? Array.from(set).sort((a, b) => a.localeCompare(b)) : [];
};

const isResourceAllowed = (resourceId: string | null, allowedResourceIds: Set<string> | null): boolean =>
  !resourceId || !allowedResourceIds || allowedResourceIds.has(resourceId);

const isResourceVisible = (resourceId: string | null, visibleResourceIds: Set<string> | null): boolean =>
  !resourceId || !visibleResourceIds || visibleResourceIds.has(resourceId);

const sortAgendaEventInputs = (events: AgendaEventInput[]): AgendaEventInput[] =>
  [...events].sort((a, b) => (
    a.extendedProps.dayKey === b.extendedProps.dayKey
      ? a.extendedProps.startMinute - b.extendedProps.startMinute
      : a.extendedProps.dayKey.localeCompare(b.extendedProps.dayKey)
  ));

const buildSource = ({
  id,
  title,
  kind,
  events,
  lifecycle,
  range,
  allowedResourceIds,
  visibleResourceIds,
  includeCanceled,
}: {
  id: AgendaEventSourceId;
  title: string;
  kind: AgendaEventSourceKind;
  events: AgendaEventInput[];
  lifecycle: AgendaEventSourceLifecycle;
  range: AgendaDateRange;
  allowedResourceIds: string[];
  visibleResourceIds: string[];
  includeCanceled: boolean;
}): AgendaEventSourceInput => ({
  id,
  title,
  kind,
  events: sortAgendaEventInputs(events),
  eventCount: events.length,
  loading: lifecycle.loading,
  status: lifecycle.status,
  error: lifecycle.error,
  lastSuccessAt: lifecycle.lastSuccessAt,
  lastFailureAt: lifecycle.lastFailureAt,
  extendedProps: {
    schedulerScoped: true,
    tenantScoped: true,
    range,
    allowedResourceIds,
    visibleResourceIds,
    includeCanceled,
    status: lifecycle.status,
  },
});

export const buildAgendaEventSourcesSnapshot = ({
  appointments,
  blocks,
  range,
  loading = false,
  allowedResourceIds,
  visibleResourceIds,
  includeCanceled = false,
  sourceStates,
  timeZone = DEFAULT_TIME_ZONE,
}: {
  appointments: readonly Appointment[];
  blocks: readonly Block[];
  range: AgendaDateRange;
  loading?: boolean;
  allowedResourceIds?: readonly (string | null)[];
  visibleResourceIds?: readonly (string | null)[];
  includeCanceled?: boolean;
  sourceStates?: Partial<Record<LegacyAgendaEventSourceId, AgendaEventSourceLifecycle>>;
  timeZone?: TimeZone;
}): AgendaEventSourcesSnapshot => {
  const allowedSet = normalizeResourceSet(allowedResourceIds);
  const visibleSet = normalizeResourceSet(visibleResourceIds);
  const normalizedAllowedResourceIds = toSortedResourceIds(allowedResourceIds);
  const normalizedVisibleResourceIds = toSortedResourceIds(visibleResourceIds);
  const appointmentsLifecycle = resolveEventSourceLifecycle("appointments", sourceStates, loading);
  const blocksLifecycle = resolveEventSourceLifecycle("blocks", sourceStates, loading);

  const appointmentEvents = appointments
    .filter((appointment) => includeCanceled || !isCanceledStatus(appointment.status))
    // Keep the arrow explicit: passing the function directly would send the
    // array index as the time zone.
    .map((appointment) => appointmentToAgendaEventInput(appointment, timeZone))
    .filter((event) => (
      isResourceAllowed(event.resourceId, allowedSet) &&
      isResourceVisible(event.resourceId, visibleSet)
    ));

  const blockEvents = blocks
    .map((block) => blockToAgendaEventInput(block, timeZone))
    .filter((event) => (
      isResourceAllowed(event.resourceId, allowedSet) &&
      isResourceVisible(event.resourceId, visibleSet)
    ));

  const sources = [
    buildSource({
      id: "appointments",
      title: AGENDA_EVENT_SOURCE_TITLES.appointments,
      kind: "appointments",
      events: appointmentEvents,
      lifecycle: appointmentsLifecycle,
      range,
      allowedResourceIds: normalizedAllowedResourceIds,
      visibleResourceIds: normalizedVisibleResourceIds,
      includeCanceled,
    }),
    buildSource({
      id: "blocks",
      title: AGENDA_EVENT_SOURCE_TITLES.blocks,
      kind: "blocks",
      events: blockEvents,
      lifecycle: blocksLifecycle,
      range,
      allowedResourceIds: normalizedAllowedResourceIds,
      visibleResourceIds: normalizedVisibleResourceIds,
      includeCanceled,
    }),
  ];

  const events = sortAgendaEventInputs(sources.flatMap((source) => source.events));
  const errors = sources
    .filter((source) => source.status === "failure" && source.error)
    .map((source) => ({
      sourceId: source.id,
      title: source.title,
      message: source.error ?? "Failed to load scheduler source.",
    }));
  const normalizedSourceStates = sources.reduce((acc, source) => {
    acc[source.id] = createAgendaEventSourceLifecycle(source.id, {
      status: source.status,
      loading: source.loading,
      error: source.error,
      lastSuccessAt: source.lastSuccessAt,
      lastFailureAt: source.lastFailureAt,
      lastUpdatedAt: sourceStates?.[source.id]?.lastUpdatedAt ?? null,
    });
    return acc;
  }, {} as AgendaEventSourceLifecycleMap);

  return {
    sources,
    events,
    eventCount: events.length,
    loading: loading || sources.some((source) => source.loading),
    errorCount: errors.length,
    errors,
    sourceStates: normalizedSourceStates,
    range,
  };
};
