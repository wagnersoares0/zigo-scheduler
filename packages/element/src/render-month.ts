import type { AgendaMonthEntry, AgendaMonthLayout } from "@zigoschedule/scheduler-layout";
import { getAgendaMessages, type AgendaMessages } from "@zigoschedule/scheduler-core";
import { releaseRenderCleanup, setRenderCleanup } from "./render-cleanup";
import { buildMonthGrid } from "./parts/month";

export type MonthCallbacks = {
  onSelectEntry?: (
    id: string,
    dayKey: string,
    entry: AgendaMonthEntry,
    native: MouseEvent | KeyboardEvent
  ) => void;
  onSelectDay?: (dayKey: string) => void;
  messages?: AgendaMessages;
};

const isActivationKey = (native: KeyboardEvent): boolean =>
  native.key === "Enter" || native.key === " ";

/** Replaces `root` with the month grid and wires its two click targets. */
export function renderAgendaMonth(
  root: HTMLElement,
  layout: AgendaMonthLayout,
  callbacks: MonthCallbacks = {}
): void {
  releaseRenderCleanup(root);
  root.textContent = "";
  root.classList.add("za-root");
  root.appendChild(buildMonthGrid(layout, callbacks.messages ?? getAgendaMessages()));

  // Index by id so a click resolves to the model entry, not to text copied from
  // the DOM.
  const entries = new Map<string, AgendaMonthEntry>();
  for (const cell of layout.cells) {
    for (const entry of cell.entries) entries.set(entry.id, entry);
  }

  const selectEntry = (target: HTMLElement | null, native: MouseEvent | KeyboardEvent): boolean => {
    const entry = target?.closest<HTMLElement>("[data-event-id]");
    if (!entry) return false;

    const day = entry.closest<HTMLElement>("[data-day-key]");
    const id = entry.dataset.eventId ?? "";
    const model = entries.get(id);
    if (model) callbacks.onSelectEntry?.(id, day?.dataset.dayKey ?? "", model, native);
    return true;
  };

  const selectDay = (target: HTMLElement | null): boolean => {
    const node = target?.closest<HTMLElement>("[data-more-day], [data-day-key]");
    const dayKey = node?.dataset.moreDay ?? node?.dataset.dayKey;
    if (!dayKey) return false;
    callbacks.onSelectDay?.(dayKey);
    return true;
  };

  const onClick = (native: MouseEvent) => {
    const target = native.target as HTMLElement | null;
    if (!selectEntry(target, native)) selectDay(target);
  };
  const onKeyDown = (native: KeyboardEvent) => {
    if (!isActivationKey(native)) return;
    const target = native.target as HTMLElement | null;
    if (!(selectEntry(target, native) || selectDay(target))) return;
    native.preventDefault();
  };

  root.addEventListener("click", onClick);
  root.addEventListener("keydown", onKeyDown);
  setRenderCleanup(root, () => {
    root.removeEventListener("click", onClick);
    root.removeEventListener("keydown", onKeyDown);
  });
}
