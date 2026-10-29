import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

export const PIN_SETTING_KEY = "guidePinHash";
export const PIN_COOKIE = "guide_pin";
export const PIN_RE = /^\d{4,10}$/;

export function newCheckToken() {
  return randomBytes(18).toString("base64url");
}

export function checkUrl(token: string, origin: string) {
  return `${origin.replace(/\/+$/, "")}/c/${token}`;
}

export async function getPinHash() {
  const setting = await prisma.appSetting.findUnique({ where: { key: PIN_SETTING_KEY } });
  return setting?.value ?? null;
}

// The cookie proves this phone already entered the right PIN. It is derived from the PIN hash,
// so changing the PIN in the admin invalidates every remembered phone.
export function pinCookieValue(pinHash: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`guide-pin:${pinHash}`).digest("hex");
}

export function isValidPinCookie(value: string | undefined, pinHash: string) {
  if (!value) return false;
  const expected = Buffer.from(pinCookieValue(pinHash));
  const actual = Buffer.from(value);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const MAX_FAILURES = 5;
const LOCK_MS = 10 * 60 * 1000;
type Attempts = { count: number; lockedUntil: number };
const globalForAttempts = globalThis as unknown as { pinAttempts?: Map<string, Attempts> };
const attempts = (globalForAttempts.pinAttempts ??= new Map());

// Minutes left until the client may try again, or 0 when not locked.
export function pinLockMinutes(client: string) {
  const entry = attempts.get(client);
  if (!entry || entry.lockedUntil <= Date.now()) return 0;
  return Math.ceil((entry.lockedUntil - Date.now()) / 60000);
}

export function registerPinFailure(client: string) {
  const entry = attempts.get(client);
  const count = entry && entry.lockedUntil === 0 ? entry.count + 1 : 1;
  attempts.set(client, { count, lockedUntil: count >= MAX_FAILURES ? Date.now() + LOCK_MS : 0 });
}

export function clearPinFailures(client: string) {
  attempts.delete(client);
}
