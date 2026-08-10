import { describe, expect, it } from "vitest";
import { zonedTimeToUtc } from "@zigoschedule/scheduler-core";
import type { Appointment, Professional } from "@zigoschedule/scheduler-engine";
import { buildAgendaMonthLayout } from "../build-month-layout";

const TIME_ZONE = "America/Sao_Paulo";
const AUGUST = new Date(2026, 7, 15);
const PROFESSIONALS: Professional[] = [{ id: "ana", nome: "Ana Ribeiro" }];

const at = (dayKey: string, time: string, id: string, client = "Maya"): Appointment => {
  const [h, m] = time.split(":").map(Number);
  return {
    id,
    data_hora: zonedTimeToUtc(dayKey, h * 60 + m, TIME_ZONE).toISOString(),
    duracao_minutos: 60,
    cliente_nome: client,
    status: "confirmado",
    profissional_id: "ana",
  } as Appointment;
};

const build = (extra: Partial<Parameters<typeof buildAgendaMonthLayout>[0]> = {}) =>
  buildAgendaMonthLayout({
    date: AUGUST,
    appointments: [],
    professionals: PROFESSIONALS,
    timeZone: TIME_ZONE,
    locale: "en-US",
    weekStartsOn: 1,
    width: 700,
    height: 600,
    ...extra,
  });

describe("the grid", () => {
  it("always has six weeks so the page never jumps between months", () => {
    expect(build().cells).toHaveLength(42);
    expect(buildAgendaMonthLayout({
      date: new Date(2026, 1, 10),
      appointments: [],
      width: 700,
      height: 600,
    }).cells).toHaveLength(42);
  });

  it("starts on Monday", () => {
    const layout = build();
    expect(layout.weekdayLabels[0]).toBe("Mon");
    expect(layout.weekdayLabels[6]).toBe("Sun");
  });

  it("localizes weekday and month labels", () => {
    const layout = build({ locale: "en-US" });
    expect(layout.weekdayLabels[0].toLowerCase()).toContain("mon");
    expect(layout.weekdayLabels[6].toLowerCase()).toContain("sun");
    expect(layout.monthLabel).toBe("August 2026");
  });

  it("marks the days borrowed from neighbouring months", () => {
    const layout = build();
    const outside = layout.cells.filter((cell) => !cell.isCurrentMonth);
    expect(outside.length).toBeGreaterThan(0);
    expect(layout.cells.filter((cell) => cell.isCurrentMonth)).toHaveLength(31);
  });

  it("lays cells out in seven columns", () => {
    const layout = build();
    expect(layout.columnWidth).toBe(100);
    expect(layout.cells[0].left).toBe(0);
    expect(layout.cells[6].left).toBe(600);
    expect(layout.cells[7].top).toBe(layout.rowHeight);
  });
});

describe("appointments in a day", () => {
  it("lists them sorted by time", () => {
    const layout = build({
      appointments: [
        at("2026-08-12", "14:00", "2", "Second"),
        at("2026-08-12", "09:00", "1", "First"),
      ],
    });
    const cell = layout.cells.find((c) => c.dayKey === "2026-08-12")!;
    expect(cell.entries.map((e) => e.title)).toEqual(["First", "Second"]);
    expect(cell.entries[0].timeLabel).toBe("9:00 AM");
  });

  it("collapses the overflow into a counter", () => {
    const layout = build({
      maxEntriesPerDay: 2,
      appointments: ["09:00", "10:00", "11:00", "12:00"].map((t, i) =>
        at("2026-08-12", t, String(i))
      ),
    });
    const cell = layout.cells.find((c) => c.dayKey === "2026-08-12")!;
    expect(cell.entries).toHaveLength(2);
    expect(cell.hiddenCount).toBe(2);
    expect(cell.totalCount).toBe(4);
  });

  it("carries the professional's colour and name", () => {
    const layout = build({
      appointments: [at("2026-08-12", "09:00", "1")],
      colorByProfessional: { ana: "#A855F7" },
    });
    const entry = layout.cells.find((c) => c.dayKey === "2026-08-12")!.entries[0];
    expect(entry.color).toBe("#A855F7");
    expect(entry.professionalName).toBe("Ana Ribeiro");
  });

  it("drops invalid CSS colours before renderers receive them", () => {
    const appointment = {
      ...at("2026-08-12", "09:00", "1"),
      cor_agendamento: "#059669",
    } as Appointment;
    const layout = build({
      appointments: [appointment],
      colorByProfessional: { ana: "url(javascript:alert(1))" },
      defaultColor: "not-a-color",
    });
    const entry = layout.cells.find((c) => c.dayKey === "2026-08-12")!.entries[0];

    expect(entry.color).toBe("#059669");
  });

  it("files an appointment by the day it falls on in the business zone", () => {
    // 00:30 in São Paulo is still the previous day in Manaus.
    const appointment = at("2026-08-12", "00:30", "1");
    const sp = build({ appointments: [appointment] });
    const manaus = build({ appointments: [appointment], timeZone: "America/Manaus" });

    expect(sp.cells.find((c) => c.dayKey === "2026-08-12")!.totalCount).toBe(1);
    expect(manaus.cells.find((c) => c.dayKey === "2026-08-11")!.totalCount).toBe(1);
  });
});

describe("portability", () => {
  it("survives a JSON round-trip", () => {
    const layout = build({ appointments: [at("2026-08-12", "09:00", "1")] });
    expect(JSON.parse(JSON.stringify(layout.cells))).toEqual(layout.cells);
  });
});
