// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgendaElementDragging, type DraggableCallbacks } from "../AgendaElementDragging";
import { AgendaEventResizing, type ResizableCallbacks } from "../AgendaEventResizing";

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

const installPointerCapture = (el: HTMLElement) => {
  el.setPointerCapture = vi.fn();
  el.releasePointerCapture = vi.fn();
  el.hasPointerCapture = vi.fn(() => true);
};

let el: HTMLElement;
let handle: HTMLElement;

beforeEach(() => {
  vi.useFakeTimers();
  el = document.createElement("button");
  handle = document.createElement("span");
  handle.setAttribute("data-ag-resize-handle", "");
  el.appendChild(handle);
  el.getBoundingClientRect = vi.fn(
    () =>
      ({
        left: 100,
        top: 200,
        width: 160,
        height: 48,
        right: 260,
        bottom: 248,
        x: 100,
        y: 200,
        toJSON: () => ({}),
      }) as DOMRect
  );
  document.body.appendChild(el);
  installPointerCapture(el);
  installPointerCapture(handle);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("AgendaElementDragging", () => {
  it("fires one drop for one completed drag, even if the release event repeats", () => {
    const onDrop = vi.fn();
    const callbacks: DraggableCallbacks = {
      getScrollContainer: () => null,
      hitTest: (_x, y) => ({ dayKey: "2026-08-10", minute: y, profId: "ana" }),
      onDrop,
    };
    const dragging = new AgendaElementDragging(
      el,
      {
        agId: "ag-1",
        dayKey: "2026-08-10",
        profId: "ana",
        startMinute: 600,
        durationMinutes: 60,
      },
      callbacks
    );

    el.dispatchEvent(pointer("pointerdown", { x: 120, y: 220 }));
    document.dispatchEvent(pointer("pointermove", { x: 120, y: 250 }));
    document.dispatchEvent(pointer("pointerup", { x: 120, y: 280 }));
    document.dispatchEvent(pointer("pointerup", { x: 120, y: 310 }));

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onDrop).toHaveBeenCalledWith(
      expect.objectContaining({
        agId: "ag-1",
        oldMinute: 600,
        newMinute: 660,
        newDayKey: "2026-08-10",
        profId: "ana",
        durationMinutes: 60,
      })
    );
    dragging.destroy();
  });

  it("uses the element ownerDocument when rendered through an iframe or portal", () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const frameDocument = frame.contentDocument!;
    const frameEl = frameDocument.createElement("button");
    frameEl.getBoundingClientRect = el.getBoundingClientRect;
    frameDocument.body.appendChild(frameEl);
    installPointerCapture(frameEl);

    const onDrop = vi.fn();
    const dragging = new AgendaElementDragging(
      frameEl,
      {
        agId: "ag-frame",
        dayKey: "2026-08-10",
        profId: null,
        startMinute: 540,
        durationMinutes: 30,
      },
      {
        getScrollContainer: () => null,
        hitTest: (_x, y) => ({ dayKey: "2026-08-10", minute: y, profId: null }),
        onDrop,
      }
    );

    frameEl.dispatchEvent(pointer("pointerdown", { x: 120, y: 220 }));
    frameDocument.dispatchEvent(pointer("pointermove", { x: 120, y: 250 }));
    frameDocument.dispatchEvent(pointer("pointerup", { x: 120, y: 280 }));

    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(frameDocument.body.querySelector("[style*='position: fixed']")).toBeNull();
    dragging.destroy();
    frame.remove();
  });
});

describe("AgendaEventResizing", () => {
  it("fires one resize end for one completed resize, even if the release event repeats", () => {
    const onResizeEnd = vi.fn();
    const callbacks: ResizableCallbacks = {
      getScrollContainer: () => null,
      hitTest: (_x, y) => ({ dayKey: "2026-08-10", minute: y, profId: "ana" }),
      onResizeEnd,
    };
    const resizing = new AgendaEventResizing(
      handle,
      {
        agId: "ag-1",
        dayKey: "2026-08-10",
        profId: "ana",
        startMinute: 600,
        endMinute: 660,
        snapMinutes: 30,
        direction: "end",
      },
      callbacks
    );

    handle.dispatchEvent(pointer("pointerdown", { x: 120, y: 660 }));
    document.dispatchEvent(pointer("pointermove", { x: 120, y: 720 }));
    document.dispatchEvent(pointer("pointerup", { x: 120, y: 750 }));
    document.dispatchEvent(pointer("pointerup", { x: 120, y: 780 }));

    expect(onResizeEnd).toHaveBeenCalledTimes(1);
    expect(onResizeEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        agId: "ag-1",
        oldEndMinute: 660,
        newEndMinute: 750,
      })
    );
    resizing.destroy();
  });
});
