/** Minimal DOM helpers. Everything in this package builds on these two. */

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
};

export const px = (value: number): string => `${Math.round(value)}px`;
