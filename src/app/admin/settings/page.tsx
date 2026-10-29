import { PageHeader } from "@/components/dashboard-shell";
import { Badge } from "@/components/ui";
import { getPinHash } from "@/lib/checkin";
import { PinForm } from "./pin-form";
import { DeparturesSection } from "./departures-section";

export default async function SettingsPage() {
  const hasPin = !!(await getPinHash());

  return (
    <>
      <PageHeader
        title="Postavke"
        description="PIN koji vodiči upisuju kad skeniraju QR kod vaučera i potvrđuju dolazak gostiju."
      />
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="text-slate-500">Status:</span>
        {hasPin ? <Badge kind="ACTIVE">PIN postavljen</Badge> : <Badge kind="PENDING">PIN nije postavljen — potvrda dolaska je isključena</Badge>}
      </div>
      <PinForm hasPin={hasPin} />
      <p className="mt-4 max-w-xl text-sm text-slate-500">
        Nakon promjene PIN-a svi vodiči moraju ponovno upisati novi PIN na svom mobitelu. Mobitel pamti PIN do 30 dana.
      </p>
      <DeparturesSection />
    </>
  );
}
