"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PIN_RE, PIN_SETTING_KEY } from "@/lib/checkin";

export type PinFormState = { error?: string; ok?: boolean } | undefined;

export async function setGuidePinAction(_prev: PinFormState, formData: FormData): Promise<PinFormState> {
  await requireUser("ADMIN");

  const pin = String(formData.get("pin") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!PIN_RE.test(pin)) return { error: "PIN mora imati 4 do 10 znamenki." };
  if (pin !== confirm) return { error: "PIN-ovi se ne podudaraju." };

  const value = await bcrypt.hash(pin, 12);
  await prisma.appSetting.upsert({
    where: { key: PIN_SETTING_KEY },
    create: { key: PIN_SETTING_KEY, value },
    update: { value },
  });

  revalidatePath("/admin/settings");
  return { ok: true };
}
