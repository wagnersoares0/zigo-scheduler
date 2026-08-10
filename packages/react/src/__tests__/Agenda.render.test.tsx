// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { act } from "react-dom/test-utils";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { Agenda } from "../Agenda";
import { zonedTimeToUtc } from "@zigoschedule/scheduler-core";
import type { Appointment, BusinessHours, Professional } from "@zigoschedule/scheduler-engine";

/**
 * The acceptance test for the whole extraction.
 *
 * If the calendar renders here — no database, no session, no network, just an
 * array of appointments — then it is genuinely decoupled. If it ever stops
 * rendering, something has crept back in.
 */

const TIME_ZONE = "America/Sao_Paulo";
const MONDAY = new Date(2026, 7, 3); // 2026-08-03

const at = (dayKey: string, time: string): string => {
  const [h, m] = time.split(":").map(Number);
  return zonedTimeToUtc(dayKey, h * 60 + m, TIME_ZONE).toISOString();
};

const PROFESSIONALS: Professional[] = [
  { id: "ana", nome: "Ana" },
  { id: "carlos", nome: "Carlos" },
];

const BUSINESS_HOURS: BusinessHours = {
  domingo: { ativo: false, abertura: "09:00", fechamento: "18:00" },
  segunda: { ativo: true, abertura: "09:00", fechamento: "19:00" },
  terca: { ativo: true, abertura: "09:00", fechamento: "19:00" },
  quarta: { ativo: true, abertura: "09:00", fechamento: "19:00" },
  quinta: { ativo: true, abertura: "09:00", fechamento: "19:00" },
  sexta: { ativo: true, abertura: "09:00", fechamento: "19:00" },
  sabado: { ativo: true, abertura: "08:00", fechamento: "16:00" },
};

const APPOINTMENTS: Appointment[] = [
  {
    id: "1",
    data_hora: at("2026-08-03", "09:00"),
    duracao_minutos: 60,
    cliente_nome: "Maya Lee",
    clientPhone: "+1 415 555 0101",
    status: "confirmado",
    paymentStatus: "paid",
    price: 120,
    notes: "Bring recent exams.",
    services: { name: "Consultation", durationMinutes: 60, price: 120 },
    profissional_id: "ana",
  },
  {
    id: "2",
    data_hora: at("2026-08-03", "10:30"),
    duracao_minutos: 30,
    cliente_nome: "Noah Carter",
    status: "confirmado",
    profissional_id: "carlos",
  },
] as Appointment[];

const render = (props: Partial<Parameters<typeof Agenda>[0]> = {}) =>
  renderToStaticMarkup(
    <Agenda
      date={MONDAY}
      appointments={APPOINTMENTS}
      professionals={PROFESSIONALS}
      businessHours={BUSINESS_HOURS}
      timeZone={TIME_ZONE}
      view="day"
      {...props}
    />
  );

describe("Agenda", () => {
  it("renders with nothing but an array of appointments", () => {
    const html = render();
    expect(html.length).toBeGreaterThan(0);
    expect(html).toContain("Maya Lee");
    expect(html).toContain("Noah Carter");
  });

  it("draws a column per professional", () => {
    const html = render();
    expect(html).toContain("Ana");
    expect(html).toContain("Carlos");
  });

  it("prints the opening hours of the day on the time axis", () => {
    const html = render();
    // Monday opens at 09:00 and closes at 19:00
    expect(html).toContain("09:00");
    expect(html).toContain("18:00");
    // Nothing before opening should be drawn
    expect(html).not.toContain("07:00");
  });

  it("renders the week view", () => {
    const html = render({ view: "week" });
    expect(html).toContain("Maya Lee");
  });

  it("renders the month view", () => {
    const html = render({ view: "month" });
    expect(html).toContain("Maya Lee");
    // The month grid spills into neighbouring months to fill whole weeks.
    expect(html).toContain("31");
  });

  it("keeps past slots selectable when the guard is turned off", () => {
    // A calendar anchored in the past would be dead on arrival in a demo.
    const past = new Date(2020, 0, 6); // a Monday long gone
    const html = render({ date: past, appointments: [], blockPastSlots: false });
    expect(html.length).toBeGreaterThan(0);
  });

  it("reads the same instants against the local clock of the business", () => {
    // The appointments are fixed instants. A salon one hour west reads them an
    // hour earlier: 09:00 becomes 08:00 and falls before the 09:00 opening, so
    // it is no longer inside the working day. 10:30 becomes 09:30 and stays.
    const saoPaulo = render({ timeZone: "America/Sao_Paulo" });
    const manaus = render({ timeZone: "America/Manaus" });

    expect(saoPaulo).toContain("Maya Lee");
    expect(saoPaulo).toContain("Noah Carter");

    expect(manaus).not.toContain("Maya Lee");
    expect(manaus).toContain("Noah Carter");
  });

  it("renders read-only without dragging enabled", () => {
    const html = render({ editable: false });
    expect(html).toContain("Maya Lee");
  });

  it("renders buffer bands and exposes keyboard shortcuts on appointment cards", () => {
    const html = render({
      appointments: [
        {
          ...APPOINTMENTS[0],
          data_hora: at("2026-08-03", "10:00"),
          bufferBeforeMinutes: 10,
          bufferAfterMinutes: 15,
        },
      ],
    });

    expect(html).toContain('data-ag-buffer="before"');
    expect(html).toContain('data-ag-buffer="after"');
    expect(html).toContain('aria-keyshortcuts="Enter Space"');
  });

  it("renders an empty calendar without appointments", () => {
    const html = render({ appointments: [] });
    expect(html.length).toBeGreaterThan(0);
    expect(html).not.toContain("Maya Lee");
  });

  it("renders a closed day", () => {
    const sunday = new Date(2026, 7, 2);
    const html = render({ date: sunday, appointments: [] });
    expect(html.length).toBeGreaterThan(0);
  });

  it("opens the built-in details modal when the host does not own clicks", async () => {
    const container = document.createElement("div");
    container.style.height = "720px";
    document.body.appendChild(container);
    const root = createRoot(container);

    try {
      await act(async () => {
        root.render(
          <Agenda
            date={MONDAY}
            appointments={APPOINTMENTS}
            professionals={PROFESSIONALS}
            businessHours={BUSINESS_HOURS}
            timeZone={TIME_ZONE}
            view="day"
            detailsMode="modal"
          />
        );
      });

      const card = container.querySelector<HTMLButtonElement>('button[aria-label*="Maya Lee"]');
      expect(card).toBeTruthy();

      await act(async () => {
        card?.click();
      });

      const dialog = container.querySelector<HTMLElement>('[role="dialog"]');
      expect(dialog?.textContent).toContain("Maya Lee");
      expect(dialog?.textContent).toContain("Consultation");
      expect(dialog?.textContent).toContain("Ref.");
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });

  it("keeps auto mode callback-only when the host handles appointment clicks", async () => {
    const container = document.createElement("div");
    container.style.height = "720px";
    document.body.appendChild(container);
    const root = createRoot(container);
    const selected: string[] = [];

    try {
      await act(async () => {
        root.render(
          <Agenda
            date={MONDAY}
            appointments={APPOINTMENTS}
            professionals={PROFESSIONALS}
            businessHours={BUSINESS_HOURS}
            timeZone={TIME_ZONE}
            view="day"
            onSelectAppointment={(appointment) => selected.push(appointment.id)}
          />
        );
      });

      const card = container.querySelector<HTMLButtonElement>('button[aria-label*="Maya Lee"]');
      await act(async () => {
        card?.click();
      });

      expect(selected).toEqual(["1"]);
      expect(container.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    }
  });
});
