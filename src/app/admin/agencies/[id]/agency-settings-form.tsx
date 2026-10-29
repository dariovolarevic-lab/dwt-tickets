"use client";

import Link from "next/link";
import { useActionState } from "react";
import { saveAgencySettingsAction, type AgencyFormState } from "../actions";
import { btn, fieldClass } from "@/components/ui";

export type AgencySettings = { agencyCode: string; commissionPercent: string; canUseK: boolean };

export function AgencySettingsForm({
  id,
  approve,
  initial,
}: {
  id: string;
  approve: boolean;
  initial: AgencySettings;
}) {
  const [state, action, pending] = useActionState<AgencyFormState, FormData>(
    saveAgencySettingsAction.bind(null, id, approve),
    undefined,
  );
  // Keep what was typed when validation fails (React resets uncontrolled fields after an action)
  const v: AgencySettings = state?.values
    ? { agencyCode: state.values.agencyCode, commissionPercent: state.values.commissionPercent, canUseK: state.values.canUseK === "on" }
    : initial;

  return (
    <form action={action} className="max-w-xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium">
        Oznaka agencije
        <input
          name="agencyCode"
          required
          maxLength={5}
          placeholder="AT"
          defaultValue={v.agencyCode}
          className={`${fieldClass} uppercase`}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          2–5 znakova (slova i brojevi). Ulazi u kod vaučera, npr. DWT <b>AT</b>-00001-2026.
        </span>
      </label>

      <label className="block text-sm font-medium">
        Provizija / popust (%)
        <input
          name="commissionPercent"
          inputMode="decimal"
          placeholder="10"
          defaultValue={v.commissionPercent}
          className={fieldClass}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Primjenjuje se na nove vaučere i prikazuje u naplati. Promjena ne mijenja već izdane vaučere.
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="canUseK"
          defaultChecked={v.canUseK}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600"
        />
        <span>
          Dozvoli oznaku K
          <span className="mt-0.5 block text-xs font-normal text-slate-500">
            Agencija pri izdavanju može označiti K. Takvi vaučeri imaju poseban brojač (DWT AT-K-00001-2026) i zaseban
            filter u naplati.
          </span>
        </span>
      </label>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "Spremanje…" : approve ? "Odobri agenciju" : "Spremi"}
        </button>
        <Link href="/admin/agencies" className={btn.secondary}>
          Odustani
        </Link>
      </div>
    </form>
  );
}
