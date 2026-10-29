import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard-shell";
import { btn } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export default async function VoucherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser("PARTNER");
  const v = await prisma.voucher.findFirst({ where: { id, userId: user.id }, include: { tour: true } });
  if (!v) notFound();

  const pdf = `/api/vouchers/${v.id}/pdf`;
  const date = new Intl.DateTimeFormat("hr-HR", { dateStyle: "full", timeZone: "UTC" }).format(v.tourDate);

  return (
    <>
      <PageHeader title="Vaučer izdan" description={`Kod: ${v.code}`} />
      <div className="mb-6 flex flex-wrap gap-2">
        <a href={`${pdf}?download=1`} className={btn.primary}>
          Preuzmi PDF
        </a>
        <a href={pdf} target="_blank" rel="noopener" className={btn.secondary}>
          Otvori / ispiši
        </a>
        <Link href="/partner/vouchers/new" className={btn.secondary}>
          Izdaj novi vaučer
        </Link>
        <Link href="/partner/history" className={btn.secondary}>
          Povijest
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <dl className="h-fit space-y-3 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
          {[
            ["Tura", v.tour.name],
            ["Datum", date],
            ["Polazak", v.timeSlot],
            ["Odrasli", String(v.adults)],
            ["Djeca", String(v.children)],
            ["Ukupno", formatMoney(v.totalPrice)],
          ].map(([k, val]) => (
            <div key={k}>
              <dt className="text-xs uppercase text-slate-500">{k}</dt>
              <dd className="font-medium">{val}</dd>
            </div>
          ))}
        </dl>
        <iframe src={pdf} title="Pregled PDF vaučera" className="h-[720px] w-full rounded-xl border border-slate-200 bg-white" />
      </div>
    </>
  );
}
