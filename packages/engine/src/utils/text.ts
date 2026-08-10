export function truncateProfessionalName(name: string, maxChars = 14): string {
  const normalized = name.trim().replace(/\s+/g, " ");
  const safeMax = Math.max(0, Math.floor(maxChars));

  if (normalized.length <= safeMax) return normalized;
  if (safeMax === 0) return "";
  if (safeMax <= 3) return ".".repeat(safeMax);

  return `${normalized.slice(0, safeMax - 3).trimEnd()}...`;
}
