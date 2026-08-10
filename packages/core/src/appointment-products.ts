export type AppointmentProductSelection = {
  produtoId: string;
  quantidade: number;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeAppointmentProducts(
  value: unknown,
): AppointmentProductSelection[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;

  const seen = new Set<string>();
  const products: AppointmentProductSelection[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const record = raw as { produtoId?: unknown; quantidade?: unknown };
    const produtoId =
      typeof record.produtoId === "string" ? record.produtoId.trim() : "";
    const quantidade = Number(record.quantidade);
    if (
      !UUID_RE.test(produtoId) ||
      !Number.isInteger(quantidade) ||
      quantidade < 1 ||
      quantidade > 999 ||
      seen.has(produtoId)
    ) {
      return null;
    }
    seen.add(produtoId);
    products.push({ produtoId, quantidade });
  }

  return products;
}
