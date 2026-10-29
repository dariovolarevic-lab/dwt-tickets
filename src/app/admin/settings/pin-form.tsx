"use client";

import { useActionState } from "react";
import { btn, fieldClass } from "@/components/ui";
import { setGuidePinAction, type PinFormState } from "./actions";

export function PinForm({ hasPin }: { hasPin: boolean }) {
  const [state, action, pending] = useActionState<PinFormState, FormData>(setGuidePinAction, undefined);

  return (
    <form action={action} className="grid max-w-xl gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
      <label className="block text-sm font-medium">
        {hasPin ? "Novi PIN" : "PIN"}
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4,10}"
          autoComplete="new-password"
          required
          className={fieldClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Ponovite PIN
        <input
          name="confirm"
          type="password"
          inputMode="numeric"
          pattern="\d{4,10}"
          autoComplete="new-password"
          required
          className={fieldClass}
        />
      </label>
      {state?.error && <p className="text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      {state?.ok && <p className="text-sm text-emerald-700 sm:col-span-2">PIN je spremljen.</p>}
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "Spremam…" : "Spremi PIN"}
        </button>
      </div>
    </form>
  );
}
