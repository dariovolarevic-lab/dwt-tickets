import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { fromCents } from "@/lib/pricing";

export type Basis = "issued" | "tour";
export type Kind = "all" | "k" | "regular";
export type Filters = { from: string; to: string; agencyId: string | null; basis: Basis; kind: Kind };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TZ = "Europe/Zagreb";

function isValidDate(s: string | undefined): s is string {
  if (!s || !DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function todayZagreb(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function monthBounds(anyDateInMonth: string): { from: string; to: string } {
  const [y, m] = anyDateInMonth.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

export function previousMonthBounds(anyDateInMonth: string) {
  return monthBounds(addDays(monthBounds(anyDateInMonth).from, -1));
}

function zagrebOffsetMs(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second")) - utcMs;
}

// UTC instant at which the given calendar day starts in Zagreb (handles DST)
export function zagrebStartOfDay(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d);
  const t = guess - zagrebOffsetMs(guess - zagrebOffsetMs(guess));
  return new Date(t);
}

export function parseFilters(sp: Record<string, string | undefined>): Filters {
  const def = monthBounds(todayZagreb());
  let from = isValidDate(sp.from) ? sp.from : def.from;
  let to = isValidDate(sp.to) ? sp.to : def.to;
  if (from > to) [from, to] = [to, from];
  return {
    from,
    to,
    agencyId: sp.agency || null,
    basis: sp.basis === "tour" ? "tour" : "issued",
    kind: sp.kind === "k" || sp.kind === "regular" ? sp.kind : "all",
  };
}

export function filtersToQuery(f: Filters, extra: Record<string, string> = {}) {
  const q = new URLSearchParams({ from: f.from, to: f.to, basis: f.basis, kind: f.kind, ...extra });
  if (f.agencyId) q.set("agency", f.agencyId);
  return q.toString();
}

function whereFor(f: Filters): Prisma.VoucherWhereInput {
  return {
    ...(f.agencyId ? { userId: f.agencyId } : {}),
    ...(f.kind === "k" ? { isK: true } : f.kind === "regular" ? { isK: false } : {}),
    ...(f.basis === "issued"
      ? { createdAt: { gte: zagrebStartOfDay(f.from), lt: zagrebStartOfDay(addDays(f.to, 1)) } }
      : { tourDate: { gte: new Date(`${f.from}T00:00:00Z`), lte: new Date(`${f.to}T00:00:00Z`) } }),
  };
}

export type AgencySummary = {
  agencyId: string;
  agencyName: string;
  vouchers: number;
  adults: number;
  children: number;
  total: string; // gross
  discount: string;
  net: string; // amount due
  percentLabel: string; // e.g. "10 %" or "10 % / 15 %" if the rate changed inside the period
};

export type VoucherRow = {
  id: string;
  code: string;
  agencyId: string;
  agencyName: string;
  tourName: string;
  tourDate: Date;
  timeSlot: string;
  adults: number;
  children: number;
  priceAdult: string;
  priceChild: string;
  totalPrice: string;
  discountPercent: string;
  discountAmount: string;
  netAmount: string;
  createdAt: Date;
};

export type Report = {
  summary: AgencySummary[];
  vouchers: VoucherRow[];
  totals: { vouchers: number; adults: number; children: number; total: string; discount: string; net: string };
  truncated: boolean;
};

const cents = (v: { toString(): string } | null | undefined) => Math.round(Number(v?.toString() ?? 0) * 100);
const pct = (v: { toString(): string }) => `${Number(v.toString()).toString().replace(".", ",")} %`;

export async function loadReport(f: Filters, opts: { voucherLimit?: number } = {}): Promise<Report> {
  const where = whereFor(f);

  const [grouped, rows] = await Promise.all([
    // Grouped by percent too, so a rate change inside the period is reported accurately
    prisma.voucher.groupBy({
      by: ["userId", "commissionPercent"],
      where,
      _count: { _all: true },
      _sum: { adults: true, children: true, totalPrice: true, discountAmount: true, netAmount: true },
    }),
    prisma.voucher.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: { user: { select: { agencyName: true } }, tour: { select: { name: true } } },
      ...(opts.voucherLimit ? { take: opts.voucherLimit + 1 } : {}),
    }),
  ]);

  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(grouped.map((g) => g.userId))] } },
    select: { id: true, agencyName: true },
  });
  const names = new Map(users.map((u) => [u.id, u.agencyName]));

  // Merge the per-percent groups into one row per agency (sums in cents are exact)
  const acc = new Map<
    string,
    { vouchers: number; adults: number; children: number; total: number; discount: number; net: number; percents: { v: number; label: string }[] }
  >();
  for (const g of grouped) {
    const a = acc.get(g.userId) ?? { vouchers: 0, adults: 0, children: 0, total: 0, discount: 0, net: 0, percents: [] };
    a.vouchers += g._count._all;
    a.adults += g._sum.adults ?? 0;
    a.children += g._sum.children ?? 0;
    a.total += cents(g._sum.totalPrice);
    a.discount += cents(g._sum.discountAmount);
    a.net += cents(g._sum.netAmount);
    a.percents.push({ v: Number(g.commissionPercent.toString()), label: pct(g.commissionPercent) });
    acc.set(g.userId, a);
  }

  const summary: AgencySummary[] = [...acc.entries()]
    .map(([agencyId, a]) => ({
      agencyId,
      agencyName: names.get(agencyId) ?? "—",
      vouchers: a.vouchers,
      adults: a.adults,
      children: a.children,
      total: fromCents(a.total),
      discount: fromCents(a.discount),
      net: fromCents(a.net),
      percentLabel: a.percents.sort((x, y) => x.v - y.v).map((p) => p.label).join(" / "),
    }))
    .sort((a, b) => a.agencyName.localeCompare(b.agencyName, "hr"));

  const truncated = !!opts.voucherLimit && rows.length > opts.voucherLimit;
  const sum = (pick: (s: AgencySummary) => string) => summary.reduce((t, s) => t + cents(pick(s)), 0);

  return {
    summary,
    vouchers: (truncated ? rows.slice(0, opts.voucherLimit) : rows).map((v) => ({
      id: v.id,
      code: v.code,
      agencyId: v.userId,
      agencyName: v.user.agencyName,
      tourName: v.tour.name,
      tourDate: v.tourDate,
      timeSlot: v.timeSlot,
      adults: v.adults,
      children: v.children,
      priceAdult: v.priceAdult.toFixed(2),
      priceChild: v.priceChild.toFixed(2),
      totalPrice: v.totalPrice.toFixed(2),
      discountPercent: pct(v.commissionPercent),
      discountAmount: v.discountAmount.toFixed(2),
      netAmount: v.netAmount.toFixed(2),
      createdAt: v.createdAt,
    })),
    totals: {
      vouchers: summary.reduce((a, s) => a + s.vouchers, 0),
      adults: summary.reduce((a, s) => a + s.adults, 0),
      children: summary.reduce((a, s) => a + s.children, 0),
      total: fromCents(sum((s) => s.total)),
      discount: fromCents(sum((s) => s.discount)),
      net: fromCents(sum((s) => s.net)),
    },
    truncated,
  };
}
