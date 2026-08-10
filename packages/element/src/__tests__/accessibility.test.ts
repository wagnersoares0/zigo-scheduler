// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { zonedTimeToUtc } from "@zigoschedule/scheduler-core";
import type { Appointment, BusinessHours, Professional } from "@zigoschedule/scheduler-engine";
import { defineZigoScheduler, TAG_NAME } from "../define";
import { ZigoSchedulerElement } from "../element";

const TIME_ZONE = "America/Sao_Paulo";
const BUSINESS_HOURS: BusinessHours = {
  monday: { active: true, opensAt: "09:00", closesAt: "17:00" },
};
const PROFESSIONALS: Professional[] = [{ id: "maya", name: "Dr. Maya Lee" }];
const APPOINTMENTS: Appointment[] = [{
  id: "apt-1",
  startsAt: zonedTimeToUtc("2026-08-10", 9 * 60, TIME_ZONE).toISOString(),
  durationMinutes: 60,
  clientName: "Olivia Carter",
  status: "confirmed",
  professionalId: "maya",
  services: [{ name: "Physical therapy follow-up", durationMinutes: 60 }],
}];

const size = (element: HTMLElement, width = 960, height = 560) => {
  Object.defineProperty(element, "clientWidth", { value: width, configurable: true });
  Object.defineProperty(element, "clientHeight", { value: height, configurable: true });
};

const mount = (attrs: Record<string, string> = {}): ZigoSchedulerElement => {
  defineZigoScheduler();
  const element = document.createElement(TAG_NAME) as ZigoSchedulerElement;
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, value);
  size(element);
  document.body.appendChild(element);
  element.professionals = PROFESSIONALS;
  element.businessHours = BUSINESS_HOURS;
  element.appointments = APPOINTMENTS;
  return element;
};

const key = (name: string, shiftKey = false) =>
  new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: name, shiftKey });

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

describe("web component keyboard accessibility", () => {
  it("opens day-view appointment details with Enter and restores focus on Escape", () => {
    const element = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    const root = element.shadowRoot!;
    const card = root.querySelector<HTMLElement>("[data-event-id='apt-1']")!;

    card.focus();
    card.dispatchEvent(key("Enter"));

    expect(root.querySelector(".za-sheet")).not.toBeNull();

    document.dispatchEvent(key("Escape"));

    expect(root.querySelector(".za-sheet")).toBeNull();
    expect(root.activeElement).toBe(card);
  });

  it("keeps Tab inside the built-in details sheet", () => {
    const element = mount({ view: "day", date: "2026-08-10", timezone: TIME_ZONE });
    const root = element.shadowRoot!;
    root.querySelector<HTMLElement>("[data-event-id='apt-1']")!.click();

    const close = root.querySelector<HTMLElement>(".za-sheet-x")!;
    const charge = root.querySelector<HTMLElement>(".za-primary")!;
    charge.focus();
    document.dispatchEvent(key("Tab"));

    expect(root.activeElement).toBe(close);
  });

  it("opens month entries with Space", () => {
    const element = mount({ view: "month", date: "2026-08-10", timezone: TIME_ZONE });
    const root = element.shadowRoot!;
    const entry = root.querySelector<HTMLElement>("[data-event-id='apt-1']")!;

    entry.focus();
    entry.dispatchEvent(key(" "));

    expect(root.querySelector(".za-sheet")).not.toBeNull();
  });
});
