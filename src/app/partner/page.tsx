import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { btn } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { timesOf } from "@/lib/tour-times";
import { PageHeader, Placeholder } from "@/components/dashboard-shell";

export default async function PartnerTours() {
  const tours = await prisma.tour.findMany({ where: { active: true }, orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader title="Dostupne ture" />
      {tours.length === 0 ? (
        <Placeholder>Još nema dostupnih tura.</Placeholder>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {tours.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold">{t.name}</h2>
              <p className="mt-1 text-sm text-slate-500">Polasci: {timesOf(t.departureTimes).join(", ")}</p>
              <p className="mt-3 text-sm">
                Odrasli <span className="font-medium">{formatMoney(t.priceAdult)}</span>
                {t.priceChild && (
                  <>
                    {" · "}Djeca <span className="font-medium">{formatMoney(t.priceChild)}</span>
                  </>
                )}
              </p>
              <Link href={`/partner/vouchers/new?tour=${t.id}`} className={`${btn.primary} mt-4 inline-block`}>
                Izdaj vaučer
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
