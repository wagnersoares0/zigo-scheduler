import { PointerDragging } from "./PointerDragging";
import { ElementMirror } from "./ElementMirror";
import { AutoScroller } from "./AutoScroller";

export type DragPayload = {
  agId: string;
  startMinute: number;
  durationMinutes: number;
  profId: string | null;
  dayKey: string;
};

export type DropResult = {
  agId: string;
  oldMinute: number;
  oldDayKey: string;
  oldProfId: string | null;
  newMinute: number;
  newDayKey: string;
  profId: string | null;
  durationMinutes: number;
};

export type HitTestResult = {
  dayKey: string;
  minute: number;
  profId: string | null;
};

export type DraggableCallbacks = {
  onDragStart?: (payload: DragPayload, hit: HitTestResult | null) => void;
  onDragMove?: (
    payload: DragPayload,
    hit: HitTestResult | null,
    nextStartMinute: number,
    clientX: number,
    clientY: number,
  ) => void;
  onDrop?: (result: DropResult) => void;
  onDragCancel?: (agId: string) => void;
  prepareHits?: () => void;
  releaseHits?: () => void;
  getScrollContainer: () => HTMLElement | null;
  hitTest: (clientX: number, clientY: number) => HitTestResult | null;
};

export class AgendaElementDragging {
  private pointer: PointerDragging;
  private mirror = new ElementMirror();
  private scroller = new AutoScroller();
  private payload: DragPayload;
  private cbs: DraggableCallbacks;
  private active = false;
  private initialHit: HitTestResult | null = null;

  constructor(el: HTMLElement, payload: DragPayload, cbs: DraggableCallbacks) {
    this.payload = payload;
    this.cbs = cbs;

    this.pointer = new PointerDragging(el, {
      ignoreStartSelector: "[data-ag-resize-handle]",
      longPressDelay: 1000,
      onDragStart: ({ el: sourceEl, x, y, startX, startY }) => {
        this.active = true;
        cbs.prepareHits?.();
        this.initialHit = cbs.hitTest(startX, startY);
        const scrollEl = cbs.getScrollContainer();
        if (scrollEl) this.scroller.attach(scrollEl);
        this.mirror.start(sourceEl, startX, startY, !this.initialHit);
        this.mirror.move(x, y);
        cbs.onDragStart?.(payload, this.initialHit);
      },

      onDragMove: ({ x, y }) => {
        const hit = cbs.hitTest(x, y);
        const nextStartMinute = this.getNextStartMinute(hit);
        this.mirror.move(x, y);
        this.mirror.setVisible(!hit);
        this.scroller.update(x, y);
        cbs.onDragMove?.(payload, hit, nextStartMinute, x, y);
      },

      onDragEnd: ({ x, y, canceled }) => {
        const hit = canceled ? null : cbs.hitTest(x, y);
        const nextStartMinute = this.getNextStartMinute(hit);
        this.active = false;
        this.scroller.detach();
        cbs.releaseHits?.();
        if (canceled) {
          this.mirror.revertTo(250);
          cbs.onDragCancel?.(payload.agId);
          this.initialHit = null;
          return;
        }
        if (hit) {
          this.mirror.end();
          cbs.onDrop?.({
            agId: payload.agId,
            oldMinute: payload.startMinute,
            oldDayKey: payload.dayKey,
            oldProfId: payload.profId,
            newMinute: nextStartMinute,
            newDayKey: hit.dayKey,
            profId: hit.profId,
            durationMinutes: payload.durationMinutes,
          });
        } else {
          this.mirror.revertTo(250);
          cbs.onDragCancel?.(payload.agId);
        }
        this.initialHit = null;
      },
    });
  }

  private getNextStartMinute(hit: HitTestResult | null): number {
    if (!hit || !this.initialHit) return this.payload.startMinute;
    return this.payload.startMinute + (hit.minute - this.initialHit.minute);
  }

  destroy() {
    if (this.active) {
      this.mirror.end();
      this.scroller.detach();
      this.cbs.releaseHits?.();
      this.active = false;
      this.initialHit = null;
    }
    this.pointer.destroy();
  }
}
