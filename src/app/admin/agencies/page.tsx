import Link from "next/link";
import type { UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PageHeader, Placeholder } from "@/components/dashboard-shell";
import { Badge, btn } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { rejectAgencyAction } from "./actions";

const TABS: { key: UserStatus | "ALL"; label: string }[] = [
  { key: "PENDING", label: "Na čekanju" },
  { key: "APPROVED", label: "Odobrene" },
  { key: "REJECTED", label: "Odbijene" },
  { key: "ALL", label: "Sve" },
];

const STATUS_LABEL: Record<UserStatus, string> = {
  PENDING: "Na čekanju",
  APPROVED: "Odobrena",
  REJECTED: "Odbijena",
};

export default async function AgenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = TABS.find((t) => t.key === status)?.key ?? "PENDING";

  const [agencies, grouped] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PARTNER", ...(active === "ALL" ? {} : { status: active }) },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.groupBy({ by: ["status"], where: { role: "PARTNER" }, _count: true }),
  ]);

  const counts: Record<string, number> = { ALL: 0 };
  for (const g of grouped) {
    counts[g.status] = g._count;
    counts.ALL += g._count;
  }

  return (
    <>
      <PageHeader title="Odobrenje agencija" description="Odobrite ili odbijte registracije partnera." />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/agencies?status=${t.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              active === t.key
                ? "bg-emerald-600 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label} ({counts[t.key] ?? 0})
          </Link>
        ))}
      </div>

      {agencies.length === 0 ? (
        <Placeholder>Nema agencija u ovoj kategoriji.</Placeholder>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Agencija</th>
                <th className="px-4 py-3">Kontakt</th>
                <th className="px-4 py-3">Registrirana</th>
                <th className="px-4 py-3">Oznaka</th>
                <th className="px-4 py-3">Provizija</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Radnje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agencies.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-medium">{a.agencyName}</td>
                  <td className="px-4 py-3">
                    <div>{a.contactPerson}</div>
                    <div className="text-slate-500">{a.email}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3">
                    {a.agencyCode ? (
                      <span className="font-mono font-medium">
                        {a.agencyCode}
                        {a.canUseK && (
                          <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 font-sans text-xs text-emerald-800">
                            K dopušten
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-amber-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{a.agencyCode ? `${a.commissionPercent.toString().replace(".", ",")} %` : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge kind={a.status}>{STATUS_LABEL[a.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {a.status === "APPROVED" ? (
                        <Link href={`/admin/agencies/${a.id}`} className={btn.secondary}>
                          Postavke
                        </Link>
                      ) : (
                        <Link href={`/admin/agencies/${a.id}`} className={btn.primary}>
                          Pregledaj i odobri
                        </Link>
                      )}
                      {a.status !== "REJECTED" && (
                        <form action={rejectAgencyAction.bind(null, a.id)}>
                          <button className={btn.danger}>
                            {a.status === "APPROVED" ? "Suspendiraj" : "Odbij"}
                          </button>
                        </form>
                      )}
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
