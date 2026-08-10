import { rrulestr } from "rrule";

export type RecurrenceDescriptionLocale = "en-US" | "pt-BR";

type WeekdayCopy = {
  en: string;
  pt: { name: string; article: "toda" | "todo"; preposition: "na" | "no" };
};

const WEEKDAYS: Record<string, WeekdayCopy> = {
  MO: { en: "Monday", pt: { name: "segunda", article: "toda", preposition: "na" } },
  TU: { en: "Tuesday", pt: { name: "terça", article: "toda", preposition: "na" } },
  WE: { en: "Wednesday", pt: { name: "quarta", article: "toda", preposition: "na" } },
  TH: { en: "Thursday", pt: { name: "quinta", article: "toda", preposition: "na" } },
  FR: { en: "Friday", pt: { name: "sexta", article: "toda", preposition: "na" } },
  SA: { en: "Saturday", pt: { name: "sábado", article: "todo", preposition: "no" } },
  SU: { en: "Sunday", pt: { name: "domingo", article: "todo", preposition: "no" } },
};

const ORDINALS_EN: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  [-1]: "last",
};

const ORDINALS_PT: Record<number, string> = {
  1: "primeira",
  2: "segunda",
  3: "terceira",
  4: "quarta",
  [-1]: "última",
};

const listEn = (parts: string[]): string => {
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
};

const listPt = (parts: string[]): string =>
  parts.length <= 1
    ? (parts[0] ?? "")
    : `${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;

const field = (rule: string, name: string): string | null => {
  const match = new RegExp(`(?:^|;)${name}=([^;]+)`, "i").exec(rule);
  return match ? match[1] : null;
};

const ruleDays = (rule: string): string[] =>
  (field(rule, "BYDAY") ?? "")
    .split(",")
    .map((day) => day.trim().toUpperCase())
    .filter(Boolean);

const splitOrdinal = (token: string): { ordinal: number | null; day: string } => {
  const match = /^([+-]?\d+)?([A-Z]{2})$/.exec(token);
  if (!match) return { ordinal: null, day: token };
  return { ordinal: match[1] ? Number(match[1]) : null, day: match[2] };
};

const ordinalSuffix = (value: string): string => {
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  const mod10 = number % 10;
  if (mod10 === 1) return `${number}st`;
  if (mod10 === 2) return `${number}nd`;
  if (mod10 === 3) return `${number}rd`;
  return `${number}th`;
};

const validateRule = (rule: string): string | null => {
  const normalized = rule.replace(/^RRULE:/i, "").trim();
  if (!normalized) return null;
  try {
    rrulestr(`RRULE:${normalized}`);
    return normalized;
  } catch {
    return null;
  }
};

const limitEn = (rule: string): string => {
  const count = field(rule, "COUNT");
  if (count) return `, ${count} ${Number(count) === 1 ? "time" : "times"}`;

  const until = field(rule, "UNTIL");
  if (!until) return "";
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(until);
  if (!match) return "";
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return `, until ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date)}`;
};

const limitPt = (rule: string): string => {
  const count = field(rule, "COUNT");
  if (count) return `, ${count} vez${Number(count) === 1 ? "" : "es"}`;

  const until = field(rule, "UNTIL");
  if (!until) return "";
  const match = /^(\d{4})(\d{2})(\d{2})/.exec(until);
  return match ? `, até ${match[3]}/${match[2]}/${match[1]}` : "";
};

const weeklyEn = (rule: string, interval: number): string | null => {
  const weekdays = ruleDays(rule)
    .map((token) => WEEKDAYS[splitOrdinal(token).day]?.en)
    .filter((day): day is string => Boolean(day));

  if (weekdays.length === 0) {
    if (interval === 1) return "every week";
    if (interval === 2) return "every other week";
    return `every ${interval} weeks`;
  }

  if (interval === 1) return `every ${listEn(weekdays)}`;
  const cadence = interval === 2 ? "every other week" : `every ${interval} weeks`;
  return `${cadence} on ${listEn(weekdays)}`;
};

const weeklyPt = (rule: string, interval: number): string | null => {
  const weekdays = ruleDays(rule)
    .map((token) => WEEKDAYS[splitOrdinal(token).day]?.pt)
    .filter((day): day is WeekdayCopy["pt"] => Boolean(day));

  if (weekdays.length === 0) {
    if (interval === 1) return "toda semana";
    if (interval === 2) return "quinzenal";
    return `a cada ${interval} semanas`;
  }

  const names = listPt(weekdays.map((day) => day.name));
  if (interval === 1) return `${weekdays[0].article} ${names}`;
  const cadence = interval === 2 ? "quinzenal" : `a cada ${interval} semanas`;
  return `${cadence}, ${weekdays[0].preposition} ${names}`;
};

const monthlyEn = (rule: string, interval: number): string | null => {
  const cadence = interval === 1 ? "every month" : `every ${interval} months`;

  const monthDays = field(rule, "BYMONTHDAY");
  if (monthDays) {
    const days = listEn(monthDays.split(",").map((day) => ordinalSuffix(day.trim())));
    return interval === 1 ? `on the ${days} of every month` : `${cadence} on the ${days}`;
  }

  const parts = ruleDays(rule).map((token) => {
    const { ordinal, day } = splitOrdinal(token);
    const weekday = WEEKDAYS[day]?.en;
    if (!weekday) return null;
    const ordinalText = ordinal !== null ? ORDINALS_EN[ordinal] : null;
    return ordinalText ? `${ordinalText} ${weekday}` : weekday;
  });

  if (parts.length === 0) return cadence;
  if (parts.some((part) => part === null)) return null;

  const days = listEn(parts as string[]);
  return interval === 1 ? `on the ${days} of every month` : `${cadence} on the ${days}`;
};

const monthlyPt = (rule: string, interval: number): string | null => {
  const cadence = interval === 1 ? "todo mês" : `a cada ${interval} meses`;

  const monthDays = field(rule, "BYMONTHDAY");
  if (monthDays) {
    const days = monthDays.split(",").map((day) => day.trim());
    return interval === 1 ? `todo dia ${listPt(days)}` : `${cadence}, no dia ${listPt(days)}`;
  }

  const parts = ruleDays(rule).map((token) => {
    const { ordinal, day } = splitOrdinal(token);
    const name = WEEKDAYS[day]?.pt.name;
    if (!name) return null;
    const ordinalText = ordinal !== null ? ORDINALS_PT[ordinal] : null;
    return ordinalText ? `${ordinalText} ${name}` : name;
  });

  if (parts.length === 0) return cadence;
  if (parts.some((part) => part === null)) return null;

  return interval === 1 ? `na ${listPt(parts as string[])} do mês` : `${cadence}, na ${listPt(parts as string[])}`;
};

const dailyEn = (interval: number): string =>
  interval === 1 ? "every day" : `every ${interval} days`;

const dailyPt = (interval: number): string =>
  interval === 1 ? "todo dia" : `a cada ${interval} dias`;

const yearlyEn = (interval: number): string =>
  interval === 1 ? "every year" : `every ${interval} years`;

const yearlyPt = (interval: number): string =>
  interval === 1 ? "todo ano" : `a cada ${interval} anos`;

export function describeInEnglish(rule: string): string {
  const normalized = validateRule(rule);
  if (!normalized) return "";

  const frequency = (field(normalized, "FREQ") ?? "").toUpperCase();
  const interval = Math.max(1, Number(field(normalized, "INTERVAL") ?? 1) || 1);

  let base: string | null = null;
  if (frequency === "DAILY") base = dailyEn(interval);
  else if (frequency === "WEEKLY") base = weeklyEn(normalized, interval);
  else if (frequency === "MONTHLY") base = monthlyEn(normalized, interval);
  else if (frequency === "YEARLY") base = yearlyEn(interval);

  if (!base) {
    try {
      return rrulestr(`RRULE:${normalized}`).toText();
    } catch {
      return "";
    }
  }

  return base + limitEn(normalized);
}

export function describeInPortuguese(rule: string): string {
  const normalized = validateRule(rule);
  if (!normalized) return "";

  const frequency = (field(normalized, "FREQ") ?? "").toUpperCase();
  const interval = Math.max(1, Number(field(normalized, "INTERVAL") ?? 1) || 1);

  let base: string | null = null;
  if (frequency === "DAILY") base = dailyPt(interval);
  else if (frequency === "WEEKLY") base = weeklyPt(normalized, interval);
  else if (frequency === "MONTHLY") base = monthlyPt(normalized, interval);
  else if (frequency === "YEARLY") base = yearlyPt(interval);

  if (!base) return describeInEnglish(normalized);
  return base + limitPt(normalized);
}

/**
 * Describes an RRULE without forcing a host to render raw recurrence syntax.
 *
 * English is the package default. Pass `"pt-BR"` for the native Portuguese
 * phrasing kept from the original Zigo product.
 */
export function describeRecurrence(
  rule: string,
  locale: RecurrenceDescriptionLocale = "en-US",
): string {
  return locale === "pt-BR" ? describeInPortuguese(rule) : describeInEnglish(rule);
}
