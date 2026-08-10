// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AutoScroller } from "../AutoScroller";

/**
 * When the user drags a card towards the edge of the calendar, the grid has to
 * scroll on its own — otherwise nothing below the fold is reachable without
 * dropping the card first.
 *
 * Velocity ramps up linearly as the pointer gets closer to the edge, which reads
 * as "the closer you push, the faster it goes".
 */

const SCROLL_ZONE_PX = 64;
const VIEWPORT = { left: 0, top: 0, width: 800, height: 600 };

let scrollEl: HTMLElement;
let rafCallbacks: FrameRequestCallback[];

/**
 * Controlled clock. `AutoScroller` reads `performance.now()` to measure the gap
 * between frames, so the test has to own both the clock and the frame loop —
 * otherwise the first frame computes a delta against real wall time.
 */
const clock = { value: 0 };

/** Runs every pending animation frame, `ms` after the previous one. */
const advanceFrame = (ms: number) => {
  clock.value += ms;
  const pending = rafCallbacks;
  rafCallbacks = [];
  pending.forEach((cb) => cb(clock.value));
};

beforeEach(() => {
  rafCallbacks = [];
  clock.value = 0;
  vi.stubGlobal("performance", { now: () => clock.value });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    rafCallbacks.push(cb);
    return rafCallbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    rafCallbacks = [];
  });

  scrollEl = document.createElement("div");
  scrollEl.getBoundingClientRect = vi.fn(
    () =>
      ({
        ...VIEWPORT,
        right: VIEWPORT.left + VIEWPORT.width,
        bottom: VIEWPORT.top + VIEWPORT.height,
        x: VIEWPORT.left,
        y: VIEWPORT.top,
        toJSON: () => ({}),
      }) as DOMRect
  );
  Object.defineProperties(scrollEl, {
    scrollWidth: { value: 3000, configurable: true },
    scrollHeight: { value: 3000, configurable: true },
    clientWidth: { value: VIEWPORT.width, configurable: true },
    clientHeight: { value: VIEWPORT.height, configurable: true },
  });
  scrollEl.scrollTop = 500;
  scrollEl.scrollLeft = 500;
  document.body.appendChild(scrollEl);
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("idle behaviour", () => {
  it("does nothing while the pointer is away from every edge", () => {
    const scroller = new AutoScroller();
    scroller.attach(scrollEl);
    scroller.update(400, 300);

    expect(rafCallbacks).toHaveLength(0);
    expect(scrollEl.scrollTop).toBe(500);
    scroller.detach();
  });

  it("does nothing before a scroll container is attached", () => {
    const scroller = new AutoScroller();
    expect(() => scroller.update(10, 10)).not.toThrow();
    expect(rafCallbacks).toHaveLength(0);
  });
});

describe("scrolling near an edge", () => {
  it("scrolls up when the pointer nears the top", () => {
    const scroller = new AutoScroller();
    scroller.attach(scrollEl);

    scroller.update(400, VIEWPORT.top + 10);
    expect(rafCallbacks).toHaveLength(1);

    advanceFrame(0); // establishes the time base
    advanceFrame(100);
    expect(scrollEl.scrollTop).toBeLessThan(500);
    scroller.stop();
  });

  it("scrolls down when the pointer nears the bottom", () => {
    const scroller = new AutoScroller();
    scroller.attach(scrollEl);

    scroller.update(400, VIEWPORT.height - 10);
    advanceFrame(0);
    advanceFrame(100);
    expect(scrollEl.scrollTop).toBeGreaterThan(500);
    scroller.stop();
  });

  it("scrolls sideways near the left and right edges", () => {
    const scroller = new AutoScroller();
    scroller.attach(scrollEl);

    scroller.update(10, 300);
    advanceFrame(0);
    advanceFrame(100);
    expect(scrollEl.scrollLeft).toBeLessThan(500);

    scrollEl.scrollLeft = 500;
    scroller.update(VIEWPORT.width - 10, 300);
    advanceFrame(100);
    expect(scrollEl.scrollLeft).toBeGreaterThan(500);
    scroller.stop();
  });

  it("goes faster the closer the pointer is to the edge", () => {
    const runFor = (y: number): number => {
      clock.value = 0;
      scrollEl.scrollTop = 500;
      const scroller = new AutoScroller();
      scroller.attach(scrollEl);
      scroller.update(400, y);
      advanceFrame(0);
      advanceFrame(100);
      const travelled = 500 - scrollEl.scrollTop;
      scroller.detach();
      return travelled;
    };

    const nearEdge = runFor(VIEWPORT.top + 4);
    const farEdge = runFor(VIEWPORT.top + SCROLL_ZONE_PX - 4);
    expect(nearEdge).toBeGreaterThan(farEdge);
  });

  it("stops at the top and does not scroll past zero", () => {
    scrollEl.scrollTop = 5;
    const scroller = new AutoScroller();
    scroller.attach(scrollEl);

    scroller.update(400, VIEWPORT.top + 1);
    advanceFrame(0);
    advanceFrame(1000);
    expect(scrollEl.scrollTop).toBe(0);
    scroller.stop();
  });

  it("stops at the bottom and does not scroll past the content", () => {
    const maxScroll = 3000 - VIEWPORT.height;
    scrollEl.scrollTop = maxScroll - 5;
    const scroller = new AutoScroller();
    scroller.attach(scrollEl);

    scroller.update(400, VIEWPORT.height - 1);
    advanceFrame(0);
    advanceFrame(1000);
    expect(scrollEl.scrollTop).toBe(maxScroll);
    scroller.stop();
  });
});

describe("stopping", () => {
  it("stops once the pointer leaves the edge zone", () => {
    const scroller = new AutoScroller();
    scroller.attach(scrollEl);

    scroller.update(400, VIEWPORT.top + 10);
    expect(rafCallbacks).toHaveLength(1);

    scroller.update(400, 300);
    expect(rafCallbacks).toHaveLength(0);
    scroller.detach();
  });

  it("stops on demand", () => {
    const scroller = new AutoScroller();
    scroller.attach(scrollEl);
    scroller.update(400, VIEWPORT.top + 10);

    scroller.stop();
    expect(rafCallbacks).toHaveLength(0);
    scroller.detach();
  });

  it("ignores updates after detach", () => {
    const scroller = new AutoScroller();
    scroller.attach(scrollEl);
    scroller.detach();

    scroller.update(400, VIEWPORT.top + 10);
    expect(rafCallbacks).toHaveLength(0);
  });
});
