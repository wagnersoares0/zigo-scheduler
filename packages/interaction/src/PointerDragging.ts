export type DragStartEvent = {
  el: HTMLElement;
  x: number;
  y: number;
  startX: number;
  startY: number;
};

export type DragMoveEvent = {
  el: HTMLElement;
  x: number;
  y: number;
  dx: number;
  dy: number;
};

export type DragEndEvent = {
  el: HTMLElement;
  x: number;
  y: number;
  canceled: boolean;
};

export type PointerDragCallbacks = {
  ignoreStartSelector?: string;
  longPressDelay?: number;
  onDragStart: (ev: DragStartEvent) => void;
  onDragMove: (ev: DragMoveEvent) => void;
  onDragEnd: (ev: DragEndEvent) => void;
};

const DRAG_THRESHOLD_PX = 5;

export class PointerDragging {
  private el: HTMLElement;
  private cbs: PointerDragCallbacks;
  private pointerId: number | null = null;
  private startX = 0;
  private startY = 0;
  private thresholdMet = false;
  private longPressTimer: number | null = null;
  private longPressCommitted = false;
  private isTouch = false;
  private originalTouchAction: string | null = null;

  constructor(el: HTMLElement, cbs: PointerDragCallbacks) {
    this.el = el;
    this.cbs = cbs;
    if ((cbs.longPressDelay ?? 0) > 0) {
      this.originalTouchAction = el.style.touchAction;
      const touchAction = el.style.touchAction || this.ownerWindow().getComputedStyle(el).touchAction;
      if (touchAction === "none") {
        el.style.touchAction = "pan-x pan-y";
      }
    }
    el.addEventListener("pointerdown", this.handlePointerDown);
  }

  private ownerWindow(): Window {
    return this.el.ownerDocument.defaultView ?? window;
  }

  private eventTarget(): Document {
    return this.el.ownerDocument;
  }

  private handlePointerDown = (ev: PointerEvent) => {
    if (ev.button !== 0 && ev.pointerType === "mouse") return;
    if (this.pointerId !== null) return;
    if (this.cbs.ignoreStartSelector) {
      const ElementCtor = (this.ownerWindow() as Window & typeof globalThis).Element;
      const target = ev.target instanceof ElementCtor ? (ev.target as Element) : null;
      if (target?.closest(this.cbs.ignoreStartSelector)) return;
    }

    this.isTouch = ev.pointerType === "touch" || ev.pointerType === "pen";
    const delay = this.isTouch ? (this.cbs.longPressDelay ?? 1000) : 0;

    this.pointerId = ev.pointerId;
    this.startX = ev.clientX;
    this.startY = ev.clientY;
    this.thresholdMet = false;
    this.longPressCommitted = false;

    this.eventTarget().addEventListener("pointermove", this.handlePointerMove);
    this.eventTarget().addEventListener("pointerup", this.handlePointerUp);
    this.eventTarget().addEventListener("pointercancel", this.handlePointerUp);

    if (delay > 0) {
      const win = this.ownerWindow();
      this.longPressTimer = win.setTimeout(() => {
        if (this.pointerId !== ev.pointerId) return;
        this.longPressTimer = null;
        this.longPressCommitted = true;
        try {
          this.el.setPointerCapture(ev.pointerId);
        } catch {
          // Pointer may have been canceled before the timer completed.
        }
        this.thresholdMet = true;
        this.cbs.onDragStart({
          el: this.el,
          x: this.startX,
          y: this.startY,
          startX: this.startX,
          startY: this.startY,
        });
        this.cbs.onDragMove({ el: this.el, x: this.startX, y: this.startY, dx: 0, dy: 0 });
      }, delay);
    } else {
      this.longPressCommitted = true;
      ev.preventDefault();
      try {
        this.el.setPointerCapture(ev.pointerId);
      } catch {
        // Pointer capture can fail if the browser cancels the pointer before capture.
      }
    }
  };

  private handlePointerMove = (ev: PointerEvent) => {
    if (ev.pointerId !== this.pointerId) return;

    const dx = ev.clientX - this.startX;
    const dy = ev.clientY - this.startY;
    const dist = Math.hypot(dx, dy);

    if (this.longPressTimer !== null) {
      if (dist > DRAG_THRESHOLD_PX) {
        this.ownerWindow().clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
        this.cleanup(ev.pointerId);
      }
      return;
    }

    if (this.isTouch && !this.longPressCommitted) return;

    ev.preventDefault();
    if (!this.thresholdMet) {
      if (dist < DRAG_THRESHOLD_PX) return;
      this.thresholdMet = true;
      this.cbs.onDragStart({
        el: this.el,
        x: ev.clientX,
        y: ev.clientY,
        startX: this.startX,
        startY: this.startY,
      });
    }
    this.cbs.onDragMove({ el: this.el, x: ev.clientX, y: ev.clientY, dx, dy });
  };

  private handlePointerUp = (ev: PointerEvent) => {
    if (ev.pointerId !== this.pointerId) return;
    const didDrag = this.thresholdMet;
    const endEvent: DragEndEvent = {
      el: this.el,
      x: ev.clientX,
      y: ev.clientY,
      canceled: ev.type === "pointercancel",
    };
    this.cleanup(ev.pointerId);
    if (didDrag) {
      this.cbs.onDragEnd(endEvent);
    }
  };

  private cleanup(pointerId = this.pointerId) {
    if (this.longPressTimer !== null) {
      this.ownerWindow().clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.longPressCommitted = false;
    this.isTouch = false;
    if (pointerId !== null) {
      try {
        if (this.el.hasPointerCapture(pointerId)) this.el.releasePointerCapture(pointerId);
      } catch {
        // Ignore stale pointer capture during teardown.
      }
    }
    this.pointerId = null;
    this.thresholdMet = false;
    this.eventTarget().removeEventListener("pointermove", this.handlePointerMove);
    this.eventTarget().removeEventListener("pointerup", this.handlePointerUp);
    this.eventTarget().removeEventListener("pointercancel", this.handlePointerUp);
  }

  destroy() {
    this.cleanup();
    this.el.removeEventListener("pointerdown", this.handlePointerDown);
    if (this.originalTouchAction !== null) {
      this.el.style.touchAction = this.originalTouchAction;
    }
  }
}
