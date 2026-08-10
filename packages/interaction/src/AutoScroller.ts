const SCROLL_ZONE_PX = 64;
const MAX_SPEED_PX_S = 480;

export class AutoScroller {
  private scrollEl: HTMLElement | null = null;
  private rafId = 0;
  private lastTime = 0;
  private velX = 0;
  private velY = 0;

  attach(scrollEl: HTMLElement) {
    this.scrollEl = scrollEl;
  }

  private ownerWindow(): Window {
    return this.scrollEl?.ownerDocument.defaultView ?? window;
  }

  update(clientX: number, clientY: number) {
    if (!this.scrollEl) return;
    const rect = this.scrollEl.getBoundingClientRect();

    const distLeft = clientX - rect.left;
    const distRight = rect.right - clientX;
    const distTop = clientY - rect.top;
    const distBottom = rect.bottom - clientY;

    if (distLeft < SCROLL_ZONE_PX && distLeft >= 0) {
      this.velX = -MAX_SPEED_PX_S * (1 - distLeft / SCROLL_ZONE_PX);
    } else if (distRight < SCROLL_ZONE_PX && distRight >= 0) {
      this.velX = MAX_SPEED_PX_S * (1 - distRight / SCROLL_ZONE_PX);
    } else {
      this.velX = 0;
    }

    if (distTop < SCROLL_ZONE_PX && distTop >= 0) {
      this.velY = -MAX_SPEED_PX_S * (1 - distTop / SCROLL_ZONE_PX);
    } else if (distBottom < SCROLL_ZONE_PX && distBottom >= 0) {
      this.velY = MAX_SPEED_PX_S * (1 - distBottom / SCROLL_ZONE_PX);
    } else {
      this.velY = 0;
    }

    if ((this.velX !== 0 || this.velY !== 0) && this.rafId === 0) {
      const win = this.ownerWindow();
      this.lastTime = win.performance.now();
      this.rafId = win.requestAnimationFrame(this.tick);
    } else if (this.velX === 0 && this.velY === 0 && this.rafId !== 0) {
      this.ownerWindow().cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  private tick = (now: number) => {
    if (!this.scrollEl || (this.velX === 0 && this.velY === 0)) {
      this.rafId = 0;
      return;
    }
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.scrollEl.scrollLeft = Math.max(
      0,
      Math.min(
        this.scrollEl.scrollWidth - this.scrollEl.clientWidth,
        this.scrollEl.scrollLeft + this.velX * dt,
      ),
    );
    this.scrollEl.scrollTop = Math.max(
      0,
      Math.min(
        this.scrollEl.scrollHeight - this.scrollEl.clientHeight,
        this.scrollEl.scrollTop + this.velY * dt,
      ),
    );
    this.rafId = this.ownerWindow().requestAnimationFrame(this.tick);
  };

  stop() {
    this.velX = 0;
    this.velY = 0;
    if (this.rafId !== 0) {
      this.ownerWindow().cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }

  detach() {
    this.stop();
    this.scrollEl = null;
  }
}
