import type {
  DayProfCardTheme,
  WeekdayKey,
  CheckoutPaymentMethod,
  Professional,
} from "../types";
import {
  resolveAppointmentColor,
  type AppointmentColorMode,
} from "@zigoschedule/scheduler-core";

export const GRID_MIN = 5;
export const SLOT_H = 32;
export const MONTH_DAY_CELL_HEIGHT_PX = 170;
export const MAX_APPOINTMENT_DURATION_MINUTES = 720;
/** @deprecated Use `MAX_APPOINTMENT_DURATION_MINUTES`. */
export const MAX_DURACAO_AGENDAMENTO_MINUTOS = MAX_APPOINTMENT_DURATION_MINUTES;

export const STATUS_OPTIONS = [
  { value: "pendente", label: "Pending" },
  { value: "confirmado", label: "Confirmed" },
  { value: "concluido", label: "Completed" },
  { value: "cancelado", label: "Canceled" },
] as const;

export const DRAWER_STATUS_OPTIONS = [
  { value: "confirmado", label: "Confirmed" },
  { value: "concluido", label: "Completed" },
] as const;

export const STATUS_VALUES = STATUS_OPTIONS.map((s) => s.value);

export const CHECKOUT_FORMAS: Array<{
  value: CheckoutPaymentMethod;
  label: string;
}> = [
  { value: "dinheiro", label: "Cash" },
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Debit card" },
  { value: "credito", label: "Credit card" },
  { value: "outro", label: "Other" },
];

export const WEEKDAY_KEY_BY_DOW: WeekdayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];
/** @deprecated Use `WEEKDAY_KEY_BY_DOW`. */
export const DIA_KEY_POR_DOW = WEEKDAY_KEY_BY_DOW;

export const PAST_TIME_MESSAGE =
  "This time has already passed. Choose a later time or book for tomorrow.";

export const BREAK_TIME_MESSAGE =
  "This time is inside the configured break. Choose a time outside the break.";

/** @deprecated Use `PAST_TIME_MESSAGE`. */
export const MSG_HORARIO_PASSADO = PAST_TIME_MESSAGE;

/** @deprecated Use `BREAK_TIME_MESSAGE`. */
export const MSG_INTERVALO_ALMOCO = BREAK_TIME_MESSAGE;

// Professional color themes.

export const DAY_PROF_CARD_THEMES: DayProfCardTheme[] = [
  {
    borderClass: "border-[#0284C7]",
    bgClass: "bg-[#BAE6FD]",
    headerClass: "bg-[#0284C7]",
    ringClass: "ring-1 ring-[#38BDF8]",
    hoverClass: "hover:ring-2 hover:ring-[#7DD3FC] hover:shadow-md",
    timeClass: "text-[#075985]",
    clientClass: "text-[#0C4A6E]",
    serviceClass: "text-[#075985]",
  },
  {
    borderClass: "border-[#16A34A]",
    bgClass: "bg-[#BBF7D0]",
    headerClass: "bg-[#16A34A]",
    ringClass: "ring-1 ring-[#4ADE80]",
    hoverClass: "hover:ring-2 hover:ring-[#86EFAC] hover:shadow-md",
    timeClass: "text-[#166534]",
    clientClass: "text-[#14532D]",
    serviceClass: "text-[#166534]",
  },
  {
    borderClass: "border-[#F97316]",
    bgClass: "bg-[#FED7AA]",
    headerClass: "bg-[#F97316]",
    ringClass: "ring-1 ring-[#FB923C]",
    hoverClass: "hover:ring-2 hover:ring-[#FDBA74] hover:shadow-md",
    timeClass: "text-[#C2410C]",
    clientClass: "text-[#9A3412]",
    serviceClass: "text-[#C2410C]",
  },
  {
    borderClass: "border-[#7C3AED]",
    bgClass: "bg-[#DDD6FE]",
    headerClass: "bg-[#7C3AED]",
    ringClass: "ring-1 ring-[#A78BFA]",
    hoverClass: "hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-md",
    timeClass: "text-[#6D28D9]",
    clientClass: "text-[#4C1D95]",
    serviceClass: "text-[#5B21B6]",
  },
  {
    borderClass: "border-[#E11D48]",
    bgClass: "bg-[#FFE4E6]",
    headerClass: "bg-[#E11D48]",
    ringClass: "ring-1 ring-[#FB7185]",
    hoverClass: "hover:ring-2 hover:ring-[#FECDD3] hover:shadow-md",
    timeClass: "text-[#BE123C]",
    clientClass: "text-[#9F1239]",
    serviceClass: "text-[#BE123C]",
  },
  {
    borderClass: "border-[#0D9488]",
    bgClass: "bg-[#99F6E4]",
    headerClass: "bg-[#0D9488]",
    ringClass: "ring-1 ring-[#2DD4BF]",
    hoverClass: "hover:ring-2 hover:ring-[#5EEAD4] hover:shadow-md",
    timeClass: "text-[#0F766E]",
    clientClass: "text-[#134E4A]",
    serviceClass: "text-[#0F766E]",
  },
  {
    borderClass: "border-[#CA8A04]",
    bgClass: "bg-[#FEF08A]",
    headerClass: "bg-[#CA8A04]",
    ringClass: "ring-1 ring-[#FACC15]",
    hoverClass: "hover:ring-2 hover:ring-[#FDE047] hover:shadow-md",
    timeClass: "text-[#A16207]",
    clientClass: "text-[#713F12]",
    serviceClass: "text-[#854D0E]",
  },
  {
    borderClass: "border-[#C026D3]",
    bgClass: "bg-[#F5D0FE]",
    headerClass: "bg-[#C026D3]",
    ringClass: "ring-1 ring-[#E879F9]",
    hoverClass: "hover:ring-2 hover:ring-[#F0ABFC] hover:shadow-md",
    timeClass: "text-[#A21CAF]",
    clientClass: "text-[#86198F]",
    serviceClass: "text-[#A21CAF]",
  },
  {
    borderClass: "border-[#4F46E5]",
    bgClass: "bg-[#C7D2FE]",
    headerClass: "bg-[#4F46E5]",
    ringClass: "ring-1 ring-[#818CF8]",
    hoverClass: "hover:ring-2 hover:ring-[#A5B4FC] hover:shadow-md",
    timeClass: "text-[#4338CA]",
    clientClass: "text-[#312E81]",
    serviceClass: "text-[#3730A3]",
  },
  {
    borderClass: "border-[#65A30D]",
    bgClass: "bg-[#D9F99D]",
    headerClass: "bg-[#65A30D]",
    ringClass: "ring-1 ring-[#A3E635]",
    hoverClass: "hover:ring-2 hover:ring-[#BEF264] hover:shadow-md",
    timeClass: "text-[#4D7C0F]",
    clientClass: "text-[#365314]",
    serviceClass: "text-[#4D7C0F]",
  },
  {
    borderClass: "border-[#DC2626]",
    bgClass: "bg-[#FECACA]",
    headerClass: "bg-[#DC2626]",
    ringClass: "ring-1 ring-[#F87171]",
    hoverClass: "hover:ring-2 hover:ring-[#FCA5A5] hover:shadow-md",
    timeClass: "text-[#B91C1C]",
    clientClass: "text-[#7F1D1D]",
    serviceClass: "text-[#991B1B]",
  },
  {
    borderClass: "border-[#0891B2]",
    bgClass: "bg-[#A5F3FC]",
    headerClass: "bg-[#0891B2]",
    ringClass: "ring-1 ring-[#22D3EE]",
    hoverClass: "hover:ring-2 hover:ring-[#67E8F9] hover:shadow-md",
    timeClass: "text-[#0E7490]",
    clientClass: "text-[#164E63]",
    serviceClass: "text-[#155E75]",
  },
  {
    borderClass: "border-[#DB2777]",
    bgClass: "bg-[#FBCFE8]",
    headerClass: "bg-[#DB2777]",
    ringClass: "ring-1 ring-[#F472B6]",
    hoverClass: "hover:ring-2 hover:ring-[#F9A8D4] hover:shadow-md",
    timeClass: "text-[#BE185D]",
    clientClass: "text-[#831843]",
    serviceClass: "text-[#9D174D]",
  },
  {
    borderClass: "border-[#059669]",
    bgClass: "bg-[#A7F3D0]",
    headerClass: "bg-[#059669]",
    ringClass: "ring-1 ring-[#34D399]",
    hoverClass: "hover:ring-2 hover:ring-[#6EE7B7] hover:shadow-md",
    timeClass: "text-[#047857]",
    clientClass: "text-[#064E3B]",
    serviceClass: "text-[#065F46]",
  },
  {
    borderClass: "border-[#D97706]",
    bgClass: "bg-[#FDE68A]",
    headerClass: "bg-[#D97706]",
    ringClass: "ring-1 ring-[#FBBF24]",
    hoverClass: "hover:ring-2 hover:ring-[#FCD34D] hover:shadow-md",
    timeClass: "text-[#B45309]",
    clientClass: "text-[#78350F]",
    serviceClass: "text-[#92400E]",
  },
  {
    borderClass: "border-[#9333EA]",
    bgClass: "bg-[#E9D5FF]",
    headerClass: "bg-[#9333EA]",
    ringClass: "ring-1 ring-[#C084FC]",
    hoverClass: "hover:ring-2 hover:ring-[#D8B4FE] hover:shadow-md",
    timeClass: "text-[#7E22CE]",
    clientClass: "text-[#581C87]",
    serviceClass: "text-[#6B21A8]",
  },
];

export const DAY_CANCELED_CARD_THEME: DayProfCardTheme = {
  borderClass: "border-[#F87171]",
  bgClass: "bg-[#FEE2E2]",
  headerClass: "bg-[#DC2626]",
  ringClass: "ring-1 ring-[#FCA5A5]",
  hoverClass: "hover:ring-2 hover:ring-[#FECACA] hover:shadow-md",
  timeClass: "text-[#B91C1C]",
  clientClass: "text-[#991B1B]",
  serviceClass: "text-[#B91C1C]",
};

// Stable professional color selection.

const getProfThemeIndex = (profId: string): number => {
  let hash = 0;
  for (let i = 0; i < profId.length; i += 1) {
    hash = (hash * 31 + profId.charCodeAt(i)) >>> 0;
  }
  return hash % DAY_PROF_CARD_THEMES.length;
};

export const getProfCardTheme = (profId?: string | null): DayProfCardTheme => {
  if (!profId) return DAY_PROF_CARD_THEMES[0];
  return DAY_PROF_CARD_THEMES[getProfThemeIndex(profId)];
};

export const getProfessionalCardTheme = getProfCardTheme;

export const getProfCardThemeByIndex = (index: number): DayProfCardTheme => {
  const normalizedIndex =
    ((index % DAY_PROF_CARD_THEMES.length) + DAY_PROF_CARD_THEMES.length) %
    DAY_PROF_CARD_THEMES.length;
  return DAY_PROF_CARD_THEMES[normalizedIndex];
};

export const getProfessionalCardThemeByIndex = getProfCardThemeByIndex;

export const getProfCardThemeForVisibleList = (
  profId?: string | null,
  professionals?: Pick<Professional, "id">[],
): DayProfCardTheme => {
  if (!profId) return DAY_PROF_CARD_THEMES[0];
  const visibleIndex =
    professionals?.findIndex((prof) => prof.id === profId) ?? -1;
  return visibleIndex >= 0
    ? getProfCardThemeByIndex(visibleIndex)
    : getProfCardTheme(profId);
};

export const getProfessionalCardThemeForVisibleList = getProfCardThemeForVisibleList;

const APPOINTMENT_BLUE_CARD_THEME: DayProfCardTheme = {
  borderClass: "border-[#2563EB]",
  bgClass: "bg-[#DBEAFE]",
  headerClass: "bg-[#2563EB]",
  ringClass: "ring-1 ring-[#60A5FA]",
  hoverClass: "hover:ring-2 hover:ring-[#BFDBFE] hover:shadow-md",
  timeClass: "text-[#1D4ED8]",
  clientClass: "text-[#1E3A8A]",
  serviceClass: "text-[#1D4ED8]",
};

const APPOINTMENT_GRAPHITE_CARD_THEME: DayProfCardTheme = {
  borderClass: "border-[#475569]",
  bgClass: "bg-[#E2E8F0]",
  headerClass: "bg-[#475569]",
  ringClass: "ring-1 ring-[#94A3B8]",
  hoverClass: "hover:ring-2 hover:ring-[#CBD5E1] hover:shadow-md",
  timeClass: "text-[#334155]",
  clientClass: "text-[#0F172A]",
  serviceClass: "text-[#334155]",
};

const APPOINTMENT_BLACK_CARD_THEME: DayProfCardTheme = {
  borderClass: "border-[#0F172A]",
  bgClass: "bg-[#E2E8F0]",
  headerClass: "bg-[#0F172A]",
  ringClass: "ring-1 ring-[#64748B]",
  hoverClass: "hover:ring-2 hover:ring-[#CBD5E1] hover:shadow-md",
  timeClass: "text-[#334155]",
  clientClass: "text-[#020617]",
  serviceClass: "text-[#334155]",
};

const APPOINTMENT_COLOR_THEME_BY_VALUE: Record<string, DayProfCardTheme> = {
  "#2563EB": APPOINTMENT_BLUE_CARD_THEME,
  "#0891B2": DAY_PROF_CARD_THEMES[11],
  "#14B8A6": DAY_PROF_CARD_THEMES[5],
  "#22C55E": DAY_PROF_CARD_THEMES[1],
  "#84CC16": DAY_PROF_CARD_THEMES[9],
  "#EAB308": DAY_PROF_CARD_THEMES[6],
  "#F97316": DAY_PROF_CARD_THEMES[2],
  "#EF4444": DAY_PROF_CARD_THEMES[10],
  "#F43F5E": DAY_PROF_CARD_THEMES[4],
  "#EC4899": DAY_PROF_CARD_THEMES[12],
  "#D946EF": DAY_PROF_CARD_THEMES[7],
  "#A855F7": DAY_PROF_CARD_THEMES[15],
  "#6366F1": DAY_PROF_CARD_THEMES[8],
  "#A16207": DAY_PROF_CARD_THEMES[14],
  "#475569": APPOINTMENT_GRAPHITE_CARD_THEME,
  "#0F172A": APPOINTMENT_BLACK_CARD_THEME,
  "#0284C7": APPOINTMENT_BLUE_CARD_THEME,
  "#0F766E": DAY_PROF_CARD_THEMES[5],
  "#059669": DAY_PROF_CARD_THEMES[13],
  "#65A30D": DAY_PROF_CARD_THEMES[9],
  "#CA8A04": DAY_PROF_CARD_THEMES[6],
  "#EA580C": DAY_PROF_CARD_THEMES[2],
  "#DC2626": DAY_PROF_CARD_THEMES[10],
  "#DB2777": DAY_PROF_CARD_THEMES[12],
  "#7C3AED": DAY_PROF_CARD_THEMES[3],
  "#4F46E5": DAY_PROF_CARD_THEMES[8],
};

export const getAppointmentCardTheme = ({
  appointmentColor,
  appointmentColorIsCustom,
  mode,
  defaultColor,
}: {
  appointmentColor?: string | null;
  appointmentColorIsCustom?: boolean | null;
  mode: AppointmentColorMode;
  defaultColor: string;
}): DayProfCardTheme => {
  const color = resolveAppointmentColor({
    mode,
    defaultColor,
    appointmentColor,
    appointmentColorIsCustom,
  });
  return APPOINTMENT_COLOR_THEME_BY_VALUE[color] ?? DAY_PROF_CARD_THEMES[0];
};
