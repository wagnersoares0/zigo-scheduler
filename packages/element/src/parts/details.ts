import {
  DEFAULT_AGENDA_LOCALE,
  formatAgendaCurrency,
  formatAgendaDuration,
  getAgendaMessages,
  getAgendaStatusLabel,
  type AgendaMessages,
} from "@zigoschedule/scheduler-core";
import { el } from "../dom";
import { activeElementFor, keepFocusInside } from "./focus";

/**
 * Built-in details sheet opened when an appointment is selected.
 *
 * It shows the same operational data a host app usually needs: time, client,
 * service, notes, status, total and actions. Hosts that want their own details
 * UI can set `details="off"` and listen to `select-event` instead.
 *
 * Each button dispatches `appointment-action` with `{ action, id }`. The
 * scheduler does not send messages, charge cards or cancel bookings by itself.
 * It reports the action and lets the host application decide what happens next.
 */

export type DetailsAction =
  | "whatsapp"
  | "reminder"
  | "edit"
  | "cancel"
  | "charge";

export type DetailsData = {
  id: string;
  /** "09:00 - 10:00" */
  timeLabel: string;
  /** "2026-08-13" */
  dayKey: string;
  durationMinutes: number;
  clientName: string;
  clientPhone?: string | null;
  serviceName?: string | null;
  professionalName?: string | null;
  notes?: string | null;
  status: string;
  isPaid: boolean;
  price?: number | null;
  color: string;
};

const STATUS_TONE: Record<string, string> = {
  confirmado: "ok",
  confirmed: "ok",
  pendente: "warn",
  pending: "warn",
  concluido: "ok",
  completed: "ok",
  done: "ok",
  cancelado: "bad",
  canceled: "bad",
  cancelled: "bad",
};

const ICONS = {
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  bag: "M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  note: "M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z",
  tag: "M20.6 13.4 12 22l-9-9V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01",
  wallet: "M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm14 4h4v4h-4a2 2 0 0 1 0-4Z",
  close: "M18 6 6 18M6 6l12 12",
} as const;

const ACTIONS: Array<{
  key: DetailsAction;
  labelKey: keyof Pick<AgendaMessages["details"], "whatsapp" | "reminder" | "edit" | "cancel">;
  tone: string;
  path: string;
}> = [
  { key: "whatsapp", labelKey: "whatsapp", tone: "green", path: "M21 12a9 9 0 0 1-13.3 7.9L3 21l1.2-4.6A9 9 0 1 1 21 12Z" },
  { key: "reminder", labelKey: "reminder", tone: "green", path: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" },
  { key: "edit", labelKey: "edit", tone: "blue", path: "M11 4H4v16h16v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" },
  { key: "cancel", labelKey: "cancel", tone: "red", path: "M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" },
];

const SVG_NS = "http://www.w3.org/2000/svg";

/** Line icon with the same visual language as the React demo. */
const icon = (path: string, size = 18): SVGElement => {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const d = document.createElementNS(SVG_NS, "path");
  d.setAttribute("d", path);
  svg.appendChild(d);
  return svg;
};

const longDate = (dayKey: string, locale: string): string => {
  const data = new Date(`${dayKey}T12:00:00`);
  if (Number.isNaN(data.getTime())) return dayKey;
  return data.toLocaleDateString(locale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

/**
 * Short stable code derived from the id. It acts as a booking reference.
 *
 * Recurring occurrences carry `@date` in the id; remove it so the reference
 * stays readable.
 */
const reference = (id: string): string => {
  const baseId = id.replace(/@\d{4}-\d{2}-\d{2}$/, "");
  // Keep only letters and numbers. An id like "Olivia Carter-09:00" should not
  // turn into a reference that looks like a time.
  const readable = baseId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const checksum = [...baseId].reduce((total, char) => total + char.charCodeAt(0), 0);
  return (
    (readable.slice(-4) || "0000").padStart(4, "0") +
    "-" +
    (checksum * 7919).toString(16).slice(-4).toUpperCase().padStart(4, "0")
  );
};

const currentByRoot = new WeakMap<HTMLElement, () => void>();

/** Close the open sheet, if any. Safe to call at any time. */
export function closeDetails(root: HTMLElement): void {
  const close = currentByRoot.get(root);
  if (!close) return;
  currentByRoot.delete(root);
  close();
}

export const detailsOpen = (root: HTMLElement): boolean => currentByRoot.has(root);

/** Body row: icon, title, supporting text and an optional value on the right. */
const row = (
  path: string,
  title: string,
  support: string,
  options: { supportMuted?: boolean; value?: string; valueBig?: boolean } = {}
): HTMLElement => {
  const line = el("div", "za-sheet-row");

  const iconSlot = el("span", "za-sheet-icon");
  iconSlot.appendChild(icon(path));

  const main = el("div", "za-sheet-main");
  const strong = el("strong");
  strong.textContent = title;
  const supportText = el("span", options.supportMuted ? "za-muted-text" : undefined);
  supportText.textContent = support;
  main.append(strong, supportText);

  line.append(iconSlot, main);

  if (options.value) {
    const value = el("span", options.valueBig ? "za-sheet-value za-big" : "za-sheet-value");
    value.textContent = options.value;
    line.appendChild(value);
  }
  return line;
};

/**
 * Open the details sheet.
 *
 * `root` is a positioned container inside the shadow root. Rendering outside it
 * would lose the isolated styles.
 */
export function openDetails(
  root: HTMLElement,
  data: DetailsData,
  onAction: (action: DetailsAction) => void,
  options: { messages?: AgendaMessages; locale?: string } = {}
): void {
  const focusedBeforeOpen = activeElementFor(root);
  closeDetails(root);

  const messages = options.messages ?? getAgendaMessages(options.locale);
  const locale = options.locale ?? DEFAULT_AGENDA_LOCALE;
  const status = {
    label: getAgendaStatusLabel(data.status, messages),
    tone: STATUS_TONE[data.status.trim().toLowerCase()] ?? "ok",
  };
  const price = typeof data.price === "number" ? data.price : null;

  const backdrop = el("div", "za-sheet-backdrop");
  const sheet = el("div", "za-sheet");
  const closeSheet = () => closeDetails(root);
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", messages.openAppointment(data.clientName));
  sheet.tabIndex = -1;
  sheet.addEventListener("click", (e) => e.stopPropagation());

  // ── Header ────────────────────────────────────────────────────────────────
  const head = el("header", "za-sheet-head");
  head.style.background = data.color;

  const heading = el("div", "za-sheet-headings");
  const statusLabel = el("strong");
  statusLabel.textContent = status.label;
  const ref = el("span");
  ref.textContent = `${messages.details.referencePrefix} ${reference(data.id)}`;
  heading.append(statusLabel, ref);

  const closeButton = el("button", "za-sheet-x");
  closeButton.type = "button";
  closeButton.setAttribute("aria-label", messages.close);
  closeButton.appendChild(icon(ICONS.close, 20));
  closeButton.addEventListener("click", closeSheet);

  head.append(heading, closeButton);

  // ── Body ──────────────────────────────────────────────────────────────────
  const rows = el("div", "za-sheet-rows");
  rows.appendChild(row(ICONS.clock, data.timeLabel, longDate(data.dayKey, locale)));
  rows.appendChild(
    row(ICONS.user, data.clientName, data.clientPhone ?? messages.details.noPhone, {
      supportMuted: !data.clientPhone,
    })
  );
  rows.appendChild(
    row(
      ICONS.bag,
      data.serviceName || messages.details.service,
      formatAgendaDuration(data.durationMinutes, locale) +
        (data.professionalName ? ` · ${data.professionalName}` : ""),
      { value: price !== null ? formatAgendaCurrency(price, locale) : undefined }
    )
  );
  rows.appendChild(
    row(ICONS.note, messages.details.notes, data.notes || messages.details.noNotes, {
      supportMuted: !data.notes,
    })
  );

  const statusRow = el("div", "za-sheet-row");
  const statusIcon = el("span", "za-sheet-icon");
  statusIcon.appendChild(icon(ICONS.tag));
  const statusMain = el("div", "za-sheet-main");
  const statusTitle = el("strong");
  statusTitle.textContent = messages.details.status;
  const tags = el("span", "za-sheet-tags");
  const statusTag = el("em", `za-tag za-tag-${status.tone}`);
  statusTag.textContent = status.label;
  tags.appendChild(statusTag);
  if (data.isPaid) {
    const paidTag = el("em", "za-tag za-tag-ok");
    paidTag.textContent = messages.status.paid;
    tags.appendChild(paidTag);
  }
  statusMain.append(statusTitle, tags);
  statusRow.append(statusIcon, statusMain);
  rows.appendChild(statusRow);

  if (price !== null) {
    rows.appendChild(
      row(ICONS.wallet, messages.details.total, data.isPaid ? messages.details.received : messages.details.amountDue, {
        value: formatAgendaCurrency(price, locale),
        valueBig: true,
      })
    );
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  const actions = el("div", "za-sheet-actions");
  for (const action of ACTIONS) {
    const button = el("button", `za-action za-action-${action.tone}`);
    button.type = "button";
    button.appendChild(icon(action.path, 17));
    button.appendChild(document.createTextNode(messages.details[action.labelKey]));
    // Close after the action, like the React example. The host app can continue
    // with one clear command instead of making the user close the sheet twice.
    button.addEventListener("click", () => {
      closeSheet();
      onAction(action.key);
    });
    actions.appendChild(button);
  }

  const foot = el("footer", "za-sheet-foot");
  const secondaryButton = el("button", "za-sheet-ghost");
  secondaryButton.type = "button";
  secondaryButton.textContent = messages.close;
  secondaryButton.addEventListener("click", closeSheet);

  const primaryButton = el("button", "za-primary");
  primaryButton.type = "button";
  primaryButton.style.background = data.color;
  primaryButton.textContent = price !== null
    ? `${messages.details.charge} ${formatAgendaCurrency(price, locale)}`
    : messages.details.charge;
  primaryButton.addEventListener("click", () => {
    closeSheet();
    onAction("charge");
  });
  foot.append(secondaryButton, primaryButton);

  sheet.append(head, rows, actions, foot);
  backdrop.appendChild(sheet);
  backdrop.addEventListener("click", closeSheet);
  root.appendChild(backdrop);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSheet();
      return;
    }

    if (event.key !== "Tab") return;
    keepFocusInside(event, root, sheet);
  };
  root.ownerDocument.addEventListener("keydown", onKeyDown);

  currentByRoot.set(root, () => {
    root.ownerDocument.removeEventListener("keydown", onKeyDown);
    backdrop.remove();
    if (focusedBeforeOpen instanceof HTMLElement && focusedBeforeOpen.isConnected) {
      focusedBeforeOpen.focus({ preventScroll: true });
    }
  });

  closeButton.focus();
}
