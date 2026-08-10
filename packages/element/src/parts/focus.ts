const FOCUSABLE = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export const activeElementFor = (root: HTMLElement): Element | null => {
  const tree = root.getRootNode();
  if (!(tree instanceof ShadowRoot)) return root.ownerDocument.activeElement;

  try {
    return tree.activeElement;
  } catch {
    return root.ownerDocument.activeElement;
  }
};

const focusableElements = (root: HTMLElement): HTMLElement[] =>
  [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (node) => !node.hasAttribute("disabled") && node.getAttribute("aria-hidden") !== "true"
  );

export const keepFocusInside = (
  event: KeyboardEvent,
  root: HTMLElement,
  sheet: HTMLElement
): void => {
  const tabbables = focusableElements(sheet);
  if (tabbables.length === 0) {
    event.preventDefault();
    sheet.focus();
    return;
  }

  const first = tabbables[0];
  const last = tabbables[tabbables.length - 1];
  const active = activeElementFor(root);
  const leavingStart = event.shiftKey && (active === first || !sheet.contains(active));
  const leavingEnd = !event.shiftKey && (active === last || !sheet.contains(active));

  if (!leavingStart && !leavingEnd) return;
  event.preventDefault();
  (event.shiftKey ? last : first).focus();
};
