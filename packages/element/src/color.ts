const channels = (hex: string): [number, number, number] | null => {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
};

/**
 * Ink that stays readable over a colored card.
 *
 * Uses Rec. 601 weights because the eye reads green as far brighter than blue:
 * averaging the channels would put white text on yellow.
 */
export const readableInk = (hex: string): string => {
  const rgb = channels(hex);
  if (!rgb) return "#0f172a";
  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0f172a" : "#ffffff";
};

/** The same color, translucent - used for the card body behind the text. */
export const withAlpha = (hex: string, alpha: number): string => {
  const rgb = channels(hex);
  if (!rgb) return hex;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
};
