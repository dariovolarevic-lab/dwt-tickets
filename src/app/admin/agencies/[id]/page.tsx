import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { AgencySettingsForm } from "./agency-settings-form";

const STATUS_LABEL = { PENDING: "Na čekanju", APPROVED: "Odobrena", REJECTED: "Odbijena" } as const;

export default async function AgencyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const agency = await prisma.user.findFirst({ where: { id, role: "PARTNER" } });
  if (!agency) notFound();

  const approve = agency.status !== "APPROVED";

  return (
    <>
      <PageHeader
        title={approve ? "Odobrenje agencije" : "Postavke agencije"}
        description={approve ? "Dodijelite oznaku i proviziju, zatim odobrite agenciju." : undefined}
      />

      <dl className="mb-6 grid max-w-xl gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm shadow-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-slate-500">Agencija</dt>
          <dd className="font-medium">{agency.agencyName}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Status</dt>
          <dd>
            <Badge kind={agency.status}>{STATUS_LABEL[agency.status]}</Badge>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Kontakt osoba</dt>
          <dd className="font-medium">{agency.contactPerson}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">E-pošta</dt>
          <dd className="font-medium">{agency.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Registrirana</dt>
          <dd className="font-medium">{formatDate(agency.createdAt)}</dd>
        </div>
      </dl>

      <AgencySettingsForm
        id={agency.id}
        approve={approve}
        initial={{
          agencyCode: agency.agencyCode ?? "",
          commissionPercent: agency.commissionPercent.toString().replace(".", ","),
          canUseK: agency.canUseK,
        }}
      />
    </>
  );
}
