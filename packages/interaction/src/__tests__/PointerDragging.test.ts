// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PointerDragging, type PointerDragCallbacks } from "../PointerDragging";

/**
 * The threshold and the long-press delay are the two things that make dragging
 * feel right: without a threshold every click becomes a drag, and without the
 * delay on touch the calendar cannot be scrolled with a finger.
 */

const DRAG_THRESHOLD_PX = 5;

let el: HTMLElement;
let events: Array<{ type: string; x: number; y: number; dx?: number; dy?: number; canceled?: boolean }>;
let cbs: PointerDragCallbacks;

const pointer = (
  type: string,
  init: { x?: number; y?: number; id?: number; pointerType?: string; button?: number } = {}
) =>
  new PointerEvent(type, {
    pointerId: init.id ?? 1,
    pointerType: init.pointerType ?? "mouse",
    clientX: init.x ?? 0,
    clientY: init.y ?? 0,
    button: init.button ?? 0,
    bubbles: true,
    cancelable: true,
  });

beforeEach(() => {
  vi.useFakeTimers();
  el = document.createElement("div");
  document.body.appendChild(el);
  // happy-dom does not implement pointer capture.
  el.setPointerCapture = vi.fn();
  el.releasePointerCapture = vi.fn();
  el.hasPointerCapture = vi.fn(() => true);

  events = [];
  cbs = {
    onDragStart: (e) => events.push({ type: "start", x: e.x, y: e.y }),
    onDragMove: (e) => events.push({ type: "move", x: e.x, y: e.y, dx: e.dx, dy: e.dy }),
    onDragEnd: (e) => events.push({ type: "end", x: e.x, y: e.y, canceled: e.canceled }),
  };
});

afterEach(() => {
  el.remove();
  vi.useRealTimers();
});

describe("mouse dragging", () => {
  it("does not start until the pointer moves past the threshold", () => {
    const dragging = new PointerDragging(el, cbs);
    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100 }));

    el.dispatchEvent(pointer("pointermove", { x: 100 + DRAG_THRESHOLD_PX - 1, y: 100 }));
    expect(events).toHaveLength(0);

    el.dispatchEvent(pointer("pointermove", { x: 100 + DRAG_THRESHOLD_PX + 1, y: 100 }));
    expect(events.map((e) => e.type)).toEqual(["start", "move"]);
    dragging.destroy();
  });

  it("reports movement relative to where the press began", () => {
    const dragging = new PointerDragging(el, cbs);
    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100 }));
    el.dispatchEvent(pointer("pointermove", { x: 130, y: 150 }));

    const move = events.find((e) => e.type === "move");
    expect(move).toMatchObject({ x: 130, y: 150, dx: 30, dy: 50 });
    dragging.destroy();
  });

  it("emits no end event when the pointer never dragged", () => {
    // A plain click must stay a click.
    const dragging = new PointerDragging(el, cbs);
    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100 }));
    el.dispatchEvent(pointer("pointerup", { x: 100, y: 100 }));
    expect(events).toHaveLength(0);
    dragging.destroy();
  });

  it("emits end after a real drag", () => {
    const dragging = new PointerDragging(el, cbs);
    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100 }));
    el.dispatchEvent(pointer("pointermove", { x: 140, y: 100 }));
    el.dispatchEvent(pointer("pointerup", { x: 140, y: 100 }));

    expect(events.at(-1)).toMatchObject({ type: "end", x: 140, canceled: false });
    dragging.destroy();
  });

  it("flags a cancelled pointer so the caller can revert", () => {
    const dragging = new PointerDragging(el, cbs);
    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100 }));
    el.dispatchEvent(pointer("pointermove", { x: 140, y: 100 }));
    el.dispatchEvent(pointer("pointercancel", { x: 140, y: 100 }));

    expect(events.at(-1)).toMatchObject({ type: "end", canceled: true });
    dragging.destroy();
  });

  it("ignores non-primary mouse buttons", () => {
    const dragging = new PointerDragging(el, cbs);
    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100, button: 2 }));
    el.dispatchEvent(pointer("pointermove", { x: 140, y: 100 }));
    expect(events).toHaveLength(0);
    dragging.destroy();
  });

  it("ignores a second pointer while one is already down", () => {
    const dragging = new PointerDragging(el, cbs);
    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100, id: 1 }));
    el.dispatchEvent(pointer("pointerdown", { x: 300, y: 300, id: 2 }));
    el.dispatchEvent(pointer("pointermove", { x: 340, y: 300, id: 2 }));
    expect(events).toHaveLength(0);
    dragging.destroy();
  });

  it("does not start on an element matching ignoreStartSelector", () => {
    const handle = document.createElement("span");
    handle.setAttribute("data-resize-handle", "");
    el.appendChild(handle);

    const dragging = new PointerDragging(el, { ...cbs, ignoreStartSelector: "[data-resize-handle]" });
    const ev = pointer("pointerdown", { x: 100, y: 100 });
    handle.dispatchEvent(ev);
    el.dispatchEvent(pointer("pointermove", { x: 140, y: 100 }));

    expect(events).toHaveLength(0);
    dragging.destroy();
  });

  it("honours ignoreStartSelector for elements from another document", () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const frameDocument = frame.contentDocument!;
    const frameEl = frameDocument.createElement("div");
    const handle = frameDocument.createElement("span");
    handle.setAttribute("data-resize-handle", "");
    frameEl.appendChild(handle);
    frameDocument.body.appendChild(frameEl);
    frameEl.setPointerCapture = vi.fn();
    frameEl.releasePointerCapture = vi.fn();
    frameEl.hasPointerCapture = vi.fn(() => true);

    const dragging = new PointerDragging(frameEl, { ...cbs, ignoreStartSelector: "[data-resize-handle]" });
    handle.dispatchEvent(pointer("pointerdown", { x: 100, y: 100 }));
    frameDocument.dispatchEvent(pointer("pointermove", { x: 140, y: 100 }));

    expect(events).toHaveLength(0);
    dragging.destroy();
    frame.remove();
  });
});

describe("touch dragging", () => {
  const touchOpts = { pointerType: "touch" as const };

  it("waits for the long press before starting", () => {
    const dragging = new PointerDragging(el, { ...cbs, longPressDelay: 1000 });
    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100, ...touchOpts }));

    vi.advanceTimersByTime(999);
    expect(events).toHaveLength(0);

    vi.advanceTimersByTime(1);
    expect(events.map((e) => e.type)).toEqual(["start", "move"]);
    dragging.destroy();
  });

  it("cancels the long press if the finger moves first", () => {
    // This is what lets the user scroll the calendar instead of dragging a card.
    const dragging = new PointerDragging(el, { ...cbs, longPressDelay: 1000 });
    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100, ...touchOpts }));
    el.dispatchEvent(pointer("pointermove", { x: 140, y: 100, ...touchOpts }));

    vi.advanceTimersByTime(2000);
    expect(events).toHaveLength(0);
    dragging.destroy();
  });

  it("relaxes touch-action so the browser does not swallow the gesture", () => {
    el.style.touchAction = "none";
    const dragging = new PointerDragging(el, { ...cbs, longPressDelay: 1000 });
    expect(el.style.touchAction).toBe("pan-x pan-y");

    dragging.destroy();
    expect(el.style.touchAction).toBe("none");
  });
});

describe("teardown", () => {
  it("stops responding after destroy", () => {
    const dragging = new PointerDragging(el, cbs);
    dragging.destroy();

    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100 }));
    el.dispatchEvent(pointer("pointermove", { x: 140, y: 100 }));
    expect(events).toHaveLength(0);
  });

  it("clears a pending long-press timer on destroy", () => {
    const dragging = new PointerDragging(el, { ...cbs, longPressDelay: 1000 });
    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100, pointerType: "touch" }));
    dragging.destroy();

    vi.advanceTimersByTime(2000);
    expect(events).toHaveLength(0);
  });

  it("can start a fresh drag after the previous one ended", () => {
    const dragging = new PointerDragging(el, cbs);
    el.dispatchEvent(pointer("pointerdown", { x: 100, y: 100 }));
    el.dispatchEvent(pointer("pointermove", { x: 140, y: 100 }));
    el.dispatchEvent(pointer("pointerup", { x: 140, y: 100 }));
    events = [];

    el.dispatchEvent(pointer("pointerdown", { x: 200, y: 200 }));
    el.dispatchEvent(pointer("pointermove", { x: 240, y: 200 }));
    expect(events.map((e) => e.type)).toEqual(["start", "move"]);
    dragging.destroy();
  });

  it("listens on the element ownerDocument for iframe and portal renders", () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const frameDocument = frame.contentDocument!;
    const frameEl = frameDocument.createElement("div");
    frameDocument.body.appendChild(frameEl);
    frameEl.setPointerCapture = vi.fn();
    frameEl.releasePointerCapture = vi.fn();
    frameEl.hasPointerCapture = vi.fn(() => true);

    const dragging = new PointerDragging(frameEl, cbs);
    frameEl.dispatchEvent(pointer("pointerdown", { x: 100, y: 100 }));
    frameDocument.dispatchEvent(pointer("pointermove", { x: 140, y: 100 }));
    frameDocument.dispatchEvent(pointer("pointerup", { x: 140, y: 100 }));

    expect(events.map((e) => e.type)).toEqual(["start", "move", "end"]);
    dragging.destroy();
    frame.remove();
  });
});
