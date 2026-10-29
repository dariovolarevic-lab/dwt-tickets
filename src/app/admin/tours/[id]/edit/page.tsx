import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/dashboard-shell";
import { timesOf } from "@/lib/tour-times";
import { TourForm } from "../../tour-form";

export default async function EditTourPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tour = await prisma.tour.findUnique({ where: { id } });
  if (!tour) notFound();

  return (
    <>
      <PageHeader title="Uredi turu" />
      <TourForm
        id={tour.id}
        initial={{
          name: tour.name,
          description: tour.description ?? "",
          meetingPoint: tour.meetingPoint,
          departureTimes: timesOf(tour.departureTimes).join(", "),
          priceAdult: tour.priceAdult.toString().replace(".", ","),
          priceChild: tour.priceChild?.toString().replace(".", ",") ?? "",
          active: tour.active,
        }}
      />
    </>
  );
}
