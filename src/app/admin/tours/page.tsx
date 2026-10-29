import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Placeholder } from "@/components/dashboard-shell";
import { Badge, btn } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { timesOf } from "@/lib/tour-times";
import { toggleTourActiveAction } from "./actions";
import { DeleteTourButton } from "./delete-tour-button";

export default async function ToursPage() {
  const tours = await prisma.tour.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { vouchers: true } } },
  });

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <PageHeader title="Ture" description="Upravljanje turama, vremenima polaska i cijenama." />
        <Link href="/admin/tours/new" className={btn.primary}>
          + Nova tura
        </Link>
      </div>

      {tours.length === 0 ? (
        <Placeholder>Još nema tura. Dodajte prvu.</Placeholder>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Tura</th>
                <th className="px-4 py-3">Polasci</th>
                <th className="px-4 py-3">Odrasli</th>
                <th className="px-4 py-3">Djeca</th>
                <th className="px-4 py-3">Vaučeri</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Radnje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tours.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium">{t.name}</td>
                  <td className="px-4 py-3 text-slate-600">{timesOf(t.departureTimes).join(", ")}</td>
                  <td className="px-4 py-3">{formatMoney(t.priceAdult)}</td>
                  <td className="px-4 py-3">{formatMoney(t.priceChild)}</td>
                  <td className="px-4 py-3">{t._count.vouchers}</td>
                  <td className="px-4 py-3">
                    <Badge kind={t.active ? "ACTIVE" : "INACTIVE"}>{t.active ? "Aktivna" : "Neaktivna"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/tours/${t.id}/edit`} className={btn.secondary}>
                        Uredi
                      </Link>
                      <form action={toggleTourActiveAction.bind(null, t.id, !t.active)}>
                        <button className={btn.secondary}>{t.active ? "Deaktiviraj" : "Aktiviraj"}</button>
                      </form>
                      <DeleteTourButton id={t.id} name={t.name} />
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
