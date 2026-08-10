import { describe, expect, it, vi } from "vitest";
import type { AgendaAppointmentEvent, AgendaEngineContext, AgendaEventMutation } from "@zigoschedule/scheduler-engine";
import {
  decideAppointmentMutation,
  MSG_AGENDAMENTO_NAO_ENCONTRADO,
} from "../decideAppointmentMutation";

/**
 * Dragging and resizing share one decision: may this appointment move, and to
 * where. It used to be written twice, once per gesture, with the same four
 * branches in each copy.
 */

vi.mock("@zigoschedule/scheduler-engine", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    isMutationNoop: (mutation: { noop?: boolean }) => Boolean(mutation?.noop),
    validateAppointmentMutation: (
      _engine: unknown,
      _appointment: unknown,
      mutation: { refuse?: string }
    ) => (mutation?.refuse ? { ok: false, message: mutation.refuse } : { ok: true }),
  };
});

const engine = {} as AgendaEngineContext;
const appointment = { id: "1" } as AgendaAppointmentEvent;

const mutationOf = (extra: Record<string, unknown> = {}) =>
  ({
    nextRange: { dayKey: "2026-08-10", resourceId: "ana", startMinute: 600, endMinute: 660 },
    durationMinutes: 60,
    ...extra,
  }) as unknown as AgendaEventMutation;

describe("missing appointment", () => {
  it("reports it when the appointment is not in view", () => {
    expect(decideAppointmentMutation(engine, null, mutationOf())).toEqual({
      status: "missing",
      message: MSG_AGENDAMENTO_NAO_ENCONTRADO,
    });
  });

  it("reports it when no mutation could be built", () => {
    expect(decideAppointmentMutation(engine, appointment, null)).toEqual({
      status: "missing",
      message: MSG_AGENDAMENTO_NAO_ENCONTRADO,
    });
  });
});

describe("no change", () => {
  it("returns noop when the card landed where it already was", () => {
    // Not an error and not a save: dropping something back in place should
    // leave the grid exactly as it was, without a network call.
    expect(decideAppointmentMutation(engine, appointment, mutationOf({ noop: true }))).toEqual({
      status: "noop",
    });
  });
});

describe("refused by a rule", () => {
  it("passes the rule's message through untouched", () => {
    expect(
      decideAppointmentMutation(engine, appointment, mutationOf({ refuse: "Slot already booked." }))
    ).toEqual({ status: "blocked", message: "Slot already booked." });
  });

  it("checks noop before validating", () => {
    // A no-move must not be refused by a rule about where it landed.
    expect(
      decideAppointmentMutation(
        engine,
        appointment,
        mutationOf({ noop: true, refuse: "Slot already booked." })
      )
    ).toEqual({ status: "noop" });
  });
});

describe("ready to commit", () => {
  it("hands the mutation back so the caller can save it", () => {
    const mutation = mutationOf();
    const decision = decideAppointmentMutation(engine, appointment, mutation);
    expect(decision).toEqual({ status: "ready", mutation });
  });

  it("narrows the type so the mutation is no longer nullable", () => {
    const decision = decideAppointmentMutation(engine, appointment, mutationOf());
    if (decision.status === "ready") {
      expect(decision.mutation.nextRange.startMinute).toBe(600);
    } else {
      throw new Error("should be ready");
    }
  });
});
