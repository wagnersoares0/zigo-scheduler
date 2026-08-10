import { describe, expect, it } from "vitest";
import { zonedTimeToUtc } from "@zigoschedule/scheduler-core";
import type { Appointment, Block, BusinessHours, Professional } from "@zigoschedule/scheduler-engine";
import { ptBRMessages } from "../../../core/src/locales/pt-BR";
import { buildAgendaLayout } from "../build-agenda-layout";

/**
 * The render model is the package's whole promise: appointments in, rectangles
 * out, no framework anywhere. These tests assert on the numbers a consumer
 * would draw with — top, height, left, width — because that is the contract.
 *
 * The working day here is 09:00–17:00 = 480 minutes.
 */

const TIME_ZONE = "America/Sao_Paulo";
const MONDAY = new Date(2026, 7, 10);
const WIDTH = 1000;
const HEIGHT = 600;
const AXIS = 54;

const PROFESSIONALS: Professional[] = [
  { id: "ana", nome: "Ana Ribeiro" },
  { id: "carlos", nome: "Carlos Mendes" },
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

const at = (time: string, minutes: number, prof: string, id: string, client = "Maya"): Appointment => {
  const [h, m] = time.split(":").map(Number);
  return {
    id,
    data_hora: zonedTimeToUtc("2026-08-10", h * 60 + m, TIME_ZONE).toISOString(),
    duracao_minutos: minutes,
    cliente_nome: client,
    status: "confirmado",
    profissional_id: prof,
    servicos: [{ nome: "Consultation", duracao_minutos: minutes }],
  } as Appointment;
};

const layout = (extra: Partial<Parameters<typeof buildAgendaLayout>[0]> = {}) =>
  buildAgendaLayout({
    date: MONDAY,
    appointments: [],
    professionals: PROFESSIONALS,
    businessHours: BUSINESS_HOURS,
    timeZone: TIME_ZONE,
    locale: "pt-BR",
    messages: ptBRMessages,
    weekStartsOn: 1,
    width: WIDTH,
    height: HEIGHT,
    axisWidth: AXIS,
    ...extra,
  });

describe("rows", () => {
  it("covers the working day at the day granularity", () => {
    const model = layout({ view: "day", slotMinutes: 30 });
    expect(model.stepMinutes).toBe(30);
    expect(model.rows).toHaveLength(16);
    expect(model.rows[0]).toMatchObject({ minute: 540, label: "09:00", isMajor: true });
    expect(model.rows[1]).toMatchObject({ minute: 570, label: "09:30", isMajor: false });
    expect(model.rows.at(-1)?.label).toBe("16:30");
  });

  it("uses the coarser week scale instead of the day granularity", () => {
    const model = layout({ view: "week", slotMinutes: 5, weekScaleMinutes: 60 });
    expect(model.stepMinutes).toBe(60);
    expect(model.rows.map((row) => row.label)).toEqual([
      "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00",
    ]);
  });

  it("stacks rows without gaps or overlaps", () => {
    const model = layout({ view: "day", slotMinutes: 15 });
    for (let i = 1; i < model.rows.length; i++) {
      expect(model.rows[i].top).toBe(model.rows[i - 1].top + model.rows[i - 1].height);
    }
    const last = model.rows.at(-1)!;
    expect(last.top + last.height).toBe(model.totalHeight);
  });

  it("stretches rows to fill a tall viewport and stops at the minimum", () => {
    const roomy = layout({ view: "day", slotMinutes: 30, rowHeight: 32, height: 800 });
    expect(roomy.rowHeight).toBe(50); // 800 / 16
    const dense = layout({ view: "day", slotMinutes: 15, rowHeight: 32, height: 800 });
    expect(dense.rowHeight).toBe(32); // 32 rows would need 25px; the floor wins
    expect(dense.totalHeight).toBeGreaterThan(800); // therefore it scrolls
  });
});

describe("columns", () => {
  it("gives each professional a column in the day view", () => {
    const model = layout({ view: "day" });
    expect(model.columns).toHaveLength(2);
    expect(model.columns.map((c) => c.label)).toEqual(["Ana Ribeiro", "Carlos Mendes"]);
    expect(model.columns.map((c) => c.professionalId)).toEqual(["ana", "carlos"]);
  });

  it("gives each day a column in the week view", () => {
    const model = layout({ view: "week" });
    expect(model.columns).toHaveLength(7);
    expect(model.columns[0].label).toBe("seg.");
    expect(model.columns.every((c) => c.professionalId === null)).toBe(true);
  });

  it("localizes generated labels without moving the week", () => {
    const model = layout({ view: "week", locale: "en-US" });
    expect(model.columns.map((column) => column.dayKey)).toEqual([
      "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13",
      "2026-08-14", "2026-08-15", "2026-08-16",
    ]);
    expect(model.columns[0].label.toLowerCase()).toContain("mon");
  });

  it("lays columns out left to right after the axis", () => {
    const model = layout({ view: "day" });
    expect(model.columns[0].left).toBe(AXIS);
    expect(model.columns[1].left).toBe(AXIS + model.columns[0].width);
    expect(model.totalWidth).toBe(AXIS + model.columns.length * model.columns[0].width);
  });

  it("never shrinks a column below the minimum, even if it must scroll", () => {
    const model = layout({ view: "week", width: 400, columnMinWidth: 200 });
    expect(model.columns[0].width).toBe(200);
    expect(model.totalWidth).toBeGreaterThan(400);
  });

  it("marks a closed day", () => {
    const sunday = new Date(2026, 7, 16);
    const model = layout({ view: "day", date: sunday, professionals: [] });
    expect(model.columns[0].isClosed).toBe(true);
    expect(model.columns[0].closedLabel).toBeTruthy();
  });

  it("keeps an explicitly inactive professional closed instead of inheriting business hours", () => {
    const model = layout({
      view: "day",
      professionals: [
        {
          id: "ana",
          nome: "Ana Ribeiro",
          horarios_profissional: [{ dia_semana: 1, ativo: false }],
        },
      ],
    });

    expect(model.columns[0]).toMatchObject({
      professionalId: "ana",
      isClosed: true,
      openStartMinute: 540,
      openEndMinute: 540,
    });
    expect(model.unavailable.find((item) => item.reason === "closed")).toBeTruthy();
  });

  it("separates the short header badge from the full body message", () => {
    // One field used to serve both places, and the full sentence overflowed the
    // header. These are different text sizes because they live in different
    // amounts of space.
    const sunday = new Date(2026, 7, 16);
    const column = layout({ view: "day", date: sunday, professionals: [] }).columns[0];

    expect(column.closedLabel).toBe("Fechado");
    expect(column.closedMessage).toBe("Fechado");
  });

  it("puts the full sentence in the body block where there is room", () => {
    const sunday = new Date(2026, 7, 16);
    const model = layout({ view: "day", date: sunday, professionals: [] });
    const block = model.unavailable.find((u) => u.reason === "closed");
    expect(block?.label).toBe(model.columns[0].closedMessage);
  });

  it("localizes closed, lunch and outside-hours labels", () => {
    const model = layout({
      view: "day",
      locale: "en-US",
      messages: undefined,
      lunchBreak: { inicioMin: 720, fimMin: 780, inicioHHMM: "12:00", fimHHMM: "13:00" },
      professionals: [
        { ...PROFESSIONALS[0], horario_abertura: "10:00", horario_fechamento: "16:00" },
      ],
    });

    expect(model.unavailable.some((item) => item.label === "Lunch / Break")).toBe(true);
    expect(model.unavailable.some((item) => item.label === "Outside business hours")).toBe(true);
  });
});

describe("events", () => {
  it("positions an appointment from its time", () => {
    const model = layout({ view: "day", slotMinutes: 30, appointments: [at("10:00", 60, "ana", "1")] });
    const event = model.events[0];
    expect(event).toMatchObject({
      id: "1",
      title: "Maya",
      subtitle: "Consultation",
      professionalName: "Ana Ribeiro",
      timeLabel: "10:00 - 11:00",
      startMinute: 600,
      endMinute: 660,
    });
    expect(event.top).toBe(model.minuteToY(600));
    expect(event.height).toBe(model.minuteToY(660) - model.minuteToY(600));
  });

  it("does not lie about the duration of a short appointment", () => {
    // The card needs a minimum height; otherwise a 30-minute appointment in a
    // week view with 60-minute rows gets half a row and becomes unreadable. But
    // that floor belongs to **geometry**: for a while it leaked into `endMinute`
    // and `timeLabel`, and the scheduler claimed a 10:30 appointment ended at
    // 11:30.
    //
    // Toast UI Calendar has an open bug for this class of issue ("schedules with
    // time range less than 20 minutes render height as 20 minutes"). This pins
    // the Zigo behavior.
    const model = layout({
      view: "week",
      weekScaleMinutes: 60,
      appointments: [at("10:30", 30, "ana", "short")],
    });
    const event = model.events[0];

    expect(event.timeLabel).toBe("10:30 - 11:00");
    expect(event.endMinute - event.startMinute).toBe(30);
    // Still drawn with the height of a full row.
    expect(event.height).toBe(model.minuteToY(690) - model.minuteToY(630));
  });

  it("draws the short card with at least one row of height", () => {
    const tiny = layout({
      view: "week",
      weekScaleMinutes: 60,
      appointments: [at("10:00", 5, "ana", "tiny")],
    });
    const full = layout({
      view: "week",
      weekScaleMinutes: 60,
      appointments: [at("10:00", 60, "ana", "full")],
    });
    expect(tiny.events[0].height).toBe(full.events[0].height);
    expect(tiny.events[0].timeLabel).toBe("10:00 - 10:05");
  });

  it("puts an appointment in its professional's column", () => {
    const model = layout({
      view: "day",
      appointments: [at("10:00", 60, "carlos", "1")],
    });
    expect(model.events[0].columnKey).toBe(model.columns[1].key);
    expect(model.events[0].left).toBe(model.columns[1].left);
  });

  it("splits the column between colliding appointments", () => {
    const model = layout({
      view: "day",
      appointments: [at("10:00", 60, "ana", "1"), at("10:30", 60, "ana", "2")],
    });
    const [first, second] = model.events;
    expect(first.overlapCount).toBe(2);
    expect(second.overlapCount).toBe(2);
    expect(first.width).toBe(model.columns[0].width / 2);
    expect(second.left).toBe(first.left + first.width);
  });

  it("uses buffers for overlap lanes without changing the appointment label", () => {
    const first = {
      ...at("10:00", 60, "ana", "1"),
      bufferAfterMinutes: 15,
    };
    const model = layout({
      view: "day",
      appointments: [first, at("11:00", 60, "ana", "2")],
    });

    const [firstEvent, secondEvent] = model.events;
    expect(firstEvent).toMatchObject({
      timeLabel: "10:00 - 11:00",
      startMinute: 600,
      endMinute: 660,
      bufferAfterMinutes: 15,
      bufferEndMinute: 675,
      overlapCount: 2,
    });
    expect(secondEvent.overlapCount).toBe(2);
  });

  it("leaves a non-colliding appointment at full width", () => {
    const model = layout({
      view: "day",
      appointments: [at("10:00", 60, "ana", "1"), at("11:00", 60, "ana", "2")],
    });
    expect(model.events.every((e) => e.overlapCount === 1)).toBe(true);
    expect(model.events[0].width).toBe(model.columns[0].width);
  });

  it("drops an appointment that falls outside the working day", () => {
    const model = layout({ view: "day", appointments: [at("06:00", 60, "ana", "1")] });
    expect(model.events).toHaveLength(0);
  });

  it("ignores malformed appointments and blocks instead of poisoning geometry", () => {
    const model = layout({
      view: "day",
      appointments: [
        { id: "missing-start", status: "confirmed", professionalId: "ana" } as Appointment,
        { ...at("10:00", 0, "ana", "zero-duration") },
        at("11:00", 30, "ana", "valid"),
      ],
      blocks: [
        { id: "bad-block", date: "2026-08-10", startTime: "nope", endTime: "10:00" },
      ] as Block[],
    });

    expect(model.events.map((event) => event.id)).toEqual(["valid"]);
    expect(model.events[0].top).toBeTypeOf("number");
  });

  it("prefers the professional's colour over the appointment's own", () => {
    const model = layout({
      view: "day",
      appointments: [at("10:00", 60, "ana", "1")],
      colorByProfessional: { ana: "#A855F7" },
    });
    expect(model.events[0].color).toBe("#A855F7");
  });

  it("drops invalid CSS colours before renderers receive them", () => {
    const appointment = {
      ...at("10:00", 60, "ana", "1"),
      cor_agendamento: "#059669",
    } as Appointment;
    const model = layout({
      view: "day",
      appointments: [appointment],
      colorByProfessional: { ana: "url(javascript:alert(1))" },
      defaultColor: "not-a-color",
    });

    expect(model.events[0].color).toBe("#059669");
  });

  it("reads the stored instant in the business's zone", () => {
    // The same instant is 10:00 in São Paulo and 09:00 in Manaus.
    const appointment = at("10:00", 60, "ana", "1");
    expect(layout({ view: "day", appointments: [appointment] }).events[0].startMinute).toBe(600);
    expect(
      layout({ view: "day", appointments: [appointment], timeZone: "America/Manaus" }).events[0]
        .startMinute
    ).toBe(540);
  });

  it("spreads a business-wide block across every professional column", () => {
    const block: Block = {
      id: "b1",
      data: "2026-08-10",
      hora_inicio: "13:00",
      hora_fim: "14:00",
      motivo: "Maintenance",
      profissional_id: null,
    };
    const model = layout({ view: "day", blocks: [block] });
    expect(model.events.filter((e) => e.kind === "block")).toHaveLength(2);
    expect(model.events[0].title).toBe("Maintenance");
  });
});

describe("unavailable stretches", () => {
  it("marks the lunch break in every column", () => {
    const model = layout({
      view: "day",
      lunchBreak: { inicioMin: 720, fimMin: 780, inicioHHMM: "12:00", fimHHMM: "13:00" },
    });
    const lunch = model.unavailable.filter((u) => u.reason === "lunch");
    expect(lunch).toHaveLength(2);
    expect(lunch[0]).toMatchObject({ startMinute: 720, endMinute: 780 });
    expect(lunch[0].top).toBe(model.minuteToY(720));
  });

  it("lets a professional explicitly opt out of the shared break", () => {
    const model = layout({
      view: "day",
      professionals: [
        {
          id: "ana",
          nome: "Ana Ribeiro",
          horarios_profissional: [{ dia_semana: 1, ativo: true, tem_pausa: false }],
        },
      ],
      lunchBreak: { inicioMin: 720, fimMin: 780, inicioHHMM: "12:00", fimHHMM: "13:00" },
    });

    expect(model.unavailable.filter((item) => item.reason === "lunch")).toHaveLength(0);
  });

  it("covers a closed day whole", () => {
    const sunday = new Date(2026, 7, 16);
    const model = layout({ view: "day", date: sunday, professionals: [] });
    const closed = model.unavailable.find((u) => u.reason === "closed");
    expect(closed?.top).toBe(0);
    expect(closed?.height).toBe(model.totalHeight);
  });

  it("reports nothing when the day is fully open and there is no break", () => {
    expect(layout({ view: "day" }).unavailable).toEqual([]);
  });
});

describe("hit testing", () => {
  it("maps a point to a column and a snapped minute", () => {
    const model = layout({ view: "day", slotMinutes: 30 });
    const hit = model.hitTest(model.columns[1].left + 10, model.minuteToY(660) + 3);
    expect(hit).toMatchObject({ professionalId: "carlos", minute: 660 });
  });

  it("snaps down to the grid step", () => {
    const model = layout({ view: "day", slotMinutes: 30 });
    const hit = model.hitTest(AXIS + 5, model.minuteToY(610));
    expect(hit?.minute).toBe(600);
  });

  it("returns nothing over the axis or outside the grid", () => {
    const model = layout({ view: "day" });
    expect(model.hitTest(10, 100)).toBeNull();
    expect(model.hitTest(AXIS + 5, -20)).toBeNull();
    expect(model.hitTest(model.totalWidth + 50, 100)).toBeNull();
  });

  it("round-trips a minute through the grid and back", () => {
    const model = layout({ view: "day", slotMinutes: 15 });
    for (const minute of [540, 600, 705, 900, 1005]) {
      expect(model.yToMinute(model.minuteToY(minute))).toBe(minute);
    }
  });
});

describe("portability", () => {
  it("returns nothing but plain data and functions", () => {
    const model = layout({ view: "day", appointments: [at("10:00", 60, "ana", "1")] });
    // Anything that survives a JSON round-trip can cross a language boundary.
    const plain = JSON.parse(
      JSON.stringify({
        columns: model.columns,
        rows: model.rows,
        events: model.events,
        unavailable: model.unavailable,
      })
    );
    expect(plain.columns).toEqual(model.columns);
    expect(plain.events).toEqual(model.events);
  });
});
