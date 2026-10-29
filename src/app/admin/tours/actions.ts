"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type TourFormState = { error?: string; values?: Record<string, string> } | undefined;

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const PRICE_RE = /^\d{1,8}([.,]\d{1,2})?$/;

const price = (label: string) =>
  z
    .string()
    .trim()
    .regex(PRICE_RE, `${label}: unesite iznos, npr. 25 ili 25,50`)
    .transform((v) => v.replace(",", "."));

const tourSchema = z.object({
  name: z.string().trim().min(2, "Naziv ture je obavezan"),
  description: z.string().trim().optional(),
  meetingPoint: z.string().trim().min(2, "Mjesto okupljanja je obavezno"),
  departureTimes: z
    .string()
    .transform((v) => v.split(/[\s,;]+/).filter(Boolean))
    .pipe(
      z
        .array(z.string().regex(TIME_RE, "Vremena polaska moraju biti u formatu HH:mm, npr. 10:00, 14:30"))
        .min(1, "Unesite barem jedno vrijeme polaska"),
    )
    .transform((v) => [...new Set(v)].sort()),
  priceAdult: price("Cijena za odrasle"),
  priceChild: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .pipe(price("Cijena za djecu").nullable()),
});

export async function saveTourAction(
  id: string | null,
  _prev: TourFormState,
  formData: FormData,
): Promise<TourFormState> {
  await requireUser("ADMIN");

  const values = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    meetingPoint: String(formData.get("meetingPoint") ?? ""),
    departureTimes: String(formData.get("departureTimes") ?? ""),
    priceAdult: String(formData.get("priceAdult") ?? ""),
    priceChild: String(formData.get("priceChild") ?? ""),
    active: formData.get("active") === "on" ? "on" : "",
  };

  const parsed = tourSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  const { description, ...rest } = parsed.data;
  const data = { ...rest, description: description || null, active: values.active === "on" };

  if (id) {
    const exists = await prisma.tour.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return { error: "Tura više ne postoji.", values };
    await prisma.tour.update({ where: { id }, data });
  } else {
    await prisma.tour.create({ data });
  }

  revalidatePath("/admin/tours");
  revalidatePath("/admin");
  revalidatePath("/partner");
  redirect("/admin/tours");
}

export async function toggleTourActiveAction(id: string, active: boolean) {
  await requireUser("ADMIN");
  await prisma.tour.update({ where: { id }, data: { active } });
  revalidatePath("/admin/tours");
  revalidatePath("/admin");
  revalidatePath("/partner");
}

// Tours referenced by vouchers can't be deleted (billing history), so they are deactivated instead.
export async function deleteTourAction(id: string) {
  await requireUser("ADMIN");
  const used = await prisma.voucher.count({ where: { tourId: id } });
  if (used > 0) {
    await prisma.tour.update({ where: { id }, data: { active: false } });
  } else {
    await prisma.tour.deleteMany({ where: { id } });
  }
  revalidatePath("/admin/tours");
  revalidatePath("/admin");
  revalidatePath("/partner");
}
