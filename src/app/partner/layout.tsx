import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/session";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("PARTNER");

  return (
    <DashboardShell
      title="Partnerski portal"
      userLabel={user.agencyName}
      nav={[
        { href: "/partner", label: "Ture" },
        { href: "/partner/vouchers/new", label: "Izdaj vaučer" },
        { href: "/partner/history", label: "Povijest" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
