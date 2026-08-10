import type { Appointment, AgendaListRow, Block, Professional } from "../types";
import {
  getAppointmentClientName,
  getAppointmentDurationMinutes,
  getAppointmentPrice,
  getAppointmentProfessionalId,
  getAppointmentStartsAt,
  getBlockDate,
  getBlockEndTime,
  getBlockProfessionalId,
  getBlockReason,
  getBlockStartTime,
  getProfessionalName,
  normalizeAppointment,
  normalizeBlock,
  normalizeProfessional,
} from "./appointment-fields";
import { getAppointmentServiceLabel, isCanceledStatus } from "./format";
import { first, toMin, zoneKey, zoneMins } from "./time";
import { DEFAULT_TIME_ZONE, type TimeZone } from "@zigoschedule/scheduler-core";

type StringLookup = readonly string[] | ReadonlySet<string>;

function hasStringValue(lookup: StringLookup, value: string): boolean {
  if (Array.isArray(lookup)) return lookup.includes(value);
  return (lookup as ReadonlySet<string>).has(value);
}

export function filterVisibleAppointments({
  appointments,
  activeStatuses,
  visibleProfIds,
}: {
  appointments: Appointment[];
  activeStatuses: StringLookup;
  visibleProfIds: StringLookup;
}): Appointment[] {
  return appointments.filter((ag) => {
    if (!hasStringValue(activeStatuses, ag.status)) return false;
    const profId = getAppointmentProfessionalId(ag);
    return !profId || hasStringValue(visibleProfIds, profId);
  });
}

export function filterVisibleBlocks({
  blocks,
  visibleProfIds,
}: {
  blocks: Block[];
  visibleProfIds: StringLookup;
}): Block[] {
  return blocks.filter((bloq) => {
    const profId = getBlockProfessionalId(bloq);
    return !profId || hasStringValue(visibleProfIds, profId);
  });
}

export function groupAppointmentsByDay(
  appointments: Appointment[],
  options: { excludeCanceled?: boolean; timeZone?: TimeZone } = {},
): Map<string, Appointment[]> {
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE;
  const map = new Map<string, Appointment[]>();
  appointments.forEach((ag) => {
    if (options.excludeCanceled && isCanceledStatus(ag.status)) return;
    const dayKey = zoneKey(getAppointmentStartsAt(ag), timeZone);
    if (!map.has(dayKey)) map.set(dayKey, []);
    map.get(dayKey)!.push(ag);
  });
  return map;
}

export function groupBlocksByDay(blocks: Block[]): Map<string, Block[]> {
  const map = new Map<string, Block[]>();
  blocks.forEach((bloq) => {
    const dayKey = getBlockDate(bloq);
    if (!map.has(dayKey)) map.set(dayKey, []);
    map.get(dayKey)!.push(bloq);
  });
  return map;
}

export function buildAgendaListRows({
  appointments,
  blocks,
  professionals,
  profissionais,
  tenantGranularidade,
  timeZone = DEFAULT_TIME_ZONE,
}: {
  appointments: Appointment[];
  blocks: Block[];
  professionals?: Professional[];
  /** @deprecated Use `professionals`. */
  profissionais?: Professional[];
  tenantGranularidade: number;
  timeZone?: TimeZone;
}): AgendaListRow[] {
  const rows: AgendaListRow[] = [];
  const normalizedProfessionals = (professionals ?? profissionais ?? []).map(normalizeProfessional);
  const professionalNameById = new Map(normalizedProfessionals.map((prof) => [prof.id, getProfessionalName(prof)]));

  appointments.map(normalizeAppointment).forEach((ag) => {
    const startsAt = getAppointmentStartsAt(ag);
    const professionalId = getAppointmentProfessionalId(ag);
    const start = zoneMins(startsAt, timeZone);
    const clientName = getAppointmentClientName(ag);
    const serviceName = getAppointmentServiceLabel(ag);
    const professionalName =
      getProfessionalName(first(ag.profissionais) as Professional | null | undefined) ||
      (professionalId ? professionalNameById.get(professionalId) : undefined) ||
      "Professional";

    rows.push({
      id: ag.id,
      kind: "appointment",
      dayKey: zoneKey(startsAt, timeZone),
      start,
      end: start + Math.max(tenantGranularidade, getAppointmentDurationMinutes(ag, 30)),
      clientName,
      serviceName,
      professionalName,
      clienteNome: clientName,
      servicoNome: serviceName,
      profissionalNome: professionalName,
      status: ag.status,
      preco: getAppointmentPrice(ag) ?? 0,
      appointment: ag,
      ag,
    });
  });

  blocks.map(normalizeBlock).forEach((bloq) => {
    const dayKey = getBlockDate(bloq);
    const professionalId = getBlockProfessionalId(bloq);
    const clientName = "Blocked time";
    const serviceName = getBlockReason(bloq) ?? "No reason provided";
    const professionalName = professionalId
      ? professionalNameById.get(professionalId) ?? "All professionals"
      : "All professionals";

    rows.push({
      id: bloq.id,
      kind: "block",
      dayKey,
      start: toMin(getBlockStartTime(bloq)),
      end: toMin(getBlockEndTime(bloq)),
      clientName,
      serviceName,
      professionalName,
      clienteNome: clientName,
      servicoNome: serviceName,
      profissionalNome: professionalName,
      status: "block",
      preco: null,
      block: bloq,
      bloq,
    });
  });

  return rows.sort((a, b) => (a.dayKey === b.dayKey ? a.start - b.start : a.dayKey.localeCompare(b.dayKey)));
}

export function groupAgendaRowsByDay(rows: AgendaListRow[]): [string, AgendaListRow[]][] {
  const groups = new Map<string, AgendaListRow[]>();
  rows.forEach((row) => {
    if (!groups.has(row.dayKey)) groups.set(row.dayKey, []);
    groups.get(row.dayKey)!.push(row);
  });
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
}
