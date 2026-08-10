import { enUSMessages } from "./locales/en-US";

export type AgendaSupportedLocale =
  | "pt-BR"
  | "en-US"
  | "es-ES"
  | "fr-FR"
  | "de-DE"
  | "ru-RU"
  | "th-TH"
  | "it-IT"
  | "nl-NL"
  | "pl-PL"
  | "tr-TR"
  | "id-ID"
  | "ja-JP"
  | "ko-KR"
  | "zh-CN"
  | "ar-SA"
  | "hi-IN";

export type AgendaMessages = {
  today: string;
  previousPeriod: string;
  nextPeriod: string;
  viewsLabel: string;
  views: {
    day: string;
    week: string;
    month: string;
    list: string;
  };
  loading: string;
  reload: string;
  updating: string;
  lunchBreak: string;
  outsideBusinessHours: string;
  outsideBusinessHoursShort: string;
  closed: string;
  closedDay: string;
  invalidDuration: string;
  resourceUnavailable: string;
  appointmentLocked: string;
  appointmentNotFound: string;
  free: string;
  closeActionMenu: string;
  createAppointment: string;
  createBlock: string;
  addDayOff: string;
  dayItems: (count: number) => string;
  resizeWithinAppointmentColumn: string;
  pastSlot: string;
  lunchSlot: string;
  occupiedSlot: string;
  dayAgenda: string;
  more: (hiddenCount: number, totalCount: number) => string;
  viewMoreAppointments: (count: number) => string;
  openDayWithMoreItems: (dayKey: string, count: number) => string;
  openAppointment: (clientName: string) => string;
  openAppointmentDetails: (input: {
    clientName: string;
    start: string;
    end: string;
    service: string;
    professionalName?: string;
    canceled?: boolean;
  }) => string;
  openBlock: (start: string, end: string) => string;
  openDay: (dayKey: string) => string;
  close: string;
  closeDayList: string;
  appointment: string;
  appointments: string;
  block: string;
  blocks: string;
  agenda: string;
  weekPrefix: string;
  noItems: string;
  visibleItems: (total: number, visible: number) => string;
  remainingItems: (count: number) => string;
  loadMore: string;
  listStats: (appointments: number, blocks: number, total: string) => string;
  filters: {
    myAgenda: string;
    professionals: string;
    allProfessionals: string;
    oneProfessional: string;
    manyProfessionals: (count: number) => string;
    allStatuses: string;
    activeBookings: string;
    oneStatus: string;
    manyStatuses: (count: number) => string;
    allStatusMenu: string;
  };
  status: {
    pending: string;
    confirmed: string;
    done: string;
    canceled: string;
    paid: string;
    overdue: string;
  };
  details: {
    whatsapp: string;
    reminder: string;
    edit: string;
    cancel: string;
    charge: string;
    noPhone: string;
    professional: string;
    phone: string;
    price: string;
    service: string;
    notes: string;
    noNotes: string;
    status: string;
    total: string;
    received: string;
    amountDue: string;
    referencePrefix: string;
  };
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: infer Args) => infer Return
    ? (...args: Args) => Return
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

export type AgendaMessagesInput = DeepPartial<AgendaMessages>;

export const DEFAULT_AGENDA_LOCALE: AgendaSupportedLocale = "en-US";

const AGENDA_SUPPORTED_LOCALE_VALUES = [
  "pt-BR",
  "en-US",
  "es-ES",
  "fr-FR",
  "de-DE",
  "ru-RU",
  "th-TH",
  "it-IT",
  "nl-NL",
  "pl-PL",
  "tr-TR",
  "id-ID",
  "ja-JP",
  "ko-KR",
  "zh-CN",
  "ar-SA",
  "hi-IN",
] as const;

export const AGENDA_SUPPORTED_LOCALES: AgendaSupportedLocale[] = [...AGENDA_SUPPORTED_LOCALE_VALUES];

const REGISTERED_AGENDA_MESSAGES: Partial<Record<AgendaSupportedLocale, AgendaMessages>> = {
  "en-US": enUSMessages,
};

export const AGENDA_MESSAGES: Readonly<Partial<Record<AgendaSupportedLocale, AgendaMessages>>> = REGISTERED_AGENDA_MESSAGES;

export function registerAgendaLocaleMessages(locale: AgendaSupportedLocale, messages: AgendaMessages): void {
  REGISTERED_AGENDA_MESSAGES[locale] = messages;
}

export function getRegisteredAgendaLocales(): AgendaSupportedLocale[] {
  return AGENDA_SUPPORTED_LOCALES.filter((locale) => Boolean(REGISTERED_AGENDA_MESSAGES[locale]));
}

export function normalizeAgendaLocale(locale?: string): AgendaSupportedLocale {
  if (!locale) return DEFAULT_AGENDA_LOCALE;
  if (AGENDA_SUPPORTED_LOCALES.includes(locale as AgendaSupportedLocale)) return locale as AgendaSupportedLocale;
  const language = locale.split("-")[0];
  return (
    AGENDA_SUPPORTED_LOCALES.find((supported) => supported.startsWith(`${language}-`)) ??
    DEFAULT_AGENDA_LOCALE
  );
}

const resolveAgendaIntlLocale = (locale?: string): string => {
  const fallback = normalizeAgendaLocale(locale);
  if (!locale) return fallback;

  try {
    return Intl.DateTimeFormat.supportedLocalesOf([locale])[0] ?? fallback;
  } catch {
    return fallback;
  }
};

const mergeMessages = (
  base: AgendaMessages,
  custom?: AgendaMessagesInput,
): AgendaMessages => ({
  ...base,
  ...custom,
  views: { ...base.views, ...custom?.views },
  filters: { ...base.filters, ...custom?.filters },
  status: { ...base.status, ...custom?.status },
  details: { ...base.details, ...custom?.details },
});

export function getAgendaMessages(
  locale?: string,
  custom?: AgendaMessagesInput,
): AgendaMessages {
  const normalized = normalizeAgendaLocale(locale);
  return mergeMessages(REGISTERED_AGENDA_MESSAGES[normalized] ?? enUSMessages, custom);
}

export function getAgendaStatusLabel(status: string, messages: AgendaMessages): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "pendente" || normalized === "pending") return messages.status.pending;
  if (normalized === "confirmado" || normalized === "confirmed") return messages.status.confirmed;
  if (normalized === "concluido" || normalized === "completed" || normalized === "done")
    return messages.status.done;
  if (normalized === "cancelado" || normalized === "canceled" || normalized === "cancelled")
    return messages.status.canceled;
  return status;
}

export function formatAgendaTime(minute: number, locale?: string): string {
  const date = new Date(2026, 0, 1, 0, minute);
  return new Intl.DateTimeFormat(resolveAgendaIntlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export type AgendaAxisTimeParts = {
  timeText: string;
  periodText: string | null;
};

export function formatAgendaAxisTimeParts(minute: number, locale?: string): AgendaAxisTimeParts {
  const intlLocale = resolveAgendaIntlLocale(locale);
  const date = new Date(2026, 0, 1, 0, minute);
  const formatter = new Intl.DateTimeFormat(intlLocale, {
    hour: "numeric",
    minute: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const hourText = parts.find((part) => part.type === "hour")?.value;
  const minuteText = parts.find((part) => part.type === "minute")?.value;
  const periodText = parts.find((part) => part.type === "dayPeriod")?.value.trim() || null;

  if (hourText && minuteText) {
    return {
      timeText: `${hourText}:${minuteText}`,
      periodText,
    };
  }

  return {
    timeText: formatter.format(date).replace(periodText ?? "", "").trim(),
    periodText,
  };
}

export function formatAgendaAxisTime(minute: number, locale?: string): string {
  return formatAgendaAxisTimeParts(minute, locale).timeText;
}

export function formatAgendaTimeRange(startMinute: number, endMinute: number, locale?: string): string {
  return `${formatAgendaTime(startMinute, locale)} - ${formatAgendaTime(endMinute, locale)}`;
}

const formatAgendaUnit = (
  value: number,
  unit: "hour" | "minute",
  locale?: string,
): string => {
  try {
    return new Intl.NumberFormat(resolveAgendaIntlLocale(locale), {
      style: "unit",
      unit,
      unitDisplay: "short",
    }).format(value);
  } catch {
    return unit === "hour" ? `${value}h` : `${value} min`;
  }
};

export function formatAgendaDuration(minutes: number, locale?: string): string {
  const safeMinutes = Math.max(0, Math.trunc(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours > 0 && remainingMinutes > 0) {
    return `${formatAgendaUnit(hours, "hour", locale)} ${formatAgendaUnit(remainingMinutes, "minute", locale)}`;
  }
  if (hours > 0) return formatAgendaUnit(hours, "hour", locale);
  return formatAgendaUnit(remainingMinutes, "minute", locale);
}

const AGENDA_DEFAULT_CURRENCY_BY_LOCALE: Record<AgendaSupportedLocale, string> = {
  "pt-BR": "BRL",
  "en-US": "USD",
  "es-ES": "EUR",
  "fr-FR": "EUR",
  "de-DE": "EUR",
  "ru-RU": "RUB",
  "th-TH": "THB",
  "it-IT": "EUR",
  "nl-NL": "EUR",
  "pl-PL": "PLN",
  "tr-TR": "TRY",
  "id-ID": "IDR",
  "ja-JP": "JPY",
  "ko-KR": "KRW",
  "zh-CN": "CNY",
  "ar-SA": "SAR",
  "hi-IN": "INR",
};

export function formatAgendaCurrency(
  value: number,
  locale?: string,
  currency = AGENDA_DEFAULT_CURRENCY_BY_LOCALE[normalizeAgendaLocale(locale)],
): string {
  return new Intl.NumberFormat(resolveAgendaIntlLocale(locale), {
    style: "currency",
    currency,
  }).format(value);
}
