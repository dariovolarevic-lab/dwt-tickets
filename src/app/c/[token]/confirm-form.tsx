"use client";

import { useActionState } from "react";
import { confirmArrivalAction, type ConfirmState } from "./actions";

export function ConfirmForm({ token, needsPin }: { token: string; needsPin: boolean }) {
  const [state, action, pending] = useActionState<ConfirmState, FormData>(confirmArrivalAction.bind(null, token), undefined);

  return (
    <form action={action} className="mt-6 space-y-3">
      {needsPin && (
        <label className="block text-sm font-medium">
          Guide PIN
          <input
            name="pin"
            type="password"
            inputMode="numeric"
            pattern="\d*"
            autoComplete="off"
            required
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-xl tracking-widest shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </label>
      )}
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? "Confirming…" : "Confirm arrival"}
      </button>
    </form>
  );
}
