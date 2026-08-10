import type { AgendaMonthCell, AgendaMonthLayout } from "@zigoschedule/scheduler-layout";
import { getAgendaMessages, type AgendaMessages } from "@zigoschedule/scheduler-core";
import { el, px } from "../dom";

const buildEntry = (entry: AgendaMonthCell["entries"][number]): HTMLElement => {
  const line = el("div", `za-month-entry za-status-${entry.status}`);
  line.dataset.eventId = entry.id;
  line.setAttribute("role", "button");
  line.setAttribute("tabindex", "0");

  // No extra dot. Put the color on the time itself: same information, one less
  // decoration, and more room for the title.
  const time = el("span", "za-month-time");
  time.textContent = entry.timeLabel;
  time.style.color = entry.color;

  const title = el("span", "za-month-title");
  title.textContent = entry.title;

  line.append(time, title);
  return line;
};

const buildCell = (cell: AgendaMonthCell, messages: AgendaMessages): HTMLElement => {
  const node = el(
    "div",
    `za-month-cell${cell.isCurrentMonth ? "" : " za-outside"}${cell.isToday ? " za-today" : ""}`
  );
  node.style.left = px(cell.left);
  node.style.top = px(cell.top);
  node.style.width = px(cell.width);
  node.style.height = px(cell.height);
  node.dataset.dayKey = cell.dayKey;

  const number = el("div", "za-month-number");
  number.textContent = String(cell.dayNumber);
  node.appendChild(number);

  for (const entry of cell.entries) node.appendChild(buildEntry(entry));

  if (cell.hiddenCount > 0) {
    const more = el("div", "za-month-more");
    more.textContent = messages.more(cell.hiddenCount, cell.totalCount);
    more.dataset.moreDay = cell.dayKey;
    node.appendChild(more);
  }

  return node;
};

/** Draws the month grid: six weeks of day cells, each listing its appointments. */
export const buildMonthGrid = (
  layout: AgendaMonthLayout,
  messages: AgendaMessages = getAgendaMessages()
): HTMLElement => {
  const root = el("div", "za-month");

  const header = el("div", "za-month-head");
  for (const label of layout.weekdayLabels) {
    const cell = el("div", "za-month-weekday");
    cell.textContent = label;
    header.appendChild(cell);
  }
  root.appendChild(header);

  const body = el("div", "za-month-body");
  body.style.height = px(layout.totalHeight);
  for (const cell of layout.cells) body.appendChild(buildCell(cell, messages));
  root.appendChild(body);

  return root;
};
