import type { AgendaLayout } from "@zigoschedule/scheduler-layout";
import { el, px } from "../dom";

/** Horizontal rules per row and vertical dividers per column. */
export const buildGridLines = (layout: AgendaLayout): HTMLElement => {
  const lines = el("div", "za-lines");

  for (const row of layout.rows) {
    const line = el("div", `za-line${row.isMajor ? " za-major" : ""}`);
    line.style.top = px(row.top);
    lines.appendChild(line);
  }

  for (const column of layout.columns) {
    const divider = el("div", "za-column-divider");
    divider.style.left = px(column.left - layout.axisWidth);
    lines.appendChild(divider);
  }

  return lines;
};
