"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client/wasm";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { calcDiscountCents, calcTotalCents, fromCents } from "@/lib/pricing";
import { formatVoucherCode } from "@/lib/voucher-code";
import { newCheckToken } from "@/lib/checkin";
import { timesOf } from "@/lib/tour-times";

export type VoucherFormState = { error?: string } | undefined;

const schema = z.object({
  tourId: z.string().min(1, "Odaberite turu"),
  timeSlot: z.string().min(1, "Odaberite vrijeme polaska"),
  tourDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Unesite datum ture"),
  adults: z.coerce.number().int("Broj odraslih mora biti cijeli broj").min(1, "Potrebna je barem jedna odrasla osoba").max(99),
  children: z.coerce.number().int("Broj djece mora biti cijeli broj").min(0).max(99),
});

class ClosedDepartureError extends Error {}

function todayInZagreb() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zagreb" }).format(new Date());
}

export async function issueVoucherAction(_prev: VoucherFormState, formData: FormData): Promise<VoucherFormState> {
  const sessionUser = await requireUser("PARTNER");

  const parsed = schema.safeParse({
    tourId: formData.get("tourId") ?? "",
    timeSlot: formData.get("timeSlot") ?? "",
    tourDate: formData.get("tourDate") ?? "",
    adults: formData.get("adults") || "0",
    children: formData.get("children") || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const today = todayInZagreb();
  if (d.tourDate < today) return { error: "Datum ture ne može biti u prošlosti." };
  const date = new Date(`${d.tourDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== d.tourDate) {
    return { error: "Neispravan datum ture." };
  }

  // Agency settings are read fresh from the database, never trusted from the client
  const agency = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, agencyCode: true, commissionPercent: true, canUseK: true },
  });
  if (!agency?.agencyCode) {
    return { error: "Vašoj agenciji još nije dodijeljena oznaka. Obratite se administratoru." };
  }
  const agencyCode = agency.agencyCode;

  const isK = formData.get("isK") === "on";
  if (isK && !agency.canUseK) return { error: "Vaša agencija nema pravo korištenja oznake K." };

  const tour = await prisma.tour.findFirst({ where: { id: d.tourId, active: true } });
  if (!tour) return { error: "Odabrana tura više nije dostupna." };
  if (!timesOf(tour.departureTimes).includes(d.timeSlot)) return { error: "Odabrano vrijeme polaska nije valjano za ovu turu." };
  const closed = await prisma.closedDeparture.findUnique({
    where: { tourId_tourDate_timeSlot: { tourId: tour.id, tourDate: date, timeSlot: d.timeSlot } },
    select: { id: true },
  });
  if (closed) return { error: "Prodaja za ovaj polazak je zatvorena. Odaberite drugi polazak." };
  if (d.children > 0 && tour.priceChild === null) return { error: "Ova tura nema cijenu za djecu." };

  const priceAdult = tour.priceAdult.toFixed(2);
  const priceChild = tour.priceChild?.toFixed(2) ?? "0.00";
  const totalCents = calcTotalCents(d.adults, d.children, priceAdult, tour.priceChild ? priceChild : null);
  const discountCents = calcDiscountCents(totalCents, agency.commissionPercent.toString());
  const year = Number(today.slice(0, 4));

  // D1 has no transactions, so this runs as separate statements. The counter upsert is a single atomic statement,
  // so two simultaneous vouchers can never get the same number; a failure right after it could leave a gap in numbering.
  const issue = async () => {
      const closed = await prisma.closedDeparture.findUnique({
        where: { tourId_tourDate_timeSlot: { tourId: tour.id, tourDate: date, timeSlot: d.timeSlot } },
        select: { id: true },
      });
      if (closed) throw new ClosedDepartureError();

      const counter = await prisma.voucherCounter.upsert({
        where: { userId_year_isK: { userId: agency.id, year, isK } },
        create: { userId: agency.id, year, isK, lastNumber: 1 },
        update: { lastNumber: { increment: 1 } },
      });

      return prisma.voucher.create({
        data: {
          code: formatVoucherCode({ agencyCode, isK, sequence: counter.lastNumber, year }),
          isK,
          checkToken: newCheckToken(),
          userId: agency.id,
          tourId: tour.id,
          tourDate: date,
          timeSlot: d.timeSlot,
          adults: d.adults,
          children: d.children,
          priceAdult,
          priceChild,
          totalPrice: fromCents(totalCents),
          commissionPercent: agency.commissionPercent,
          discountAmount: fromCents(discountCents),
          netAmount: fromCents(totalCents - discountCents),
        },
        select: { id: true },
      });
  };

  let voucher;
  try {
    voucher = await issue();
  } catch (e) {
    if (e instanceof ClosedDepartureError) {
      return { error: "Prodaja za ovaj polazak je zatvorena. Odaberite drugi polazak." };
    }
    // Two simultaneous first vouchers of a year can still collide on the counter row, so retry once
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    try {
      voucher = await issue();
    } catch (retryError) {
      if (retryError instanceof ClosedDepartureError) {
        return { error: "Prodaja za ovaj polazak je zatvorena. Odaberite drugi polazak." };
      }
      throw retryError;
    }
  }

  revalidatePath("/partner/history");
  revalidatePath("/admin");
  redirect(`/partner/vouchers/${voucher.id}`);
}
