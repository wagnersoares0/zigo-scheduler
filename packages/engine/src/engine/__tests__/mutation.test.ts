import { describe, expect, it } from "vitest";
import type { AgendaAppointmentEvent, AgendaTimeRange } from "../types";
import { buildMoveMutation, buildResizeMutation, isMutationNoop } from "../index";

const makeEvent = (): AgendaAppointmentEvent => {
  const appointment = {
    id: "ag-1",
    data_hora: "2026-06-22T10:00:00-03:00",
    duracao_minutos: 30,
    cliente_nome: "Client",
    status: "confirmado",
    profissional_id: "prof-a",
  };

  return {
    kind: "appointment",
    id: "ag-1",
    dayKey: "2026-06-22",
    resourceId: "prof-a",
    startMinute: 10 * 60,
    endMinute: 10 * 60 + 30,
    status: "confirmado",
    appointment,
    ag: appointment,
  };
};

describe("agenda mutations", () => {
  it("builds move mutation preserving the new resource and duration", () => {
    const nextRange: AgendaTimeRange = {
      dayKey: "2026-06-23",
      resourceId: "prof-b",
      startMinute: 11 * 60,
      endMinute: 11 * 60 + 30,
    };

    const mutation = buildMoveMutation(makeEvent(), nextRange);

    expect(mutation).toMatchObject({
      kind: "move",
      eventId: "ag-1",
      nextRange,
      durationMinutes: 30,
    });
    expect(isMutationNoop(mutation)).toBe(false);
  });

  it("builds resize mutation without changing day or professional", () => {
    const mutation = buildResizeMutation(makeEvent(), 11 * 60);

    expect(mutation).toMatchObject({
      kind: "resize",
      eventId: "ag-1",
      nextRange: {
        dayKey: "2026-06-22",
        resourceId: "prof-a",
        startMinute: 10 * 60,
        endMinute: 11 * 60,
      },
      durationMinutes: 60,
    });
  });

  it("detects no-op mutations", () => {
    const event = makeEvent();
    const mutation = buildMoveMutation(event, {
      dayKey: event.dayKey,
      resourceId: event.resourceId,
      startMinute: event.startMinute,
      endMinute: event.endMinute,
    });

    expect(isMutationNoop(mutation)).toBe(true);
  });
});
