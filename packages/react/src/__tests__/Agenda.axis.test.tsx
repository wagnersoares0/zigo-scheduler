// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Agenda } from "../Agenda";
import type { BusinessHours, Professional } from "@zigoschedule/scheduler-engine";

/**
 * The time axis is the reader's only anchor. If a row exists, it needs a label:
 * a blank stripe between 09:00 and 10:00 leaves the viewer counting pixels.
 */

const TIME_ZONE = "America/Sao_Paulo";
const MONDAY = new Date(2026, 7, 10);
const PROFESSIONALS: Professional[] = [{ id: "ana", nome: "Ana" }, { id: "carlos", nome: "Carlos" }];
const OPEN = { ativo: true, abertura: "09:00", fechamento: "17:00" };
const BUSINESS_HOURS: BusinessHours = {
  domingo: { ...OPEN, ativo: false }, segunda: OPEN, terca: OPEN,
  quarta: OPEN, quinta: OPEN, sexta: OPEN, sabado: OPEN,
};

/**
 * `data-time` is stamped on the axis label and on each column's lane cell, so
 * the same minute shows up once per column. The distinct set in document order
 * is the row sequence.
 */
const axisLabels = (props: Partial<Parameters<typeof Agenda>[0]>): string[] => {
  const html = renderToStaticMarkup(
    <Agenda date={MONDAY} appointments={[]} professionals={PROFESSIONALS}
      businessHours={BUSINESS_HOURS} timeZone={TIME_ZONE} {...props} />
  );
  const all = [...html.matchAll(/data-time="(\d{2}:\d{2})"/g)].map((m) => m[1]);
  return [...new Set(all)];
};

const axisText = (props: Partial<Parameters<typeof Agenda>[0]>, time: string): string | undefined => {
  const html = renderToStaticMarkup(
    <Agenda date={MONDAY} appointments={[]} professionals={PROFESSIONALS}
      businessHours={BUSINESS_HOURS} timeZone={TIME_ZONE} {...props} />
  );
  const content = html.match(new RegExp(`data-time="${time}"[^>]*>(.*?)</div>`))?.[1];
  return content?.replace(/<[^>]*>/g, "");
};

describe("time axis", () => {
  it("labels every half hour on the 30-minute week scale", () => {
    const labels = axisLabels({ view: "week", weekScaleMinutes: 30 });
    expect(labels.slice(0, 5)).toEqual(["09:00", "09:30", "10:00", "10:30", "11:00"]);
    expect(labels).toHaveLength(17);
    expect(labels.at(-1)).toBe("17:00");
  });

  it("labels whole hours only on the 60-minute week scale", () => {
    const labels = axisLabels({ view: "week", weekScaleMinutes: 60 });
    expect(labels).toEqual([
      "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
    ]);
  });

  it("follows the day granularity in the day view", () => {
    expect(axisLabels({ view: "day", slotMinutes: 15 }).slice(0, 4)).toEqual([
      "09:00", "09:15", "09:30", "09:45",
    ]);
    expect(axisLabels({ view: "day", slotMinutes: 30 })).toHaveLength(17);
    expect(axisLabels({ view: "day", slotMinutes: 5 })).toHaveLength(97);
  });

  it("covers the whole working day", () => {
    const labels = axisLabels({ view: "week", weekScaleMinutes: 60 });
    expect(labels[0]).toBe("09:00");
    expect(labels.at(-1)).toBe("17:00");
  });

  it("renders compact axis text with the locale's hour cycle", () => {
    expect(axisText({ view: "day", locale: "en-US" }, "13:00")).toBe("1:00PM");
    expect(axisText({ view: "day", locale: "en-GB" }, "13:00")).toBe("13:00");
    expect(axisText({ view: "day", locale: "pt-BR" }, "13:00")).toBe("13:00");
  });
});
