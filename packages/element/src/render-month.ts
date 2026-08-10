import type { AgendaMonthEntry, AgendaMonthLayout } from "@zigoschedule/scheduler-layout";
import { getAgendaMessages, type AgendaMessages } from "@zigoschedule/scheduler-core";
import { buildMonthGrid } from "./parts/month";

export type MonthCallbacks = {
  onSelectEntry?: (
    id: string,
    dayKey: string,
    entry: AgendaMonthEntry,
    native: MouseEvent
  ) => void;
  onSelectDay?: (dayKey: string) => void;
  messages?: AgendaMessages;
};

/** Replaces `root` with the month grid and wires its two click targets. */
export function renderAgendaMonth(
  root: HTMLElement,
  layout: AgendaMonthLayout,
  callbacks: MonthCallbacks = {}
): void {
  root.textContent = "";
  root.classList.add("za-root");
  root.appendChild(buildMonthGrid(layout, callbacks.messages ?? getAgendaMessages()));

  // Index by id so a click resolves to the model entry, not to text copied from
  // the DOM.
  const entries = new Map<string, AgendaMonthEntry>();
  for (const cell of layout.cells) {
    for (const entry of cell.entries) entries.set(entry.id, entry);
  }

  root.addEventListener("click", (native) => {
    const target = native.target as HTMLElement | null;

    const entry = target?.closest<HTMLElement>("[data-event-id]");
    if (entry) {
      const day = entry.closest<HTMLElement>("[data-day-key]");
      const id = entry.dataset.eventId ?? "";
      const model = entries.get(id);
      if (model) callbacks.onSelectEntry?.(id, day?.dataset.dayKey ?? "", model, native);
      return;
    }

    const cell = target?.closest<HTMLElement>("[data-day-key]");
    if (cell) callbacks.onSelectDay?.(cell.dataset.dayKey ?? "");
  });
}
