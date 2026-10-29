import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Placeholder } from "@/components/dashboard-shell";
import { btn, fieldClass } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import {
  filtersToQuery,
  loadReport,
  monthBounds,
  parseFilters,
  previousMonthBounds,
  todayZagreb,
  type Filters,
} from "@/lib/billing";

const VOUCHER_LIMIT = 500;
const discountText = (amount: string) => (Number(amount) > 0 ? `−${formatMoney(amount)}` : "—");
const dateFmt = new Intl.DateTimeFormat("hr-HR", { dateStyle: "short", timeZone: "UTC" });
const stampFmt = new Intl.DateTimeFormat("hr-HR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Zagreb" });

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const [report, agencies] = await Promise.all([
    loadReport(filters, { voucherLimit: VOUCHER_LIMIT }),
    prisma.user.findMany({
      where: { role: "PARTNER", status: "APPROVED" },
      select: { id: true, agencyName: true },
      orderBy: { agencyName: "asc" },
    }),
  ]);

  const today = todayZagreb();
  const thisMonth = monthBounds(today);
  const lastMonth = previousMonthBounds(today);
  const preset = (r: { from: string; to: string }): Filters => ({ ...filters, ...r });

  const exportHref = (format: string) => `/api/admin/billing/export?${filtersToQuery(filters, { format })}`;

  return (
    <>
      <PageHeader title="Evidencija i izvještaji" description="Vaučeri i iznosi za naplatu po agenciji." />

      <form method="get" className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="block text-sm font-medium">
            Agencija
            <select name="agency" defaultValue={filters.agencyId ?? ""} className={fieldClass}>
              <option value="">Sve agencije</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.agencyName}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Od
            <input type="date" name="from" defaultValue={filters.from} required className={fieldClass} />
          </label>
          <label className="block text-sm font-medium">
            Do
            <input type="date" name="to" defaultValue={filters.to} required className={fieldClass} />
          </label>
          <label className="block text-sm font-medium">
            Razdoblje po
            <select name="basis" defaultValue={filters.basis} className={fieldClass}>
              <option value="issued">Datumu izdavanja</option>
              <option value="tour">Datumu ture</option>
            </select>
          </label>
          <label className="block text-sm font-medium">
            Vrsta vaučera
            <select name="kind" defaultValue={filters.kind} className={fieldClass}>
              <option value="all">Svi</option>
              <option value="k">Samo K</option>
              <option value="regular">Bez K</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="submit" className={btn.primary}>
            Primijeni
          </button>
          <Link href={`/admin/billing?${filtersToQuery(preset(thisMonth))}`} className={btn.secondary}>
            Ovaj mjesec
          </Link>
          <Link href={`/admin/billing?${filtersToQuery(preset(lastMonth))}`} className={btn.secondary}>
            Prošli mjesec
          </Link>
        </div>
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Izdani vaučeri" value={String(report.totals.vouchers)} />
        <Stat label="Gosti (odrasli + djeca)" value={`${report.totals.adults + report.totals.children}`} />
        <Stat label="Ukupno" value={formatMoney(report.totals.total)} />
        <Stat label="Iznos za naplatu" value={formatMoney(report.totals.net)} highlight />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-slate-600">Izvoz:</span>
        <a href={exportHref("csv-summary")} className={btn.secondary}>
          CSV (sažetak)
        </a>
        <a href={exportHref("csv-vouchers")} className={btn.secondary}>
          CSV (vaučeri)
        </a>
        <a href={exportHref("xlsx")} className={btn.secondary}>
          Excel
        </a>
        <a href={exportHref("pdf")} className={btn.secondary}>
          PDF
        </a>
        <a href={`${exportHref("pdf")}&inline=1`} target="_blank" rel="noopener" className={btn.secondary}>
          PDF pregled / ispis
        </a>
      </div>

      <h2 className="mb-2 mt-6 text-lg font-semibold">Sažetak po agenciji</h2>
      {report.summary.length === 0 ? (
        <Placeholder>Nema vaučera za odabrane filtere.</Placeholder>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Agencija</th>
                <th className="px-4 py-3 text-right">Vaučeri</th>
                <th className="px-4 py-3 text-right">Odrasli</th>
                <th className="px-4 py-3 text-right">Djeca</th>
                <th className="px-4 py-3 text-right">Ukupno</th>
                <th className="px-4 py-3 text-right">Popust</th>
                <th className="px-4 py-3 text-right">Iznos za naplatu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.summary.map((s) => (
                <tr key={s.agencyId}>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/admin/billing?${filtersToQuery({ ...filters, agencyId: s.agencyId })}`}
                      className="hover:text-emerald-700 hover:underline"
                    >
                      {s.agencyName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">{s.vouchers}</td>
                  <td className="px-4 py-3 text-right">{s.adults}</td>
                  <td className="px-4 py-3 text-right">{s.children}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(s.total)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {discountText(s.discount)} <span className="text-slate-500">({s.percentLabel})</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatMoney(s.net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-slate-200 bg-emerald-50 font-semibold">
              <tr>
                <td className="px-4 py-3">Ukupno</td>
                <td className="px-4 py-3 text-right">{report.totals.vouchers}</td>
                <td className="px-4 py-3 text-right">{report.totals.adults}</td>
                <td className="px-4 py-3 text-right">{report.totals.children}</td>
                <td className="px-4 py-3 text-right">{formatMoney(report.totals.total)}</td>
                <td className="px-4 py-3 text-right">{discountText(report.totals.discount)}</td>
                <td className="px-4 py-3 text-right">{formatMoney(report.totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {report.vouchers.length > 0 && (
        <>
          <h2 className="mb-2 mt-8 text-lg font-semibold">Vaučeri</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Kod</th>
                  <th className="px-4 py-3">Agencija</th>
                  <th className="px-4 py-3">Tura</th>
                  <th className="px-4 py-3">Datum ture</th>
                  <th className="px-4 py-3">Osobe</th>
                  <th className="px-4 py-3">Izdano</th>
                  <th className="px-4 py-3 text-right">Ukupno</th>
                  <th className="px-4 py-3 text-right">Popust</th>
                  <th className="px-4 py-3 text-right">Za naplatu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.vouchers.map((v) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3 font-mono text-xs">
                      <a
                        href={`/api/vouchers/${v.id}/pdf`}
                        target="_blank"
                        rel="noopener"
                        title="Otvori PDF vaučera"
                        className="whitespace-nowrap text-emerald-700 hover:underline"
                      >
                        {v.code}
                      </a>
                    </td>
                    <td className="px-4 py-3">{v.agencyName}</td>
                    <td className="px-4 py-3">{v.tourName}</td>
                    <td className="px-4 py-3">
                      {dateFmt.format(v.tourDate)}, {v.timeSlot}
                    </td>
                    <td className="px-4 py-3">
                      {v.adults + v.children}
                      <span className="text-slate-500"> ({v.adults}+{v.children})</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{stampFmt.format(v.createdAt)}</td>
                    <td className="px-4 py-3 text-right">{formatMoney(v.totalPrice)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {discountText(v.discountAmount)} <span className="text-slate-500">({v.discountPercent})</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatMoney(v.netAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {report.truncated && (
            <p className="mt-2 text-sm text-slate-500">
              Prikazano je prvih {VOUCHER_LIMIT} vaučera. Izvoz (CSV / Excel) sadrži sve.
            </p>
          )}
        </>
      )}
    </>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        highlight ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
