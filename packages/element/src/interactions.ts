import type { AgendaLayout, AgendaLayoutEvent, AgendaLayoutHit } from "@zigoschedule/scheduler-layout";
import { consumeGestureClick } from "./gestures";

type SelectEventNative = MouseEvent | KeyboardEvent;

export type AgendaCallbacks = {
  onSelectEvent?: (event: AgendaLayoutEvent, native: SelectEventNative) => void;
  onSelectSlot?: (hit: AgendaLayoutHit, native: MouseEvent) => void;
};

const isActivationKey = (native: KeyboardEvent): boolean =>
  native.key === "Enter" || native.key === " ";

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
  const selectCard = (native: SelectEventNative): boolean => {
    const target = native.target as HTMLElement | null;
    const card = target?.closest("[data-event-id]") as HTMLElement | null;

    if (!card) return false;

    const event = events.get(card.dataset.eventId ?? "");
    if (event) callbacks.onSelectEvent?.(event, native);
    return true;
  };

  canvas.addEventListener("click", (native) => {
    // A drag or resize ends with a click; opening the appointment the user just
    // moved would be the opposite of what they asked for.
    if (consumeGestureClick()) return;

    if (selectCard(native)) return;

    const bounds = canvas.getBoundingClientRect();
    const hit = layout.hitTest(
      native.clientX - bounds.left + layout.axisWidth,
      native.clientY - bounds.top
    );
    if (hit) callbacks.onSelectSlot?.(hit, native);
  });

  canvas.addEventListener("keydown", (native) => {
    if (!isActivationKey(native)) return;
    if (!selectCard(native)) return;
    native.preventDefault();
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
