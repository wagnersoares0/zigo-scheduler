import type { AgendaLayout } from "@zigoschedule/scheduler-layout";
import { getProfessionalName, getProfessionalPhotoUrl, type Professional } from "@zigoschedule/scheduler-engine";
import { getAgendaMessages, type AgendaMessages } from "@zigoschedule/scheduler-core";
import { el, px } from "../dom";

const initials = (nome: string): string =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const safeImageSrc = (value: string | null): string => {
  const src = value?.trim() ?? "";
  if (!src) return "";
  const schemeIndex = src.indexOf(":");
  if (schemeIndex === -1) return src;

  const scheme = src.slice(0, schemeIndex).toLowerCase();
  if (scheme === "http" || scheme === "https" || scheme === "blob") return src;
  if (scheme === "data" && /^data:image\//i.test(src)) return src;
  return "";
};

/** Photo when there is one, initials when there is not. */
const buildAvatar = (professional: Professional): HTMLElement => {
  const photoUrl = safeImageSrc(getProfessionalPhotoUrl(professional));
  if (photoUrl) {
    const img = document.createElement("img");
    img.className = "za-avatar";
    img.src = photoUrl;
    img.alt = "";
    img.width = 24;
    img.height = 24;
    img.decoding = "async";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    return img;
  }
  const fallback = el("span", "za-avatar za-initials");
  fallback.textContent = initials(getProfessionalName(professional));
  return fallback;
};

/** Column titles. Stays put vertically and follows the grid horizontally. */
export const buildHeader = (
  layout: AgendaLayout,
  professionals: Professional[] = [],
  messages: AgendaMessages = getAgendaMessages()
): HTMLElement => {
  const header = el("div", "za-header");

  const corner = el("div", "za-corner");
  corner.style.width = px(layout.axisWidth);
  header.appendChild(corner);

  const track = el("div", "za-header-track");
  track.style.width = px(layout.totalWidth - layout.axisWidth);

  for (const column of layout.columns) {
    const cell = el("div", "za-header-cell");
    cell.style.left = px(column.left - layout.axisWidth);
    cell.style.width = px(column.width);

    const professional = professionals.find((p) => p.id === column.professionalId);
    if (professional) cell.appendChild(buildAvatar(professional));

    const stack = el("div", "za-header-stack");

    const label = el("span", "za-header-label");
    label.textContent = column.label;

    const sub = el("span", "za-header-sub");
    sub.textContent = column.isClosed ? column.closedLabel ?? messages.closed : column.sublabel;

    stack.append(label, sub);
    cell.appendChild(stack);
    track.appendChild(cell);
  }

  header.appendChild(track);
  return header;
};
