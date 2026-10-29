import { DayVouchers, todayInZagreb } from "./day-vouchers";

export const dynamic = "force-dynamic";

export default function AdminOverview() {
  return <DayVouchers day={todayInZagreb()} title="Pregled" />;
}
