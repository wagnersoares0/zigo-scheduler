import {
  AgendaElementDragging,
  AgendaEventResizing,
  type HitTestResult,
} from "@zigoschedule/scheduler-interaction";
import type { AgendaLayout, AgendaLayoutEvent } from "@zigoschedule/scheduler-layout";
import { el, px } from "./dom";

export type GestureCallbacks = {
  /** Fired after a card is dropped somewhere new. */
  onMove?: (change: {
    id: string;
    dayKey: string;
    professionalId: string | null;
    startMinute: number;
    durationMinutes: number;
  }) => boolean | void;
  /** Fired after a card's edge is released. */
  onResize?: (change: {
    id: string;
    dayKey: string;
    direction: "start" | "end";
    startMinute: number;
    endMinute: number;
  }) => boolean | void;
};

/**
 * Handle the user grabs to resize.
 *
 * `AgendaElementDragging` refuses to start a drag on anything matching this
 * selector. The renderer and interaction layer must therefore agree on the same
 * attribute, or grabbing the resize handle starts a drag instead of a resize.
 */
export const RESIZE_HANDLE_ATTR = "data-ag-resize-handle";

/**
 * A pointer release after a drag also fires a click, which would open the
 * appointment the user just moved. This flag lets the click handler skip the
 * one that follows a gesture.
 */
const gesturesJustEnded = new WeakSet<HTMLElement>();

export const consumeGestureClick = (scope: HTMLElement): boolean => {
  if (!gesturesJustEnded.has(scope)) return false;
  gesturesJustEnded.delete(scope);
  return true;
};

export const markGestureEnd = (scope: HTMLElement): void => {
  gesturesJustEnded.add(scope);
  // Cleared on the next frame: the click follows immediately, anything later is
  // a genuine click.
  setTimeout(() => {
    gesturesJustEnded.delete(scope);
  }, 0);
};

/**
 * Live preview while a gesture is in flight.
 *
 * The interaction package deliberately draws nothing: it reports where the
 * pointer is and leaves the picture to the host. Without this the card sits
 * still under the cursor and the calendar looks broken, which is exactly how it
 * looked before this existed.
 *
 * Drawn inside the canvas, not on `document.body`: a clone appended to the
 * light DOM loses every style in the shadow root and comes out invisible.
 */
const showPreview = (
  canvas: HTMLElement,
  layout: AgendaLayout,
  columnKey: string,
  startMinute: number,
  endMinute: number,
  color: string
): void => {
  const column = layout.columns.find((candidate) => candidate.key === columnKey);
  if (!column) return;

  let ghost = canvas.querySelector<HTMLElement>(".za-ghost");
  if (!ghost) {
    ghost = el("div", "za-ghost");
    canvas.appendChild(ghost);
  }

  const top = layout.minuteToY(startMinute);
  ghost.style.top = px(top);
  ghost.style.height = px(Math.max(6, layout.minuteToY(endMinute) - top));
  ghost.style.left = px(column.left - layout.axisWidth);
  ghost.style.width = px(column.width);
  ghost.style.borderColor = color;
  ghost.style.background = `${color}22`;
};

const hidePreview = (canvas: HTMLElement): void => {
  canvas.querySelector(".za-ghost")?.remove();
};

/**
 * Wires dragging and resizing onto the cards.
 *
 * The gestures come from `@zigoschedule/scheduler-interaction`, which knows nothing about
 * React or about this renderer; it was written against pointer events and a
 * hit-test function. Feeding it `layout.hitTest` is all it takes, which is the
 * payoff of having kept the interaction layer framework-free.
 */
export function attachGestures(
  canvas: HTMLElement,
  scroller: HTMLElement,
  layout: AgendaLayout,
  events: Map<string, AgendaLayoutEvent>,
  callbacks: GestureCallbacks
): () => void {
  const disposers: Array<() => void> = [];
  /** Client coordinates to a grid position, via the layout's own hit test. */
  const hitTest = (clientX: number, clientY: number): HitTestResult | null => {
    const bounds = canvas.getBoundingClientRect();
    const hit = layout.hitTest(
      clientX - bounds.left + layout.axisWidth,
      clientY - bounds.top
    );
    if (!hit) return null;
    return { dayKey: hit.dayKey, minute: hit.minute, profId: hit.professionalId };
  };

  const shared = {
    getScrollContainer: () => scroller,
    hitTest,
  };

  for (const card of canvas.querySelectorAll<HTMLElement>("[data-event-id]")) {
    const event = events.get(card.dataset.eventId ?? "");
    if (!event || event.kind !== "appointment") continue;

    const dragging = new AgendaElementDragging(
      card,
      {
        agId: event.id,
        startMinute: event.startMinute,
        durationMinutes: event.endMinute - event.startMinute,
        profId: event.professionalId,
        dayKey: event.dayKey,
      },
      {
        ...shared,
        onDragStart: () => card.classList.add("za-dragging"),
        onDragMove: (payload, hit, nextStartMinute) => {
          if (!hit) return hidePreview(canvas);
          showPreview(
            canvas,
            layout,
            hit.profId ? `${hit.dayKey}-${hit.profId}` : hit.dayKey,
            nextStartMinute,
            nextStartMinute + payload.durationMinutes,
            event.color
          );
        },
        onDrop: (result) => {
          card.classList.remove("za-dragging");
          hidePreview(canvas);
          markGestureEnd(canvas);
          callbacks.onMove?.({
            id: result.agId,
            dayKey: result.newDayKey,
            professionalId: result.profId,
            startMinute: result.newMinute,
            durationMinutes: result.durationMinutes,
          });
        },
        onDragCancel: () => {
          card.classList.remove("za-dragging");
          hidePreview(canvas);
          markGestureEnd(canvas);
        },
      }
    );
    disposers.push(() => dragging.destroy());

    const handle = card.querySelector<HTMLElement>(`[${RESIZE_HANDLE_ATTR}]`);
    if (!handle) continue;

    const resizing = new AgendaEventResizing(
      handle,
      {
        agId: event.id,
        dayKey: event.dayKey,
        profId: event.professionalId,
        startMinute: event.startMinute,
        endMinute: event.endMinute,
        snapMinutes: layout.stepMinutes,
        direction: "end",
      },
      {
        ...shared,
        onResizeMove: (payload, _hit, nextBoundaryMinute) => {
          const from = payload.direction === "start" ? nextBoundaryMinute : payload.startMinute;
          const to = payload.direction === "start" ? payload.endMinute : nextBoundaryMinute;
          if (to <= from) return;
          const top = layout.minuteToY(from);
          card.style.top = px(top);
          card.style.height = px(Math.max(18, layout.minuteToY(to) - top));
        },
        onResizeEnd: (result) => {
          markGestureEnd(canvas);
          const accepted = callbacks.onResize?.({
            id: result.agId,
            dayKey: result.dayKey,
            direction: result.direction,
            startMinute: result.newStartMinute,
            endMinute: result.newEndMinute,
          });
          if (accepted === false) {
            card.style.top = px(event.top);
            card.style.height = px(Math.max(18, event.height));
          }
        },
        onResizeCancel: () => {
          // Put the card back where it was; the next render redraws it anyway.
          card.style.top = px(event.top);
          card.style.height = px(Math.max(18, event.height));
          markGestureEnd(canvas);
        },
      }
    );
    disposers.push(() => resizing.destroy());
  }

  return () => {
    hidePreview(canvas);
    while (disposers.length) disposers.pop()?.();
  };
}
