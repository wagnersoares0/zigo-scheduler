// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { zonedTimeToUtc } from "@zigoschedule/scheduler-core";
import type { Appointment, BusinessHours, Professional } from "@zigoschedule/scheduler-engine";
import { ZigoSchedulerElement } from "../element";
import { defineZigoScheduler, TAG_NAME } from "../define";

/**
 * The element is the package's whole promise: a calendar in any stack, with no
 * framework. These tests drive it the way a plain HTML page would — set an
 * attribute, assign a property, listen for an event.
 */

const TIME_ZONE = "America/Sao_Paulo";

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

const PROFESSIONALS: Professional[] = [
  { id: "ana", nome: "Ana Ribeiro" },
  { id: "carlos", nome: "Carlos Mendes" },
];

const APPOINTMENTS: Appointment[] = [
  {
    id: "1",
    data_hora: zonedTimeToUtc("2026-08-10", 10 * 60, TIME_ZONE).toISOString(),
    duracao_minutos: 60,
    cliente_nome: "Maya Lee",
    status: "confirmado",
    profissional_id: "ana",
    servicos: [{ nome: "Consultation", duracao_minutos: 60 }],
  },
] as Appointment[];

/** happy-dom reports zero size, so the element needs measurements handed to it. */
const size = (element: HTMLElement, width = 1000, height = 600) => {
  Object.defineProperty(element, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(element, "clientHeight", { value: height, configurable: true });
};

const mount = (attrs: Record<string, string> = {}): ZigoSchedulerElement => {
  defineZigoScheduler();
  const element = document.createElement(TAG_NAME) as ZigoSchedulerElement;
  element.setAttribute("locale", "pt-BR");
  element.setAttribute("week-starts-on", "1");
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  size(element);
  document.body.appendChild(element);
  element.professionals = PROFESSIONALS;
  element.businessHours = BUSINESS_HOURS;
  return element;
};

const shadow = (element: ZigoSchedulerElement) => element.shadowRoot!;
const text = (element: ZigoSchedulerElement) => shadow(element).textContent ?? "";
const pointer = (type: string, init: PointerEventInit) =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    pointerType: "mouse",
    button: 0,
    ...init,
  });

beforeEach(() => {
  document.body.innerHTML = "";
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  );
});

describe("registration", () => {
  it("registers under zigo-scheduler", () => {
    defineZigoScheduler();
    expect(customElements.get(TAG_NAME)).toBe(ZigoSchedulerElement);
  });

  it("is safe to register twice", () => {
    defineZigoScheduler();
    expect(() => defineZigoScheduler()).not.toThrow();
  });
});

describe("rendering", () => {
  it("draws a column per professional in the day view", () => {
    const element = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    expect(text(element)).toContain("Ana Ribeiro");
    expect(text(element)).toContain("Carlos Mendes");
  });

  it("draws a column per day in the week view", () => {
    const element = mount({ view: "week", date: "2026-08-10", timezone: TIME_ZONE });
    const labels = [...shadow(element).querySelectorAll(".za-header-label")].map(
      (node) => node.textContent
    );
    expect(labels).toHaveLength(7);
    expect(labels[0]).toBe("seg.");
  });

  it("draws an appointment with its client and service", () => {
    const element = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    element.appointments = APPOINTMENTS;

    const card = shadow(element).querySelector("[data-event-id='1']");
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain("Maya Lee");
    expect(card?.textContent).toContain("10:00 - 11:00");
  });

  it("does not use unsafe avatar URLs", () => {
    const element = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    element.professionals = [{ id: "ana", nome: "Ana Ribeiro", foto_url: "javascript:alert(1)" }];

    expect(shadow(element).querySelector(".za-header-cell img")).toBeNull();
    expect(shadow(element).querySelector(".za-initials")?.textContent).toBe("AR");
  });

  it("labels every row on the time axis", () => {
    const element = mount({ view: "day", date: "2026-08-10", "slot-minutes": "30" });
    const times = [...shadow(element).querySelectorAll("[data-time]")].map(
      (node) => (node as HTMLElement).dataset.time
    );
    expect(times.slice(0, 4)).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  it("keeps its styles inside the shadow root", () => {
    const element = mount();
    expect(shadow(element).querySelector("style")?.textContent).toContain(".za-event");
  });
});

describe("attributes", () => {
  it("redraws when the view changes", () => {
    const element = mount({ view: "day", date: "2026-08-10" });
    expect(shadow(element).querySelectorAll(".za-header-cell")).toHaveLength(2);

    element.setAttribute("view", "week");
    expect(shadow(element).querySelectorAll(".za-header-cell")).toHaveLength(7);
  });

  it("honours the week scale", () => {
    const element = mount({ view: "week", date: "2026-08-10", "week-scale": "60" });
    const times = [...shadow(element).querySelectorAll("[data-time]")].map(
      (node) => (node as HTMLElement).dataset.time
    );
    expect(times.slice(0, 3)).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("reads the appointment in the zone it is given", () => {
    const element = mount({ view: "day", date: "2026-08-10", timezone: "America/Manaus" });
    element.appointments = APPOINTMENTS;
    // 10:00 in São Paulo is 09:00 in Manaus.
    expect(shadow(element).querySelector("[data-event-id='1']")?.textContent).toContain(
      "9:00 - 10:00"
    );
  });
});

describe("events", () => {
  it("emits select-event when a card is clicked", () => {
    const element = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    element.appointments = APPOINTMENTS;

    const seen: unknown[] = [];
    element.addEventListener("select-event", (e) => seen.push((e as CustomEvent).detail));

    shadow(element).querySelector<HTMLElement>("[data-event-id='1']")?.click();

    expect(seen).toHaveLength(1);
    expect((seen[0] as { event: { title: string } }).event.title).toBe("Maya Lee");
  });

  it("crosses the shadow boundary so the host page can listen", () => {
    const element = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    element.appointments = APPOINTMENTS;

    const seen: unknown[] = [];
    document.body.addEventListener("select-event", (e) => seen.push(e));

    shadow(element).querySelector<HTMLElement>("[data-event-id='1']")?.click();
    expect(seen).toHaveLength(1);
  });

  it("emits only the appointment id for built-in modal actions", () => {
    const element = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    element.appointments = APPOINTMENTS;

    const seen: unknown[] = [];
    element.addEventListener("appointment-action", (e) => seen.push((e as CustomEvent).detail));

    shadow(element).querySelector<HTMLElement>("[data-event-id='1']")?.click();
    shadow(element).querySelector<HTMLElement>(".za-action")?.click();

    expect(seen).toEqual([{ action: "whatsapp", id: "1" }]);
  });

  it("keeps built-in details isolated between element instances", () => {
    const first = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    const second = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    first.appointments = APPOINTMENTS;
    second.appointments = [{ ...APPOINTMENTS[0], id: "2", cliente_nome: "Noah Carter" }];

    shadow(first).querySelector<HTMLElement>("[data-event-id='1']")?.click();
    shadow(second).querySelector<HTMLElement>("[data-event-id='2']")?.click();

    expect(shadow(first).querySelector(".za-sheet")).not.toBeNull();
    expect(shadow(second).querySelector(".za-sheet")).not.toBeNull();
  });

  it("does not duplicate month click callbacks after redraw", () => {
    const element = mount({ view: "month", date: "2026-08-10", timezone: TIME_ZONE });
    element.appointments = APPOINTMENTS;
    element.setAttribute("locale", "en-US");

    const seen: unknown[] = [];
    element.addEventListener("select-event", (e) => seen.push((e as CustomEvent).detail));
    shadow(element).querySelector<HTMLElement>("[data-event-id='1']")?.click();

    expect(seen).toHaveLength(1);
  });

  it("blocks drag events that conflict with another appointment", () => {
    const element = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    element.appointments = [
      APPOINTMENTS[0],
      {
        ...APPOINTMENTS[0],
        id: "2",
        data_hora: zonedTimeToUtc("2026-08-10", 11 * 60, TIME_ZONE).toISOString(),
        cliente_nome: "Noah Carter",
      },
    ];

    const moved: unknown[] = [];
    const blocked: unknown[] = [];
    element.addEventListener("move-event", (e) => moved.push((e as CustomEvent).detail));
    element.addEventListener("blocked-event", (e) => blocked.push((e as CustomEvent).detail));

    const layout = element.layout!;
    const event = layout.events.find((item) => item.id === "1")!;
    const card = shadow(element).querySelector<HTMLElement>("[data-event-id='1']")!;
    const x = event.left - layout.axisWidth + 8;
    const startY = event.top + 8;
    const conflictY = layout.minuteToY(11 * 60) + 8;

    card.dispatchEvent(pointer("pointerdown", { clientX: x, clientY: startY }));
    document.dispatchEvent(pointer("pointermove", { clientX: x, clientY: conflictY }));
    document.dispatchEvent(pointer("pointerup", { clientX: x, clientY: conflictY }));

    expect(moved).toHaveLength(0);
    expect(blocked).toEqual([
      expect.objectContaining({ code: "APPOINTMENT_CONFLICT", id: "1" }),
    ]);
  });
  });

describe("data properties", () => {
  it("starts empty and renders nothing but the grid", () => {
    const element = mount({ view: "day", date: "2026-08-10" });
    expect(shadow(element).querySelectorAll(".za-event")).toHaveLength(0);
  });

  it("redraws when appointments are replaced", () => {
    const element = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    element.appointments = APPOINTMENTS;
    expect(shadow(element).querySelectorAll(".za-event")).toHaveLength(1);

    element.appointments = [];
    expect(shadow(element).querySelectorAll(".za-event")).toHaveLength(0);
  });

  it("marks the lunch break", () => {
    const element = mount({ view: "day", date: "2026-08-10" });
    element.lunchBreak = { inicioMin: 720, fimMin: 780, inicioHHMM: "12:00", fimHHMM: "13:00" };
    expect(shadow(element).querySelectorAll(".za-lunch").length).toBeGreaterThan(0);
  });
});
