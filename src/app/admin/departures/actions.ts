"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { timesOf } from "@/lib/tour-times";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidDate(value: string) {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function revalidateDepartures() {
  revalidatePath("/admin/settings");
  revalidatePath("/partner");
  revalidatePath("/partner/vouchers/new");
}

export async function closeDepartureAction(formData: FormData) {
  await requireUser("ADMIN");

  const parsed = z.object({
    departure: z.string().min(1),
    tourDate: z.string().refine(isValidDate, "Unesite valjan datum polaska."),
  }).safeParse({
    departure: formData.get("departure"),
    tourDate: formData.get("tourDate"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const [tourId, timeSlot, extra] = parsed.data.departure.split("|");
  if (!tourId || !timeSlot || extra || !TIME_RE.test(timeSlot)) {
    throw new Error("Odaberite valjano vrijeme polaska.");
  }
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zagreb" }).format(new Date());
  if (parsed.data.tourDate < today) throw new Error("Datum polaska ne može biti u prošlosti.");

  const tour = await prisma.tour.findUnique({ where: { id: tourId }, select: { departureTimes: true } });
  if (!tour || !timesOf(tour.departureTimes).includes(timeSlot)) throw new Error("Odabrani polazak nije valjan.");

  await prisma.closedDeparture.upsert({
    where: {
      tourId_tourDate_timeSlot: {
        tourId,
        tourDate: new Date(`${parsed.data.tourDate}T00:00:00.000Z`),
        timeSlot,
      },
    },
    create: {
      tourId,
      tourDate: new Date(`${parsed.data.tourDate}T00:00:00.000Z`),
      timeSlot,
    },
    update: {},
  });

  revalidateDepartures();
}

export async function reopenDepartureAction(id: string) {
  await requireUser("ADMIN");
  await prisma.closedDeparture.deleteMany({ where: { id } });
  revalidateDepartures();
}
