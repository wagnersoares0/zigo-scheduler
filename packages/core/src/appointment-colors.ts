export const DEFAULT_APPOINTMENT_COLOR = "#2563EB";

export const APPOINTMENT_COLOR_OPTIONS = [
  { value: "#2563EB", label: "Blue" },
  { value: "#0891B2", label: "Cyan" },
  { value: "#14B8A6", label: "Teal" },
  { value: "#22C55E", label: "Green" },
  { value: "#84CC16", label: "Lime" },
  { value: "#EAB308", label: "Yellow" },
  { value: "#F97316", label: "Orange" },
  { value: "#EF4444", label: "Red" },
  { value: "#F43F5E", label: "Coral" },
  { value: "#EC4899", label: "Pink" },
  { value: "#D946EF", label: "Fuchsia" },
  { value: "#A855F7", label: "Purple" },
  { value: "#6366F1", label: "Indigo" },
  { value: "#A16207", label: "Copper" },
  { value: "#475569", label: "Slate" },
  { value: "#0F172A", label: "Black" },
] as const;

const LEGACY_APPOINTMENT_COLORS = [
  "#0284C7",
  "#0F766E",
  "#059669",
  "#65A30D",
  "#CA8A04",
  "#EA580C",
  "#DC2626",
  "#DB2777",
  "#7C3AED",
  "#4F46E5",
] as const;

export type AppointmentColor =
  | (typeof APPOINTMENT_COLOR_OPTIONS)[number]["value"]
  | (typeof LEGACY_APPOINTMENT_COLORS)[number];
export type AppointmentColorMode = "default" | "appointment" | "padrao" | "por_cliente";

const APPOINTMENT_COLORS = new Set<string>(
  [
    ...APPOINTMENT_COLOR_OPTIONS.map((option) => option.value),
    ...LEGACY_APPOINTMENT_COLORS,
  ],
);

export function normalizeAppointmentColor(
  value: unknown,
): AppointmentColor | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return APPOINTMENT_COLORS.has(normalized)
    ? (normalized as AppointmentColor)
    : null;
}

export function normalizeAppointmentColorMode(
  value: unknown,
): "default" | "appointment" {
  return value === "appointment" || value === "por_cliente" ? "appointment" : "default";
}

export function resolveAppointmentColor({
  mode,
  defaultColor,
  appointmentColor,
  appointmentColorIsCustom = false,
}: {
  mode: AppointmentColorMode | null | undefined;
  defaultColor: string | null | undefined;
  appointmentColor: string | null | undefined;
  appointmentColorIsCustom?: boolean | null;
}): AppointmentColor {
  const normalizedDefault =
    normalizeAppointmentColor(defaultColor) ?? DEFAULT_APPOINTMENT_COLOR;
  const normalizedAppointment = normalizeAppointmentColor(appointmentColor);
  if (appointmentColorIsCustom && normalizedAppointment)
    return normalizedAppointment;
  if (normalizeAppointmentColorMode(mode) === "appointment")
    return normalizedAppointment ?? normalizedDefault;
  return normalizedDefault;
}
