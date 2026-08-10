/**
 * The mirror that follows the cursor stays fully opaque.
 *
 * With opacity over a white grid, colors looked washed out. A user could drag a
 * purple card, see it turn pale, and think the appointment color had changed.
 * The shadow communicates "this is being moved" without changing the color.
 */
const MIRROR_OPACITY = 1;
const MIRROR_SCALE = 1;
const MIRROR_REVERT_MS = 160;

export class ElementMirror {
  private mirrorEl: HTMLElement | null = null;
  private offsetX = 0;
  private offsetY = 0;
  private originLeft = 0;
  private originTop = 0;
  private visible = true;
  private removeTimer = 0;
  private sourceRect: DOMRect | null = null;

  private sourceWindow: Window | null = null;

  private ownerWindow(): Window {
    return this.sourceWindow ?? window;
  }

  start(sourceEl: HTMLElement, clientX: number, clientY: number, visible = true) {
    this.end();
    const sourceDocument = sourceEl.ownerDocument;
    this.sourceWindow = sourceDocument.defaultView ?? window;
    this.sourceRect = sourceEl.getBoundingClientRect();
    const rect = sourceEl.getBoundingClientRect();
    this.offsetX = clientX - rect.left;
    this.offsetY = clientY - rect.top;
    this.originLeft = rect.left;
    this.originTop = rect.top;
    this.visible = visible;

    const mirror = sourceEl.cloneNode(true) as HTMLElement;
    Object.assign(mirror.style, {
      position: "fixed",
      top: `${rect.top}px`,
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      margin: "0",
      pointerEvents: "none",
      opacity: String(MIRROR_OPACITY),
      zIndex: "9999",
      transform: `scale(${MIRROR_SCALE})`,
      transformOrigin: "top left",
      transition: "none",
      boxShadow: "0 10px 28px rgba(15, 23, 42, 0.28)",
      borderRadius: "6px",
      willChange: "left, top, opacity, transform",
      display: visible ? "" : "none",
    });
    sourceDocument.body.appendChild(mirror);
    this.mirrorEl = mirror;
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (this.mirrorEl) {
      this.mirrorEl.style.display = visible ? "" : "none";
    }
  }

  move(clientX: number, clientY: number) {
    if (!this.mirrorEl) return;
    this.mirrorEl.style.left = `${clientX - this.offsetX}px`;
    this.mirrorEl.style.top = `${clientY - this.offsetY}px`;
  }

  end(options: { revert?: boolean } = {}) {
    if (this.removeTimer) {
      this.ownerWindow().clearTimeout(this.removeTimer);
      this.removeTimer = 0;
    }

    const mirror = this.mirrorEl;
    if (!mirror) {
      this.visible = true;
      this.sourceRect = null;
      return;
    }

    if (options.revert && this.visible) {
      mirror.style.display = "";
      mirror.style.transition = `left ${MIRROR_REVERT_MS}ms ease, top ${MIRROR_REVERT_MS}ms ease, opacity ${MIRROR_REVERT_MS}ms ease, transform ${MIRROR_REVERT_MS}ms ease`;
      mirror.style.left = `${this.originLeft}px`;
      mirror.style.top = `${this.originTop}px`;
      mirror.style.opacity = "0";
      mirror.style.transform = "scale(0.98)";
      const win = this.ownerWindow();
      this.removeTimer = win.setTimeout(() => {
        mirror.remove();
        if (this.mirrorEl === mirror) this.mirrorEl = null;
        this.removeTimer = 0;
        this.sourceRect = null;
        this.sourceWindow = null;
      }, MIRROR_REVERT_MS);
      this.visible = true;
      return;
    }

    mirror.remove();
    this.mirrorEl = null;
    this.visible = true;
    this.sourceRect = null;
    this.sourceWindow = null;
  }

  revertTo(duration = 250): void {
    if (!this.mirrorEl || !this.sourceRect) {
      this.end();
      return;
    }

    const mirror = this.mirrorEl;
    const currentRect = mirror.getBoundingClientRect();
    const dx = this.sourceRect.left - currentRect.left;
    const dy = this.sourceRect.top - currentRect.top;

    if (this.removeTimer) {
      this.ownerWindow().clearTimeout(this.removeTimer);
      this.removeTimer = 0;
    }

    mirror.style.display = "";
    mirror.style.transition = "none";
    mirror.style.transform = mirror.style.transform.replace(/translate3d\([^)]+\)/, "").trim();

    void mirror.getBoundingClientRect();

    mirror.style.transition = `transform ${duration}ms ease-in-out, opacity ${duration * 0.6}ms ease-in`;
    mirror.style.transform += ` translate(${dx}px, ${dy}px)`;
    mirror.style.opacity = "0.4";

    this.visible = true;
    const win = this.ownerWindow();
    this.removeTimer = win.setTimeout(() => {
      this.end();
      this.sourceRect = null;
    }, duration);
  }
}
