import { ZigoSchedulerElement } from "./element";

export const TAG_NAME = "zigo-scheduler";

/**
 * Registers the element.
 *
 * Called automatically on import in a browser. Exported so a host that controls
 * its own registry, or renders on the server, can decide when it happens.
 * Registering twice throws, so the guard is not optional.
 */
export function defineZigoScheduler(tag: string = TAG_NAME): void {
  if (typeof customElements === "undefined") return;
  if (customElements.get(tag)) return;
  customElements.define(tag, ZigoSchedulerElement);
}

defineZigoScheduler();
