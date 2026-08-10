// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Agenda } from "../Agenda";
import { zonedTimeToUtc } from "@zigoschedule/scheduler-core";
import type { Appointment, BusinessHours, Professional } from "@zigoschedule/scheduler-engine";

/**
 * Density is the pair of knobs a host actually turns: how fine the grid is, and
 * how tall a row is. Both end up as pixel heights on the column, so the height
 * of the rendered grid is the honest thing to assert on.
 *
 * The day here runs 09:00–17:00 = 480 minutes.
 */

const TIME_ZONE = "America/Sao_Paulo";
const MONDAY = new Date(2026, 7, 10);
const DAY_MINUTES = 480;
const visualGridHeight = (stepMinutes: number, rowHeight: number) =>
  (Math.ceil(DAY_MINUTES / stepMinutes) + 1) * rowHeight;

const PROFESSIONALS: Professional[] = [
  { id: "ana", nome: "Ana" },
  { id: "carlos", nome: "Carlos" },
];

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

const APPOINTMENTS: Appointment[] = [
  {
    id: "1",
    data_hora: zonedTimeToUtc("2026-08-10", 10 * 60, TIME_ZONE).toISOString(),
    duracao_minutos: 60,
    cliente_nome: "Maya Lee",
    status: "confirmado",
    profissional_id: "ana",
  },
] as Appointment[];

/** Tallest pixel height in the rendered grid — the column that holds the day. */
const gridHeight = (props: Partial<Parameters<typeof Agenda>[0]>): number => {
  const html = renderToStaticMarkup(
    <Agenda
      date={MONDAY}
      appointments={APPOINTMENTS}
      professionals={PROFESSIONALS}
      businessHours={BUSINESS_HOURS}
      timeZone={TIME_ZONE}
      {...props}
    />
  );
  const heights = [...html.matchAll(/height:(\d+)px/g)].map((m) => Number(m[1]));
  return heights.length ? Math.max(...heights) : 0;
};

describe("row height", () => {
  it("multiplies the grid height in the day view", () => {
    expect(gridHeight({ view: "day", slotMinutes: 15, rowHeight: 32 })).toBe(visualGridHeight(15, 32));
    expect(gridHeight({ view: "day", slotMinutes: 15, rowHeight: 64 })).toBe(visualGridHeight(15, 64));
  });

  it("multiplies the grid height in the week view too", () => {
    // The week was the one reported as ignoring density.
    expect(gridHeight({ view: "week", weekScaleMinutes: 30, rowHeight: 32 })).toBe(visualGridHeight(30, 32));
    expect(gridHeight({ view: "week", weekScaleMinutes: 30, rowHeight: 64 })).toBe(visualGridHeight(30, 64));
  });
});

describe("day granularity", () => {
  it("changes the number of rows in the day view", () => {
    for (const minutes of [5, 10, 15, 20, 30]) {
      expect(gridHeight({ view: "day", slotMinutes: minutes, rowHeight: 40 })).toBe(visualGridHeight(minutes, 40));
    }
  });

  it("falls back to 30 when given a value the engine does not accept", () => {
    // 45 is not in VALID_AGENDA_GRANULARITIES; silently drawing a broken grid
    // would be worse than snapping to the default.
    expect(gridHeight({ view: "day", slotMinutes: 45, rowHeight: 40 })).toBe(visualGridHeight(30, 40));
  });

  it("does not leak into the week view", () => {
    // This is the bug the day granularity used to cause: five-minute rows across
    // seven columns is 96 lines of noise, not a calendar.
    const fine = gridHeight({ view: "week", slotMinutes: 5, weekScaleMinutes: 30, rowHeight: 40 });
    expect(fine).toBe(visualGridHeight(30, 40));
  });
});

describe("week scale", () => {
  it("accepts 30 and 60 minutes", () => {
    expect(gridHeight({ view: "week", weekScaleMinutes: 30, rowHeight: 40 })).toBe(visualGridHeight(30, 40));
    expect(gridHeight({ view: "week", weekScaleMinutes: 60, rowHeight: 40 })).toBe(visualGridHeight(60, 40));
  });

  it("falls back to 30 for anything else", () => {
    for (const invalid of [5, 15, 45, 90]) {
      expect(gridHeight({ view: "week", weekScaleMinutes: invalid, rowHeight: 40 })).toBe(visualGridHeight(30, 40));
    }
  });

  it("does not affect the day view", () => {
    expect(gridHeight({ view: "day", slotMinutes: 15, weekScaleMinutes: 60, rowHeight: 40 })).toBe(
      visualGridHeight(15, 40)
    );
  });
});
