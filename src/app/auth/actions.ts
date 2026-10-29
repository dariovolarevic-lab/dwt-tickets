"use server";

import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string; success?: string } | undefined;

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && (await bcrypt.compare(password, user.passwordHash))) {
    if (user.status === "PENDING") {
      return { error: "Vaša registracija čeka odobrenje administratora." };
    }
    if (user.status === "REJECTED") {
      return { error: "Vaša registracija nije odobrena. Molimo kontaktirajte nas." };
    }
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Neispravna e-pošta ili lozinka." };
    throw e; // redirect errors must propagate
  }
}

const registerSchema = z.object({
  agencyName: z.string().trim().min(2, "Naziv agencije je obavezan"),
  contactPerson: z.string().trim().min(2, "Kontakt osoba je obavezna"),
  email: z.string().trim().toLowerCase().email("Unesite ispravnu e-poštu"),
  password: z.string().min(8, "Lozinka mora imati najmanje 8 znakova"),
});

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { agencyName, contactPerson, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Račun s ovom e-poštom već postoji." };

  await prisma.user.create({
    data: {
      agencyName,
      contactPerson,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "PARTNER",
      status: "PENDING",
    },
  });

  return { success: "Registracija je zaprimljena. Prijaviti se možete nakon što administrator odobri vaš račun." };
}
