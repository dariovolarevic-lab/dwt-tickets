"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { TourFormState } from "./actions";
import { saveTourAction } from "./actions";
import { btn, fieldClass } from "@/components/ui";
import type { TourFormValues } from "./tour-defaults";

export function TourForm({ id, initial }: { id: string | null; initial: TourFormValues }) {
  const [state, action, pending] = useActionState<TourFormState, FormData>(saveTourAction.bind(null, id), undefined);
  // React resets uncontrolled fields after each action, so re-apply what the user submitted on errors
  const v: TourFormValues = state?.values
    ? { ...(state.values as Omit<TourFormValues, "active">), active: state.values.active === "on" }
    : initial;

  return (
    <form action={action} className="max-w-2xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium">
        Naziv ture
        <input name="name" required defaultValue={v.name} className={fieldClass} />
      </label>
      <label className="block text-sm font-medium">
        Opis (neobavezno)
        <textarea name="description" rows={3} defaultValue={v.description} className={fieldClass} />
      </label>
      <label className="block text-sm font-medium">
        Mjesto okupljanja / upute
        <textarea name="meetingPoint" required rows={3} defaultValue={v.meetingPoint} className={fieldClass} />
        <span className="mt-1 block text-xs font-normal text-slate-500">Ispisuje se na vaučeru.</span>
      </label>
      <label className="block text-sm font-medium">
        Vremena polaska
        <input
          name="departureTimes"
          required
          placeholder="10:00, 14:00, 17:30"
          defaultValue={v.departureTimes}
          className={fieldClass}
        />
        <span className="mt-1 block text-xs font-normal text-slate-500">
          Format HH:mm, odvojeno zarezom.
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Cijena po odrasloj osobi (€)
          <input
            name="priceAdult"
            required
            inputMode="decimal"
            placeholder="25,00"
            defaultValue={v.priceAdult}
            className={fieldClass}
          />
        </label>
        <label className="block text-sm font-medium">
          Cijena po djetetu (€)
          <input
            name="priceChild"
            inputMode="decimal"
            placeholder="12,50"
            defaultValue={v.priceChild}
            className={fieldClass}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">Ostavite prazno ako nema dječje cijene.</span>
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="active"
          defaultChecked={v.active}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600"
        />
        Aktivna (vidljiva partnerima)
      </label>

      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={btn.primary}>
          {pending ? "Spremanje…" : "Spremi"}
        </button>
        <Link href="/admin/tours" className={btn.secondary}>
          Odustani
        </Link>
      </div>
    </form>
  );
}
