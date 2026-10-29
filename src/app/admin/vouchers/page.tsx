import { DayVouchers, parseDay, todayInZagreb } from "../day-vouchers";

export default async function VouchersPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  return <DayVouchers day={parseDay(date) ?? todayInZagreb()} title="Vaučeri" navPath="/admin/vouchers" />;
}
