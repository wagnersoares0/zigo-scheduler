// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ElementMirror } from "../ElementMirror";

/**
 * The mirror is the element that follows the cursor while dragging. It is a
 * clone, so the original card stays in place until the drop is confirmed —
 * which is what lets a cancelled drag revert without touching real data.
 */

const RECT = { left: 100, top: 200, width: 120, height: 40 };

let source: HTMLElement;

const mirrorEl = (): HTMLElement | null =>
  (Array.from(document.body.children).find((child) => child !== source) as HTMLElement) ?? null;

beforeEach(() => {
  vi.useFakeTimers();
  source = document.createElement("div");
  source.textContent = "Maria Souza";
  source.getBoundingClientRect = vi.fn(
    () =>
      ({
        ...RECT,
        right: RECT.left + RECT.width,
        bottom: RECT.top + RECT.height,
        x: RECT.left,
        y: RECT.top,
        toJSON: () => ({}),
      }) as DOMRect
  );
  document.body.appendChild(source);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("start", () => {
  it("appends a clone of the source to the body", () => {
    const mirror = new ElementMirror();
    mirror.start(source, 150, 220);

    const clone = mirrorEl();
    expect(clone).not.toBeNull();
    expect(clone?.textContent).toBe("Maria Souza");
    mirror.end();
  });

  it("positions the clone over the source and takes it out of the layout", () => {
    const mirror = new ElementMirror();
    mirror.start(source, 150, 220);

    const clone = mirrorEl()!;
    expect(clone.style.position).toBe("fixed");
    expect(clone.style.left).toBe("100px");
    expect(clone.style.top).toBe("200px");
    expect(clone.style.width).toBe("120px");
    // The clone must never intercept the pointer, or the drop target is wrong.
    expect(clone.style.pointerEvents).toBe("none");
    mirror.end();
  });

  it("can start hidden", () => {
    const mirror = new ElementMirror();
    mirror.start(source, 150, 220, false);
    expect(mirrorEl()?.style.display).toBe("none");
    mirror.end();
  });

  it("replaces a previous mirror instead of stacking clones", () => {
    const mirror = new ElementMirror();
    mirror.start(source, 150, 220);
    mirror.start(source, 150, 220);
    expect(document.body.children).toHaveLength(2); // source + one mirror
    mirror.end();
  });

  it("appends the clone to the source ownerDocument", () => {
    const frame = document.createElement("iframe");
    document.body.appendChild(frame);
    const frameDocument = frame.contentDocument!;
    const frameSource = frameDocument.createElement("div");
    frameSource.textContent = "Dentro do iframe";
    frameSource.getBoundingClientRect = vi.fn(
      () =>
        ({
          ...RECT,
          right: RECT.left + RECT.width,
          bottom: RECT.top + RECT.height,
          x: RECT.left,
          y: RECT.top,
          toJSON: () => ({}),
        }) as DOMRect
    );
    frameDocument.body.appendChild(frameSource);

    const mirror = new ElementMirror();
    mirror.start(frameSource, 150, 220);

    expect(frameDocument.body.children).toHaveLength(2);
    expect(document.body.children).toHaveLength(2); // source + iframe
    mirror.end();
    frame.remove();
  });
});

describe("move", () => {
  it("keeps the grab point under the cursor", () => {
    const mirror = new ElementMirror();
    // Grabbed 50px right and 20px down from the card's top-left corner.
    mirror.start(source, 150, 220);
    mirror.move(300, 400);

    const clone = mirrorEl()!;
    expect(clone.style.left).toBe("250px"); // 300 - 50
    expect(clone.style.top).toBe("380px"); // 400 - 20
    mirror.end();
  });

  it("does nothing when there is no mirror", () => {
    const mirror = new ElementMirror();
    expect(() => mirror.move(300, 400)).not.toThrow();
  });
});

describe("setVisible", () => {
  it("toggles the clone without destroying it", () => {
    const mirror = new ElementMirror();
    mirror.start(source, 150, 220);

    mirror.setVisible(false);
    expect(mirrorEl()?.style.display).toBe("none");

    mirror.setVisible(true);
    expect(mirrorEl()?.style.display).toBe("");
    mirror.end();
  });
});

describe("end", () => {
  it("removes the clone immediately", () => {
    const mirror = new ElementMirror();
    mirror.start(source, 150, 220);
    mirror.end();
    expect(mirrorEl()).toBeNull();
  });

  it("animates back before removing when reverting", () => {
    const mirror = new ElementMirror();
    mirror.start(source, 150, 220);
    mirror.move(600, 600);
    mirror.end({ revert: true });

    // Still on screen, animating home
    const clone = mirrorEl()!;
    expect(clone).not.toBeNull();
    expect(clone.style.left).toBe("100px");
    expect(clone.style.top).toBe("200px");
    expect(clone.style.transition).toContain("left");

    vi.advanceTimersByTime(200);
    expect(mirrorEl()).toBeNull();
  });

  it("is safe to call twice", () => {
    const mirror = new ElementMirror();
    mirror.start(source, 150, 220);
    mirror.end();
    expect(() => mirror.end()).not.toThrow();
    expect(mirrorEl()).toBeNull();
  });

  it("cancels a pending revert when called again", () => {
    const mirror = new ElementMirror();
    mirror.start(source, 150, 220);
    mirror.end({ revert: true });
    mirror.end();

    expect(mirrorEl()).toBeNull();
    vi.advanceTimersByTime(500);
    expect(mirrorEl()).toBeNull();
  });
});

describe("revertTo", () => {
  it("animates home and then removes the clone", () => {
    const mirror = new ElementMirror();
    mirror.start(source, 150, 220);
    mirror.move(600, 600);
    mirror.revertTo(250);

    expect(mirrorEl()).not.toBeNull();
    vi.advanceTimersByTime(250);
    expect(mirrorEl()).toBeNull();
  });

  it("falls back to removing when there is nothing to animate", () => {
    const mirror = new ElementMirror();
    expect(() => mirror.revertTo()).not.toThrow();
    expect(mirrorEl()).toBeNull();
  });
});
