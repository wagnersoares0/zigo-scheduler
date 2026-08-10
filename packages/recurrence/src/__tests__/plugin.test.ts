import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { zonedTimeToUtc } from "@zigoschedule/scheduler-core";
import type { Appointment, BusinessHours, Professional } from "@zigoschedule/scheduler-engine";
import {
  buildAgendaLayout,
  buildAgendaMonthLayout,
  clearRecurrenceExpander,
  hasRecurrenceExpander,
} from "@zigoschedule/scheduler-layout";
import { installRecurrence } from "../install";

/**
 * The plugin contract, from both sides.
 *
 * Installed, a repeating appointment fans out across the grid. Not installed,
 * the calendar still works and the appointment shows once, on its own date —
 * degraded, never broken. That fallback is the whole reason this is a plugin
 * and not a dependency.
 */

const SP = "America/Sao_Paulo";
const MONDAY = new Date(2026, 7, 10); // 2026-08-10

const PROFESSIONALS: Professional[] = [{ id: "ana", nome: "Ana" }];
const OPEN = { ativo: true, abertura: "09:00", fechamento: "17:00" };
const BUSINESS_HOURS: BusinessHours = {
  domingo: { ...OPEN, ativo: false },
  segunda: OPEN,
  terca: OPEN,
  quarta: OPEN,
  quinta: OPEN,
  sexta: OPEN,
  sabado: OPEN,
};

/** Every Thursday at 15:00, starting on the 13th. */
const weekly = {
  id: "recurring",
  data_hora: zonedTimeToUtc("2026-08-13", 15 * 60, SP).toISOString(),
  duracao_minutos: 60,
  cliente_nome: "Maya Lee",
  status: "confirmado",
  profissional_id: "ana",
  recorrencia: "FREQ=WEEKLY;BYDAY=TH",
} as unknown as Appointment;

const oneOff = {
  id: "one-off",
  data_hora: zonedTimeToUtc("2026-08-11", 10 * 60, SP).toISOString(),
  duracao_minutos: 30,
  cliente_nome: "Noah Carter",
  status: "confirmado",
  profissional_id: "ana",
} as unknown as Appointment;

const week = (appointments: Appointment[]) =>
  buildAgendaLayout({
    date: MONDAY,
    view: "week",
    appointments,
    professionals: PROFESSIONALS,
    businessHours: BUSINESS_HOURS,
    timeZone: SP,
    locale: "pt-BR",
    weekStartsOn: 1,
    width: 1400,
    height: 600,
  });

beforeEach(() => clearRecurrenceExpander());
afterEach(() => clearRecurrenceExpander());

describe("without the plugin", () => {
  it("does not register any expander", () => {
    expect(hasRecurrenceExpander()).toBe(false);
  });

  it("shows the appointment once on its own date", () => {
    // Degraded, not broken: disappearing would be worse than showing once.
    const model = week([weekly]);
    expect(model.events).toHaveLength(1);
    expect(model.events[0].dayKey).toBe("2026-08-13");
  });

  it("does not affect a regular appointment", () => {
    expect(week([oneOff]).events).toHaveLength(1);
  });
});

describe("with the plugin", () => {
  beforeEach(() => installRecurrence());

  it("registers the expander", () => {
    expect(hasRecurrenceExpander()).toBe(true);
  });

  it("shows the occurrence for the visible week", () => {
    const model = week([weekly]);
    expect(model.events.map((e) => e.dayKey)).toEqual(["2026-08-13"]);
  });

  it("appears again in the following week", () => {
    const nextWeek = buildAgendaLayout({
      date: new Date(2026, 7, 17),
      view: "week",
      appointments: [weekly],
      professionals: PROFESSIONALS,
      businessHours: BUSINESS_HOURS,
      timeZone: SP,
      locale: "pt-BR",
      weekStartsOn: 1,
      width: 1400,
      height: 600,
    });
    expect(nextWeek.events.map((e) => e.dayKey)).toEqual(["2026-08-20"]);
  });

  it("fills the full month grid, including overflow days", () => {
    // The grid has 42 days and August 2026 ends mid-row: 2026-09-03 is visible,
    // so its occurrence must be there too.
    const month = buildAgendaMonthLayout({
      date: MONDAY,
      appointments: [weekly],
      professionals: PROFESSIONALS,
      timeZone: SP,
      locale: "pt-BR",
      weekStartsOn: 1,
      width: 700,
      height: 600,
    });
    const days = month.cells.filter((c) => c.totalCount > 0).map((c) => c.dayKey);
    expect(days).toEqual(["2026-08-13", "2026-08-20", "2026-08-27", "2026-09-03"]);
  });

  it("gives each occurrence its own id, including the first one", () => {
    // Without this, dragging one would move them all because they would share an id.
    //
    // The first one gets the suffix on purpose: if it kept the clean id, a
    // backend receiving "recurring" could not tell whether that is the first
    // repetition of a series or a regular appointment. The rule has no
    // exception: every id with `@date` is an occurrence.
    const month = buildAgendaMonthLayout({
      date: MONDAY,
      appointments: [weekly],
      professionals: PROFESSIONALS,
      timeZone: SP,
      locale: "pt-BR",
      weekStartsOn: 1,
      width: 700,
      height: 600,
    });
    const ids = month.cells.flatMap((c) => c.entries.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "recurring@2026-08-13",
      "recurring@2026-08-20",
      "recurring@2026-08-27",
      "recurring@2026-09-03",
    ]);
  });

  it("respects exceptions", () => {
    const withException = { ...weekly, recorrencia_excecoes: ["2026-08-20"] } as unknown as Appointment;
    const month = buildAgendaMonthLayout({
      date: MONDAY,
      appointments: [withException],
      professionals: PROFESSIONALS,
      timeZone: SP,
      locale: "pt-BR",
      weekStartsOn: 1,
      width: 700,
      height: 600,
    });
    expect(month.cells.filter((c) => c.totalCount > 0).map((c) => c.dayKey)).toEqual([
      "2026-08-13",
      "2026-08-27",
      "2026-09-03",
    ]);
  });

  it("mixes recurring and one-off appointments", () => {
    const model = week([weekly, oneOff]);
    expect(model.events.map((e) => e.dayKey).sort()).toEqual(["2026-08-11", "2026-08-13"]);
  });

  it("keeps the rest of the appointment intact", () => {
    const model = week([weekly]);
    expect(model.events[0]).toMatchObject({
      title: "Maya Lee",
      professionalName: "Ana",
      timeLabel: "15:00 - 16:00",
    });
  });
});
