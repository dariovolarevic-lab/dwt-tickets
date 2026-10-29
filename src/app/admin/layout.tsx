import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("ADMIN");

  return (
    <DashboardShell
      title="Administracija"
      userLabel={user.email}
      nav={[
        { href: "/admin", label: "Pregled" },
        { href: "/admin/vouchers", label: "Vaučeri" },
        { href: "/admin/agencies", label: "Agencije" },
        { href: "/admin/tours", label: "Ture" },
        { href: "/admin/billing", label: "Evidencija" },
        { href: "/admin/settings", label: "Postavke" },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
