import { describe, expect, it } from "vitest";
import {
  beginAgendaInteraction,
  commitAgendaInteraction,
  createIdleInteractionState,
  isAgendaInteractionActive,
  revertAgendaInteraction,
  shouldHideEventForInteraction,
  updateAgendaInteraction,
} from "../index";
import type { AgendaTimeRange } from "../types";

const range = (startMinute: number, endMinute: number): AgendaTimeRange => ({
  dayKey: "2026-06-22",
  resourceId: "prof-a",
  startMinute,
  endMinute,
});

describe("agenda interaction state", () => {
  it("starts idle", () => {
    const state = createIdleInteractionState();

    expect(state).toEqual({
      phase: "idle",
      kind: null,
      eventId: null,
      origin: null,
      current: null,
      blockedMessage: null,
    });
    expect(isAgendaInteractionActive(state)).toBe(false);
  });

  it("tracks drag current range and hidden event", () => {
    const state = beginAgendaInteraction({
      phase: "dragging",
      kind: "move",
      eventId: "ag-1",
      origin: range(9 * 60, 9 * 60 + 30),
    });
    const moved = updateAgendaInteraction(state, range(10 * 60, 10 * 60 + 30));

    expect(moved.current).toMatchObject({ startMinute: 10 * 60 });
    expect(shouldHideEventForInteraction(moved, "ag-1")).toBe(true);
    expect(shouldHideEventForInteraction(moved, "ag-2")).toBe(false);
  });

  it("moves through committing and reverting phases", () => {
    const state = beginAgendaInteraction({
      phase: "resizing",
      kind: "resize",
      eventId: "ag-1",
      origin: range(9 * 60, 9 * 60 + 30),
      current: range(9 * 60, 10 * 60),
    });

    expect(commitAgendaInteraction(state)).toMatchObject({ phase: "committing", blockedMessage: null });
    expect(revertAgendaInteraction(state, "Conflict")).toMatchObject({
      phase: "reverting",
      blockedMessage: "Conflict",
    });
  });
});
