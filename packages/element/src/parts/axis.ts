import type { AgendaLayout } from "@zigoschedule/scheduler-layout";
import { el, px } from "../dom";

/** The time column on the left. Every row carries its own label. */
export const buildAxis = (layout: AgendaLayout): HTMLElement => {
  const axis = el("div", "za-axis");
  axis.style.width = px(layout.axisWidth);
  axis.style.height = px(layout.totalHeight);

  for (const row of layout.rows) {
    const cell = el("div", `za-axis-cell${row.isMajor ? " za-major" : ""}`);
    cell.style.top = px(row.top);
    cell.style.height = px(row.height);
    cell.textContent = row.label;
    cell.dataset.time = row.label;
    axis.appendChild(cell);
  }

  return axis;
};
