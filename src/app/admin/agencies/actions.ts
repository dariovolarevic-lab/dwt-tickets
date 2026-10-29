"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client/wasm";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AGENCY_CODE_RE } from "@/lib/voucher-code";

export type AgencyFormState = { error?: string; values?: Record<string, string> } | undefined;

const settingsSchema = z.object({
  agencyCode: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(AGENCY_CODE_RE, "Oznaka agencije mora imati 2–5 znakova (slova A–Z i brojevi)")),
  commissionPercent: z
    .string()
    .trim()
    .transform((v) => (v === "" ? "0" : v.replace(",", ".")))
    .pipe(
      z
        .string()
        .regex(/^\d{1,3}(\.\d{1,2})?$/, "Provizija mora biti postotak, npr. 10 ili 12,5")
        .refine((v) => Number(v) <= 100, "Provizija ne može biti veća od 100%"),
    ),
});

// Saves the agency code, commission and K permission. When `approve` is true the agency is approved in the same step.
export async function saveAgencySettingsAction(
  id: string,
  approve: boolean,
  _prev: AgencyFormState,
  formData: FormData,
): Promise<AgencyFormState> {
  await requireUser("ADMIN");

  const values = {
    agencyCode: String(formData.get("agencyCode") ?? ""),
    commissionPercent: String(formData.get("commissionPercent") ?? ""),
    canUseK: formData.get("canUseK") === "on" ? "on" : "",
  };
  const parsed = settingsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values };

  try {
    const res = await prisma.user.updateMany({
      where: { id, role: "PARTNER" },
      data: {
        agencyCode: parsed.data.agencyCode,
        commissionPercent: parsed.data.commissionPercent,
        canUseK: values.canUseK === "on",
        ...(approve ? { status: "APPROVED", approvedAt: new Date() } : {}),
      },
    });
    if (res.count === 0) return { error: "Agencija ne postoji.", values };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `Oznaka ${parsed.data.agencyCode} već je dodijeljena drugoj agenciji.`, values };
    }
    throw e;
  }

  revalidatePath("/admin/agencies");
  revalidatePath("/admin");
  redirect("/admin/agencies?status=" + (approve ? "APPROVED" : "ALL"));
}

// Approval always goes through saveAgencySettingsAction (an agency code is required), so this only rejects/suspends
export async function rejectAgencyAction(userId: string) {
  await requireUser("ADMIN");

  // Scoped to PARTNER so an admin account can never be changed here
  await prisma.user.updateMany({
    where: { id: userId, role: "PARTNER" },
    data: { status: "REJECTED", approvedAt: null },
  });

  revalidatePath("/admin/agencies");
  revalidatePath("/admin");
}
