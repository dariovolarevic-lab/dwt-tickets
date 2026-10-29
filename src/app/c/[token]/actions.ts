"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  PIN_COOKIE,
  PIN_RE,
  clearPinFailures,
  getPinHash,
  isValidPinCookie,
  pinCookieValue,
  pinLockMinutes,
  registerPinFailure,
} from "@/lib/checkin";

export type ConfirmState = { error?: string } | undefined;

export async function confirmArrivalAction(token: string, _prev: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const pinHash = await getPinHash();
  if (!pinHash) return { error: "Check-in is not enabled yet. Please contact the office." };

  const jar = await cookies();
  if (!isValidPinCookie(jar.get(PIN_COOKIE)?.value, pinHash)) {
    const h = await headers();
    const client = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";

    const locked = pinLockMinutes(client);
    if (locked) return { error: `Too many wrong attempts. Try again in ${locked} min.` };

    const pin = String(formData.get("pin") ?? "");
    if (!PIN_RE.test(pin) || !(await bcrypt.compare(pin, pinHash))) {
      registerPinFailure(client);
      return { error: "Incorrect PIN." };
    }
    clearPinFailures(client);
    jar.set(PIN_COOKIE, pinCookieValue(pinHash), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/c",
    });
  }

  // Only the first confirmation wins, so double scans can't overwrite the arrival time
  await prisma.voucher.updateMany({ where: { checkToken: token, checkedInAt: null }, data: { checkedInAt: new Date() } });

  revalidatePath(`/c/${token}`);
  revalidatePath("/admin");
  revalidatePath("/admin/vouchers");
  revalidatePath("/partner/history");
}
