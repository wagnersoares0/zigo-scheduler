import type { AgendaLayout, AgendaLayoutColumn, AgendaLayoutUnavailable } from "@zigoschedule/scheduler-layout";
import { el, px } from "../dom";

/** Lunch, closed days and hours outside the professional's shift. */
export const buildUnavailable = (
  layout: AgendaLayout,
  block: AgendaLayoutUnavailable,
  column: AgendaLayoutColumn
): HTMLElement => {
  const node = el("div", `za-unavailable za-${block.reason}`);
  node.style.top = px(block.top);
  node.style.height = px(block.height);
  node.style.left = px(column.left - layout.axisWidth);
  node.style.width = px(column.width);

  // Below this the label would be a smudge; the hatched background still reads.
  if (block.height > 22) node.textContent = block.label;

  return node;
};
