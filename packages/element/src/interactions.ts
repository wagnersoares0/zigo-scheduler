import type { AgendaLayout, AgendaLayoutEvent, AgendaLayoutHit } from "@zigoschedule/scheduler-layout";
import { consumeGestureClick } from "./gestures";

export type AgendaCallbacks = {
  onSelectEvent?: (event: AgendaLayoutEvent, native: MouseEvent) => void;
  onSelectSlot?: (hit: AgendaLayoutHit, native: MouseEvent) => void;
};

/**
 * One listener for the whole grid instead of one per card.
 *
 * A busy week renders hundreds of boxes and the click always resolves to the
 * same two cases: it landed on a card, or it landed on empty time.
 */
export const attachInteractions = (
  canvas: HTMLElement,
  layout: AgendaLayout,
  events: Map<string, AgendaLayoutEvent>,
  callbacks: AgendaCallbacks
): void => {
  canvas.addEventListener("click", (native) => {
    // A drag or resize ends with a click; opening the appointment the user just
    // moved would be the opposite of what they asked for.
    if (consumeGestureClick()) return;

    const target = native.target as HTMLElement | null;
    const card = target?.closest("[data-event-id]") as HTMLElement | null;

    if (card) {
      const event = events.get(card.dataset.eventId ?? "");
      if (event) callbacks.onSelectEvent?.(event, native);
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    const hit = layout.hitTest(
      native.clientX - bounds.left + layout.axisWidth,
      native.clientY - bounds.top
    );
    if (hit) callbacks.onSelectSlot?.(hit, native);
  });
};

/**
 * The header does not scroll vertically, so it has to follow horizontally by
 * hand; otherwise the column titles drift away from their columns.
 */
export const syncHeaderScroll = (scroller: HTMLElement, headerTrack: HTMLElement): void => {
  scroller.addEventListener("scroll", () => {
    headerTrack.style.transform = `translateX(${-scroller.scrollLeft}px)`;
  });
};
