import type { AgendaLayout, AgendaLayoutHit } from "@zigoschedule/scheduler-layout";
import { el, px } from "./dom";
import { markGestureEnd } from "./gestures";

export type RangeSelection = {
  columnKey: string;
  dayKey: string;
  professionalId: string | null;
  startMinute: number;
  endMinute: number;
};

const MIN_DRAG_PX = 4;

/**
 * Drag across empty time to propose a new appointment.
 *
 * The gesture only arms on empty space: starting it on a card would fight the
 * drag-to-move. It paints a live band while the pointer is down and reports the
 * range once, on release.
 */
export function attachRangeSelection(
  canvas: HTMLElement,
  layout: AgendaLayout,
  onSelectRange: (range: RangeSelection) => void
): () => void {
  let anchor: AgendaLayoutHit | null = null;
  let band: HTMLElement | null = null;
  let moved = false;

  const hitAt = (event: PointerEvent): AgendaLayoutHit | null => {
    const bounds = canvas.getBoundingClientRect();
    return layout.hitTest(
      event.clientX - bounds.left + layout.axisWidth,
      event.clientY - bounds.top
    );
  };

  const paint = (from: number, to: number, columnKey: string) => {
    const column = layout.columns.find((candidate) => candidate.key === columnKey);
    if (!column) return;
    if (!band) {
      band = el("div", "za-band");
      canvas.appendChild(band);
    }
    const top = layout.minuteToY(Math.min(from, to));
    const bottom = layout.minuteToY(Math.max(from, to) + layout.stepMinutes);
    band.style.top = px(top);
    band.style.height = px(Math.max(2, bottom - top));
    band.style.left = px(column.left - layout.axisWidth);
    band.style.width = px(column.width);
  };

  const clear = () => {
    band?.remove();
    band = null;
    anchor = null;
    moved = false;
  };

  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-event-id]")) return;

    anchor = hitAt(event);
    moved = false;
    if (anchor) canvas.setPointerCapture(event.pointerId);
  };

  const onMove = (event: PointerEvent) => {
    if (!anchor) return;
    const hit = hitAt(event);
    // Same column only: dragging sideways would mean two professionals at once.
    if (!hit || hit.columnKey !== anchor.columnKey) return;
    if (hit.minute !== anchor.minute) moved = true;
    paint(anchor.minute, hit.minute, anchor.columnKey);
  };

  const onUp = (event: PointerEvent) => {
    if (!anchor) return;
    const hit = hitAt(event);
    const start = anchor;
    const wasDrag = moved;
    clear();

    if (!wasDrag || !hit || hit.columnKey !== start.columnKey) return;

    // Same reason as a drag: the pointer release fires a click, which would then
    // be read as "clicked an empty slot" and overwrite what the user just did.
    markGestureEnd(canvas);

    const from = Math.min(start.minute, hit.minute);
    const to = Math.max(start.minute, hit.minute) + layout.stepMinutes;
    onSelectRange({
      columnKey: start.columnKey,
      dayKey: start.dayKey,
      professionalId: start.professionalId,
      startMinute: from,
      endMinute: to,
    });
  };

  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp);
  canvas.addEventListener("pointercancel", clear);

  return () => {
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", clear);
    clear();
  };
}

export { MIN_DRAG_PX };
