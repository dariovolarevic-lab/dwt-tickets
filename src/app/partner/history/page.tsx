import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader, Placeholder } from "@/components/dashboard-shell";
import { btn } from "@/components/ui";
import { formatMoney } from "@/lib/format";

const dateFmt = new Intl.DateTimeFormat("hr-HR", { dateStyle: "medium", timeZone: "UTC" });
const stampFmt = new Intl.DateTimeFormat("hr-HR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Zagreb" });
const timeFmt = new Intl.DateTimeFormat("hr-HR", { timeStyle: "short", timeZone: "Europe/Zagreb" });

export default async function HistoryPage() {
  const user = await requireUser("PARTNER");
  const vouchers = await prisma.voucher.findMany({
    where: { userId: user.id },
    include: { tour: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageHeader title="Povijest vaučera" description="Vaučeri koje je izdala vaša agencija (zadnjih 200)." />
      {vouchers.length === 0 ? (
        <Placeholder>
          Još niste izdali nijedan vaučer.{" "}
          <Link href="/partner/vouchers/new" className="font-medium text-emerald-700 hover:underline">
            Izdaj prvi
          </Link>
        </Placeholder>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Kod</th>
                <th className="px-4 py-3">Tura</th>
                <th className="px-4 py-3">Datum i vrijeme</th>
                <th className="px-4 py-3">Osobe</th>
                <th className="px-4 py-3">Ukupno</th>
                <th className="px-4 py-3">Izdano</th>
                <th className="px-4 py-3">Dolazak</th>
                <th className="px-4 py-3 text-right">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vouchers.map((v) => (
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
                  <td className="px-4 py-3 font-medium">{v.tour.name}</td>
                  <td className="px-4 py-3">
                    {dateFmt.format(v.tourDate)}, {v.timeSlot}
                  </td>
                  <td className="px-4 py-3">
                    {v.adults + v.children}
                    <span className="text-slate-500"> ({v.adults}+{v.children})</span>
                  </td>
                  <td className="px-4 py-3">{formatMoney(v.totalPrice)}</td>
                  <td className="px-4 py-3 text-slate-600">{stampFmt.format(v.createdAt)}</td>
                  <td className="px-4 py-3">
                    {v.checkedInAt ? (
                      <span className="whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        ✓ Došao {timeFmt.format(v.checkedInAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/partner/vouchers/${v.id}`} className={btn.secondary}>
                        Otvori
                      </Link>
                      <a href={`/api/vouchers/${v.id}/pdf?download=1`} className={btn.secondary}>
                        Preuzmi
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
