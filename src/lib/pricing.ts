// Prices are handled in integer cents to avoid floating point errors.
export function toCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function calcDiscountCents(totalCents: number, percent: string | number): number {
  // Percent has at most two decimals, so work in hundredths of a percent
  const hundredths = Math.round(Number(percent) * 100);
  return Math.round((totalCents * hundredths) / 10000);
}

export function calcTotalCents(adults: number, children: number, priceAdult: string, priceChild: string | null) {
  return adults * toCents(priceAdult) + children * (priceChild ? toCents(priceChild) : 0);
}
