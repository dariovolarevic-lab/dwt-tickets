"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerAction } from "../actions";
import { AuthCard, buttonClass, inputClass } from "@/components/auth-card";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, undefined);

  return (
    <AuthCard title="Registracija agencije" subtitle="Naš tim pregledava račune prije aktivacije">
      <form action={action} className="space-y-4">
        <label className="block text-sm font-medium">
          Naziv agencije
          <input name="agencyName" required className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Kontakt osoba
          <input name="contactPerson" required autoComplete="name" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          E-pošta
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Lozinka
          <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </label>
        {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        {state?.success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>}
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Slanje…" : "Registriraj se"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Već odobreni?{" "}
        <Link href="/auth/login" className="font-medium text-emerald-700 hover:underline">
          Prijavite se
        </Link>
      </p>
    </AuthCard>
  );
}
