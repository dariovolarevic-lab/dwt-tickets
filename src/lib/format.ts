export function formatMoney(value: { toString(): string } | number | string | null | undefined) {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "number" ? value : Number(value.toString());
  return new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR" }).format(n);
}

export function formatDate(d: Date) {
  return new Intl.DateTimeFormat("hr-HR", { dateStyle: "medium" }).format(d);
}
