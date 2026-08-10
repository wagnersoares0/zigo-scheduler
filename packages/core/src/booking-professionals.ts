export const INVALID_BOOKING_PROFESSIONAL_MESSAGE =
  "Select a valid bookable professional.";

export const NO_BOOKING_PROFESSIONAL_MESSAGE =
  "Add a bookable professional before creating appointments.";

export type BookingProfessionalLike = {
  id?: string | null;
  name?: string | null;
  nome?: string | null;
  ativo?: boolean | null;
  nivel_acesso?: unknown;
  nivelAcesso?: unknown;
  cargo?: unknown;
  user_id?: string | null;
  isOwner?: boolean | null;
  mostrar_perfil_publico?: boolean | null;
};

export function normalizeBookingProfessionalRoleText(value: unknown): string {
  return typeof value === "string"
    ? value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    : "";
}

export function isReceptionistProfessional(value: {
  nivel_acesso?: unknown;
  nivelAcesso?: unknown;
  cargo?: unknown;
}): boolean {
  const nivelAcesso = normalizeBookingProfessionalRoleText(
    value.nivel_acesso ?? value.nivelAcesso
  );
  const cargo = normalizeBookingProfessionalRoleText(value.cargo);

  return nivelAcesso === "recepcionista" || cargo.includes("recepcion");
}

export function isBookingProfessional(value: BookingProfessionalLike): boolean {
  const nivelAcesso = normalizeBookingProfessionalRoleText(
    value.nivel_acesso ?? value.nivelAcesso
  );

  return (
    value.ativo !== false &&
    nivelAcesso !== "gerente" &&
    !isReceptionistProfessional(value)
  );
}

export function isOwnerBookingProfessional(
  value: BookingProfessionalLike,
  ownerUserId?: string | null
): boolean {
  return Boolean(value.isOwner || (ownerUserId && value.user_id && value.user_id === ownerUserId));
}

export function filterAndSortBookingProfessionals<T extends BookingProfessionalLike>(
  professionals: T[],
  ownerUserId?: string | null
): T[] {
  return professionals
    .map((professional, index) => ({ professional, index }))
    .filter(({ professional }) => isBookingProfessional(professional))
    .sort((a, b) => {
      const aOwner = isOwnerBookingProfessional(a.professional, ownerUserId);
      const bOwner = isOwnerBookingProfessional(b.professional, ownerUserId);
      if (aOwner !== bOwner) return aOwner ? -1 : 1;

      const byName = String(a.professional.name ?? a.professional.nome ?? "").localeCompare(
        String(b.professional.name ?? b.professional.nome ?? ""),
        "en-US",
        { sensitivity: "base" }
      );
      if (byName !== 0) return byName;

      return a.index - b.index;
    })
    .map(({ professional }) => professional);
}

export function selectBookingProfessionalsForPlan<T extends BookingProfessionalLike>(
  professionals: T[],
  options: {
    ownerUserId?: string | null;
    maxProfessionals?: number | null;
  } = {}
): T[] {
  const eligible = filterAndSortBookingProfessionals(
    professionals,
    options.ownerUserId
  );
  if (options.maxProfessionals === null || options.maxProfessionals === undefined) {
    return eligible;
  }

  const limit = Math.max(0, Math.trunc(options.maxProfessionals));
  if (limit === 1 && eligible.length > 1) {
    const byPrimaryIdentity = [...eligible].sort((a, b) => {
      const aOwner = isOwnerBookingProfessional(a, options.ownerUserId);
      const bOwner = isOwnerBookingProfessional(b, options.ownerUserId);
      if (aOwner !== bOwner) return aOwner ? -1 : 1;
      return String(a.id ?? "").localeCompare(String(b.id ?? ""));
    });
    return byPrimaryIdentity.slice(0, 1);
  }
  return eligible.slice(0, limit);
}
