import { AutoScroller } from "./AutoScroller";
import { PointerDragging } from "./PointerDragging";
import type { HitTestResult } from "./AgendaElementDragging";

export type ResizePayload = {
  agId: string;
  dayKey: string;
  profId: string | null;
  startMinute: number;
  endMinute: number;
  snapMinutes: number;
  direction: "start" | "end";
};

export type ResizeResult = {
  agId: string;
  dayKey: string;
  profId: string | null;
  direction: "start" | "end";
  oldStartMinute: number;
  newStartMinute: number;
  oldEndMinute: number;
  newEndMinute: number;
  startMinute: number;
};

export type ResizableCallbacks = {
  onResizeStart?: (payload: ResizePayload) => void;
  onResizeMove?: (payload: ResizePayload, hit: HitTestResult | null, nextBoundaryMinute: number) => void;
  onResizeEnd?: (result: ResizeResult) => void;
  onResizeCancel?: (agId: string) => void;
  prepareHits?: () => void;
  releaseHits?: () => void;
  getScrollContainer: () => HTMLElement | null;
  hitTest: (clientX: number, clientY: number) => HitTestResult | null;
};

export class AgendaEventResizing {
  private pointer: PointerDragging;
  private scroller = new AutoScroller();
  private active = false;
  private initialHit: HitTestResult | null = null;

  constructor(private handleEl: HTMLElement, private payload: ResizePayload, private cbs: ResizableCallbacks) {
    this.pointer = new PointerDragging(handleEl, {
      longPressDelay: 800,
      onDragStart: ({ startX, startY }) => {
        this.active = true;
        cbs.prepareHits?.();
        this.initialHit = cbs.hitTest(startX, startY);
        const scrollEl = cbs.getScrollContainer();
        if (scrollEl) this.scroller.attach(scrollEl);
        cbs.onResizeStart?.(payload);
      },
      onDragMove: ({ x, y }) => {
        const hit = cbs.hitTest(x, y);
        this.scroller.update(x, y);
        cbs.onResizeMove?.(payload, hit, this.getNextBoundaryMinute(hit));
      },
      onDragEnd: ({ x, y, canceled }) => {
        const hit = canceled ? null : cbs.hitTest(x, y);
        const boundary = this.getNextBoundaryMinute(hit);
        this.active = false;
        this.scroller.detach();
        cbs.releaseHits?.();

        if (!hit || canceled || !this.isSameColumn(hit)) {
          cbs.onResizeCancel?.(payload.agId);
          this.initialHit = null;
          return;
        }

        const newStartMinute = payload.direction === "start" ? boundary : payload.startMinute;
        const newEndMinute = payload.direction === "end" ? boundary : payload.endMinute;
        cbs.onResizeEnd?.({
          agId: payload.agId,
          dayKey: payload.dayKey,
          profId: payload.profId,
          direction: payload.direction,
          oldStartMinute: payload.startMinute,
          newStartMinute,
          oldEndMinute: payload.endMinute,
          newEndMinute,
          startMinute: newStartMinute,
        });
        this.initialHit = null;
      },
    });
  }

  private getNextBoundaryMinute(hit: HitTestResult | null): number {
    if (!hit || !this.initialHit) {
      return this.payload.direction === "start"
        ? this.payload.startMinute
        : this.payload.endMinute;
    }
    const delta = hit.minute - this.initialHit.minute;
    return this.payload.direction === "start"
      ? this.payload.startMinute + delta
      : this.payload.endMinute + delta;
  }

  private isSameColumn(hit: HitTestResult): boolean {
    return hit.dayKey === this.payload.dayKey && (
      hit.profId === null ||
      (hit.profId ?? null) === (this.payload.profId ?? null)
    );
  }

  destroy() {
    if (this.active) {
      this.scroller.detach();
      this.cbs.releaseHits?.();
      this.active = false;
      this.initialHit = null;
    }
    this.pointer.destroy();
  }
}
