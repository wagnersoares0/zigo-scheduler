import type { AgendaLayout, AgendaLayoutEvent } from "@zigoschedule/scheduler-layout";
import { readableInk, withAlpha } from "../color";
import { RESIZE_HANDLE_ATTR } from "../gestures";
import { el, px } from "../dom";

/** Height below which a line of text stops being legible and starts being noise. */
const SHOW_TITLE = 40;
const SHOW_SERVICE = 56;
const SHOW_PROFESSIONAL = 74;

const buildBody = (event: AgendaLayoutEvent): HTMLElement => {
  const body = el("div", "za-event-body");

  const title = el("span", "za-event-title");
  title.textContent = event.title;
  body.appendChild(title);

  if (event.subtitle && event.height >= SHOW_SERVICE) {
    const subtitle = el("span", "za-event-sub");
    subtitle.textContent = event.subtitle;
    body.appendChild(subtitle);
  }

  if (event.professionalName && event.height >= SHOW_PROFESSIONAL) {
    const professional = el("span", "za-event-sub za-muted");
    professional.textContent = event.professionalName;
    body.appendChild(professional);
  }

  return body;
};

export const buildEventCard = (layout: AgendaLayout, event: AgendaLayoutEvent): HTMLElement => {
  const node = el("div", `za-event za-${event.kind} za-status-${event.status}`);
  node.style.top = px(event.top);
  node.style.height = px(Math.max(18, event.height));
  node.style.left = px(event.left - layout.axisWidth);
  node.style.width = px(event.width);
  node.style.background = withAlpha(event.color, 0.16);
  node.style.borderColor = event.color;
  // Expose the resolved color to CSS so dragging can mark the card without
  // changing its fill.
  node.style.setProperty("--za-event-color", event.color);

  node.dataset.eventId = event.id;
  node.setAttribute("role", "button");
  node.setAttribute("tabindex", "0");
  node.setAttribute(
    "aria-label",
    [event.title, event.timeLabel, event.professionalName].filter(Boolean).join(", ")
  );

  const head = el("div", "za-event-head");
  head.style.background = event.color;
  head.style.color = readableInk(event.color);
  head.textContent = event.timeLabel;
  node.appendChild(head);

  if (event.height >= SHOW_TITLE) node.appendChild(buildBody(event));

  // Only appointments resize; a block is not the user's to stretch.
  if (event.kind === "appointment" && event.height >= 28) {
    const handle = el("div", "za-resize");
    handle.setAttribute(RESIZE_HANDLE_ATTR, "");
    handle.setAttribute("aria-hidden", "true");
    node.appendChild(handle);
  }

  if (event.isPaid) {
    const paid = el("span", "za-paid");
    paid.textContent = "✓";
    paid.title = "Payment confirmed";
    node.appendChild(paid);
  }

  return node;
};
