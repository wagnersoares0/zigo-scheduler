import type { AgendaLayout, AgendaLayoutEvent } from "@zigoschedule/scheduler-layout";
import type { Professional } from "@zigoschedule/scheduler-engine";
import { getAgendaMessages, type AgendaMessages } from "@zigoschedule/scheduler-core";
import { el, px } from "./dom";
import { attachGestures, releaseGestures, type GestureCallbacks } from "./gestures";
import { attachRangeSelection, type RangeSelection } from "./selection";
import { attachInteractions, syncHeaderScroll, type AgendaCallbacks } from "./interactions";
import { buildAxis } from "./parts/axis";
import { buildEventCard } from "./parts/event-card";
import { buildGridLines } from "./parts/grid-lines";
import { buildHeader } from "./parts/header";
import { buildUnavailable } from "./parts/unavailable";

/**
 * Draws a calendar from the render model, using nothing but `document`.
 *
 * This module is the proof that `buildAgendaLayout` is enough: no framework
 * anywhere. Anyone on Vue, Svelte, Alpine or a server-rendered page can write
 * the equivalent for their own stack by reading it.
 */
export function renderAgenda(
  root: HTMLElement,
  layout: AgendaLayout,
  callbacks: AgendaCallbacks &
    GestureCallbacks & {
      onSelectRange?: (range: RangeSelection) => void;
      /** Minute to scroll into view on first paint. */
      scrollToMinute?: number;
      /** Used only to put a face on the column headers. */
      professionals?: Professional[];
      messages?: AgendaMessages;
    } = {}
): void {
  // Every render rebuilds the DOM, so the gestures bound to the old nodes
  // have to be released or their listeners leak.
  releaseGestures();

  // Preserve the user's scroll position before replacing the DOM.
  const prev = root.querySelector<HTMLElement>(".za-scroller");
  const first = prev === null;
  const prevTop = prev?.scrollTop ?? 0;

  root.textContent = "";
  root.classList.add("za-root");

  const messages = callbacks.messages ?? getAgendaMessages();
  const header = buildHeader(layout, callbacks.professionals, messages);
  root.appendChild(header);

  const scroller = el("div", "za-scroller");
  const surface = el("div", "za-surface");
  surface.style.width = px(layout.totalWidth);
  surface.style.height = px(layout.totalHeight);
  surface.appendChild(buildAxis(layout));

  const canvas = el("div", "za-canvas");
  canvas.style.left = px(layout.axisWidth);
  canvas.style.width = px(layout.totalWidth - layout.axisWidth);
  canvas.style.height = px(layout.totalHeight);
  canvas.appendChild(buildGridLines(layout));

  const columns = new Map(layout.columns.map((column) => [column.key, column]));
  for (const block of layout.unavailable) {
    const column = columns.get(block.columnKey);
    if (column) canvas.appendChild(buildUnavailable(layout, block, column));
  }

  const events = new Map<string, AgendaLayoutEvent>();
  for (const event of layout.events) {
    events.set(event.id, event);
    canvas.appendChild(buildEventCard(layout, event));
  }

  attachInteractions(canvas, layout, events, callbacks);

  surface.appendChild(canvas);
  scroller.appendChild(surface);
  root.appendChild(scroller);

  attachGestures(canvas, scroller, layout, events, callbacks);
  if (callbacks.onSelectRange) {
    attachRangeSelection(canvas, layout, callbacks.onSelectRange);
  }

  const track = header.querySelector(".za-header-track");
  if (track instanceof HTMLElement) syncHeaderScroll(scroller, track);

  // Opening the calendar at midnight when the business starts later wastes the
  // first screen. This should happen only on the first paint: applying it after
  // every redraw made the grid jump back while a card was being dragged or
  // resized, pushing the card out of view mid-gesture.
  //
  // On later redraws, keeping the user's current scroll position matters more.
  // Run on the next frame, after the grid has a real `scrollHeight`.
  const target = first
    ? typeof callbacks.scrollToMinute === "number"
      ? layout.minuteToY(callbacks.scrollToMinute)
      : null
    : prevTop;

  if (target !== null) {
    requestAnimationFrame(() => {
      const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      scroller.scrollTop = Math.max(0, Math.min(max, target));
    });
  }
}
