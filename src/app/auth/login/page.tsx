"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "../actions";
import { AuthCard, buttonClass, inputClass } from "@/components/auth-card";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);

  return (
    <AuthCard title="Prijava" subtitle="Partnerske agencije i administratori">
      <form action={action} className="space-y-4">
        <label className="block text-sm font-medium">
          E-pošta
          <input name="email" type="email" required autoComplete="email" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Lozinka
          <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </label>
        {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Prijava u tijeku…" : "Prijavi se"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        Nova agencija?{" "}
        <Link href="/auth/register" className="font-medium text-emerald-700 hover:underline">
          Registrirajte se
        </Link>
      </p>
    </AuthCard>
  );
}
