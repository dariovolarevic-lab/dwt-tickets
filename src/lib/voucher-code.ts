// e.g. "DWT AT-00001-2026" or, for K vouchers, "DWT AT-K-00001-2026"
export function formatVoucherCode(p: { agencyCode: string; isK: boolean; sequence: number; year: number }): string {
  return `DWT ${p.agencyCode}-${p.isK ? "K-" : ""}${String(p.sequence).padStart(5, "0")}-${p.year}`;
}

export const AGENCY_CODE_RE = /^[A-Z0-9]{2,5}$/;
