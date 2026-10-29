import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { timesOf } from "@/lib/tour-times";
import { PageHeader, Placeholder } from "@/components/dashboard-shell";
import { VoucherForm } from "./voucher-form";

export default async function NewVoucherPage({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string }>;
}) {
  const { tour } = await searchParams;
  const user = await requireUser("PARTNER");
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zagreb" }).format(new Date());
  const [agency, tours, closedDepartures] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { agencyCode: true, canUseK: true } }),
    prisma.tour.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.closedDeparture.findMany({
      where: { tourDate: { gte: new Date(`${today}T00:00:00.000Z`) } },
      select: { tourId: true, tourDate: true, timeSlot: true },
    }),
  ]);

  return (
    <>
      <PageHeader title="Izdaj vaučer" description="Odaberite turu, unesite podatke o rezervaciji i generirajte PDF." />
      {!agency?.agencyCode ? (
        <Placeholder>Vašoj agenciji još nije dodijeljena oznaka. Obratite se administratoru.</Placeholder>
      ) : tours.length === 0 ? (
        <Placeholder>Trenutno nema dostupnih tura.</Placeholder>
      ) : (
        <VoucherForm
          defaultTourId={tour}
          today={today}
          canUseK={agency.canUseK}
          closedDepartures={closedDepartures.map((departure) => ({
            tourId: departure.tourId,
            tourDate: departure.tourDate.toISOString().slice(0, 10),
            timeSlot: departure.timeSlot,
          }))}
          tours={tours.map((t) => ({
            id: t.id,
            name: t.name,
            departureTimes: timesOf(t.departureTimes),
            priceAdult: t.priceAdult.toFixed(2),
            priceChild: t.priceChild?.toFixed(2) ?? null,
          }))}
        />
      )}
    </>
  );
}
