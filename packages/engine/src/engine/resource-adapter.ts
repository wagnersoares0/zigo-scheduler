import type { Professional } from "../types";
import {
  getProfessionalClosesAt,
  getProfessionalName,
  getProfessionalOpensAt,
  getProfessionalPhotoUrl,
  normalizeProfessional,
} from "../utils/appointment-fields";
import { normalizeHHMM, toMin } from "../utils/time";

export const AGENDA_UNASSIGNED_RESOURCE_ID = "__agenda_unassigned__";

export type AgendaResourceBusinessHoursInput = {
  startTime: string;
  endTime: string;
  startMinute: number;
  endMinute: number;
};

export type AgendaResourceInput = {
  id: string;
  title: string;
  businessHours?: AgendaResourceBusinessHoursInput;
  extendedProps: {
    schedulerScoped: true;
    /** @deprecated Use `schedulerScoped`. */
    tenantScoped?: true;
    resourceId: string | null;
    name: string;
    photoUrl: string | null;
    /** @deprecated Use `name`. */
    nome?: string;
    /** @deprecated Use `photoUrl`. */
    fotoUrl?: string | null;
    visible: boolean;
  };
};

const normalizeText = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const normalizeVisibleSet = (resourceIds: readonly (string | null)[] | undefined): Set<string> | null => {
  if (!resourceIds?.length) return null;
  const ids = resourceIds
    .map((id) => normalizeText(id))
    .filter(Boolean);
  return ids.length ? new Set(ids) : null;
};

export const toAgendaPublicResourceId = (resourceId: string | null | undefined): string => {
  const normalized = normalizeText(resourceId);
  return normalized || AGENDA_UNASSIGNED_RESOURCE_ID;
};

export const fromAgendaPublicResourceId = (resourceId: string): string | null =>
  resourceId === AGENDA_UNASSIGNED_RESOURCE_ID ? null : normalizeText(resourceId) || null;

const getResourceBusinessHoursInput = (prof: Professional): AgendaResourceBusinessHoursInput | undefined => {
  const startTime = normalizeHHMM(normalizeText(getProfessionalOpensAt(prof)));
  const endTime = normalizeHHMM(normalizeText(getProfessionalClosesAt(prof)));

  if (!startTime || !endTime) return undefined;

  const startMinute = toMin(startTime);
  const endMinute = toMin(endTime);
  if (!Number.isFinite(startMinute) || !Number.isFinite(endMinute) || endMinute <= startMinute) {
    return undefined;
  }

  return { startTime, endTime, startMinute, endMinute };
};

export const profToAgendaResourceInput = (
  prof: Professional,
  visibleResourceIds?: Set<string> | null,
): AgendaResourceInput | null => {
  const normalized = normalizeProfessional(prof);
  const resourceId = normalizeText(normalized.id);
  if (!resourceId) return null;

  const title = getProfessionalName(normalized) || "Professional";
  const visible = !visibleResourceIds || visibleResourceIds.has(resourceId);

  return {
    id: toAgendaPublicResourceId(resourceId),
    title,
    businessHours: getResourceBusinessHoursInput(normalized),
    extendedProps: {
      schedulerScoped: true,
      tenantScoped: true,
      resourceId,
      name: title,
      photoUrl: getProfessionalPhotoUrl(normalized),
      nome: title,
      fotoUrl: getProfessionalPhotoUrl(normalized),
      visible,
    },
  };
};

export const buildAgendaResourceInputs = ({
  professionals,
  profissionais,
  visibleResourceIds,
  fallbackTitle = "Agenda",
}: {
  professionals?: readonly Professional[];
  /** @deprecated Use `professionals`. */
  profissionais?: readonly Professional[];
  visibleResourceIds?: readonly (string | null)[];
  fallbackTitle?: string;
}): AgendaResourceInput[] => {
  const visibleSet = normalizeVisibleSet(visibleResourceIds);
  const inputProfessionals = professionals ?? profissionais ?? [];
  const resources = inputProfessionals
    .map((prof) => profToAgendaResourceInput(prof, visibleSet))
    .filter((resource): resource is AgendaResourceInput => Boolean(resource));

  if (resources.length) return resources;

  return [{
    id: AGENDA_UNASSIGNED_RESOURCE_ID,
    title: normalizeText(fallbackTitle) || "Agenda",
    extendedProps: {
      schedulerScoped: true,
      tenantScoped: true,
      resourceId: null,
      name: normalizeText(fallbackTitle) || "Agenda",
      photoUrl: null,
      nome: normalizeText(fallbackTitle) || "Agenda",
      fotoUrl: null,
      visible: true,
    },
  }];
};
