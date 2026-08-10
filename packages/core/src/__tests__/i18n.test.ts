import { describe, expect, it } from "vitest";
import {
  AGENDA_SUPPORTED_LOCALES,
  formatAgendaAxisTime,
  formatAgendaAxisTimeParts,
  formatAgendaCurrency,
  formatAgendaDuration,
  getAgendaMessages,
  getRegisteredAgendaLocales,
  getAgendaStatusLabel,
  formatAgendaTime,
  formatAgendaTimeRange,
  normalizeAgendaLocale,
  registerAgendaLocaleMessages,
  type AgendaMessages,
  type AgendaSupportedLocale,
} from "../i18n";

const localeImports: Record<AgendaSupportedLocale, () => Promise<unknown>> = {
  "pt-BR": () => import("../locales/pt-BR"),
  "en-US": () => import("../locales/en-US"),
  "es-ES": () => import("../locales/es-ES"),
  "fr-FR": () => import("../locales/fr-FR"),
  "de-DE": () => import("../locales/de-DE"),
  "ru-RU": () => import("../locales/ru-RU"),
  "th-TH": () => import("../locales/th-TH"),
  "it-IT": () => import("../locales/it-IT"),
  "nl-NL": () => import("../locales/nl-NL"),
  "pl-PL": () => import("../locales/pl-PL"),
  "tr-TR": () => import("../locales/tr-TR"),
  "id-ID": () => import("../locales/id-ID"),
  "ja-JP": () => import("../locales/ja-JP"),
  "ko-KR": () => import("../locales/ko-KR"),
  "zh-CN": () => import("../locales/zh-CN"),
  "ar-SA": () => import("../locales/ar-SA"),
  "hi-IN": () => import("../locales/hi-IN"),
};

describe("agenda i18n", () => {
  it("keeps the root bundle on the default locale until a locale pack is provided", async () => {
    expect(getRegisteredAgendaLocales()).toEqual(["en-US"]);
    expect(getAgendaMessages("pt-BR").today).toBe("Today");

    const { ptBRMessages } = await localeImports["pt-BR"]() as { ptBRMessages: AgendaMessages };

    expect(getAgendaMessages("pt-BR", ptBRMessages).today).toBe("Hoje");
    registerAgendaLocaleMessages("pt-BR", ptBRMessages);
    expect(getRegisteredAgendaLocales()).toContain("pt-BR");
    expect(getAgendaMessages("pt-BR").today).toBe("Hoje");
  });

  it("normalizes supported regional variants by exact match or language", () => {
    expect(normalizeAgendaLocale("pt-BR")).toBe("pt-BR");
    expect(normalizeAgendaLocale("en-GB")).toBe("en-US");
    expect(normalizeAgendaLocale("fr-CA")).toBe("fr-FR");
    expect(normalizeAgendaLocale("xx-ZZ")).toBe("en-US");
  });

  it("ships a complete message table through per-locale packs", async () => {
    expect(AGENDA_SUPPORTED_LOCALES).toHaveLength(17);
    for (const locale of AGENDA_SUPPORTED_LOCALES) {
      const pack = await localeImports[locale]() as { default: AgendaMessages };
      const messages = getAgendaMessages(locale, pack.default);
      expect(messages.today).toBeTruthy();
      expect(messages.views.week).toBeTruthy();
      expect(messages.lunchBreak).toBeTruthy();
      expect(messages.outsideBusinessHours).toBeTruthy();
      expect(messages.free).toBeTruthy();
      expect(messages.closeActionMenu).toBeTruthy();
      expect(messages.createAppointment).toBeTruthy();
      expect(messages.createBlock).toBeTruthy();
      expect(messages.addDayOff).toBeTruthy();
      expect(messages.dayItems(2)).toBeTruthy();
      expect(messages.pastSlot).toBeTruthy();
      expect(messages.lunchSlot).toBeTruthy();
      expect(messages.occupiedSlot).toBeTruthy();
      expect(messages.details.charge).toBeTruthy();
      expect(messages.details.professional).toBeTruthy();
      expect(messages.details.phone).toBeTruthy();
      expect(messages.details.price).toBeTruthy();
      expect(messages.more(2, 5)).toBeTruthy();
    }
  });

  it("formats time with the requested locale", () => {
    expect(formatAgendaTime(9 * 60, "en-US")).toMatch(/9:00/);
    expect(formatAgendaTimeRange(9 * 60, 10 * 60, "en-US")).toMatch(/9:00/);
    expect(formatAgendaTime(9 * 60, "pt-BR")).toMatch(/9:00/);
  });

  it("formats compact axis time without breaking regional hour cycles", () => {
    expect(formatAgendaAxisTime(9 * 60, "en-US")).toBe("9:00");
    expect(formatAgendaAxisTime(13 * 60 + 30, "en-US")).toBe("1:30");
    expect(formatAgendaAxisTime(13 * 60 + 30, "en-GB")).toBe("13:30");
    expect(formatAgendaAxisTime(13 * 60 + 30, "en-AU")).toBe("1:30");
    expect(formatAgendaAxisTime(13 * 60 + 30, "es-MX")).toBe("1:30");
    expect(formatAgendaAxisTime(13 * 60 + 30, "pt-BR")).toBe("13:30");
    expect(formatAgendaAxisTime(13 * 60 + 30, "ru-RU")).toBe("13:30");
    expect(formatAgendaAxisTime(13 * 60 + 30, "zh-CN")).toBe("13:30");
    expect(formatAgendaAxisTime(13 * 60 + 30, "ko-KR")).toBe("1:30");
  });

  it("exposes a compact day period for locales that use 12-hour time", () => {
    expect(formatAgendaAxisTimeParts(13 * 60 + 30, "en-US")).toEqual({
      timeText: "1:30",
      periodText: "PM",
    });
    expect(formatAgendaAxisTimeParts(13 * 60 + 30, "pt-BR")).toEqual({
      timeText: "13:30",
      periodText: null,
    });
    expect(formatAgendaAxisTimeParts(13 * 60 + 30, "ko-KR")).toMatchObject({
      timeText: "1:30",
    });
    expect(formatAgendaAxisTimeParts(13 * 60 + 30, "ko-KR").periodText).toBeTruthy();
  });

  it("matches the native day-period behavior for every supported locale", () => {
    const date = new Date(2026, 0, 1, 13, 30);

    for (const locale of AGENDA_SUPPORTED_LOCALES) {
      const expectedPeriod = new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
      })
        .formatToParts(date)
        .find((part) => part.type === "dayPeriod")?.value.trim() || null;

      expect(formatAgendaAxisTimeParts(13 * 60 + 30, locale).periodText).toBe(expectedPeriod);
    }
  });

  it("uses the requested region for full time formatting even when messages fall back by language", () => {
    expect(formatAgendaTime(13 * 60 + 30, "en-GB")).toMatch(/13:30/);
    expect(formatAgendaTime(13 * 60 + 30, "en-US")).not.toMatch(/13:30/);
  });

  it("formats duration and currency with the requested locale", () => {
    expect(formatAgendaDuration(90, "en-US")).toMatch(/1/);
    expect(formatAgendaDuration(90, "en-US")).toMatch(/30/);
    expect(formatAgendaCurrency(90, "en-US")).toContain("$");
    expect(formatAgendaCurrency(90, "pt-BR")).toContain("R$");
    expect(formatAgendaCurrency(90, "de-DE")).toContain("€");
    expect(formatAgendaCurrency(90, "ja-JP")).toContain("￥");
    expect(formatAgendaCurrency(90, "pt-BR", "USD")).toContain("US$");
  });

  it("lets the host override only the words it owns", () => {
    const messages = getAgendaMessages("en-US", {
      today: "Now",
      details: { charge: "Collect" },
    });

    expect(messages.today).toBe("Now");
    expect(messages.details.charge).toBe("Collect");
    expect(messages.details.edit).toBe("Edit");
    expect(messages.views.week).toBe("Week");
  });

  it("localizes known status values and leaves custom values alone", async () => {
    const { deDEMessages } = await localeImports["de-DE"]() as { deDEMessages: AgendaMessages };
    const messages = getAgendaMessages("de-DE", deDEMessages);
    expect(getAgendaStatusLabel("confirmado", messages)).toBe("Bestätigt");
    expect(getAgendaStatusLabel("pending", messages)).toBe("Ausstehend");
    expect(getAgendaStatusLabel("no-show", messages)).toBe("no-show");
  });
});
