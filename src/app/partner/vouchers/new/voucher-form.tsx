"use client";

import { useActionState, useMemo, useState } from "react";
import { issueVoucherAction, type VoucherFormState } from "../actions";
import { btn, fieldClass } from "@/components/ui";
import { calcTotalCents } from "@/lib/pricing";

export type TourOption = {
  id: string;
  name: string;
  departureTimes: string[];
  priceAdult: string;
  priceChild: string | null;
};

type ClosedDepartureOption = { tourId: string; tourDate: string; timeSlot: string };

const eur = new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR" });

export function VoucherForm({
  tours,
  defaultTourId,
  today,
  canUseK,
  closedDepartures,
}: {
  tours: TourOption[];
  defaultTourId?: string;
  today: string;
  canUseK: boolean;
  closedDepartures: ClosedDepartureOption[];
}) {
  const [state, action, pending] = useActionState<VoucherFormState, FormData>(issueVoucherAction, undefined);

  const [tourId, setTourId] = useState(tours.find((t) => t.id === defaultTourId)?.id ?? tours[0]?.id ?? "");
  const tour = tours.find((t) => t.id === tourId);
  const [timeSlot, setTimeSlot] = useState(
    tour?.departureTimes.find((slot) => !closedDepartures.some(
      (closed) => closed.tourId === tour.id && closed.tourDate === today && closed.timeSlot === slot,
    )) ?? "",
  );
  const [tourDate, setTourDate] = useState(today);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const availableTimes = tour?.departureTimes.filter(
    (slot) => !closedDepartures.some(
      (closed) => closed.tourId === tour.id && closed.tourDate === tourDate && closed.timeSlot === slot,
    ),
  ) ?? [];
  const hasChildPrice = tour?.priceChild != null;
  const total = useMemo(() => {
    if (!tour) return 0;
    const kids = hasChildPrice ? children : 0;
    return calcTotalCents(adults, kids, tour.priceAdult, tour.priceChild);
  }, [tour, adults, children, hasChildPrice]);

  function onTourChange(id: string) {
    setTourId(id);
    const next = tours.find((t) => t.id === id);
    setTimeSlot(next?.departureTimes.find((slot) => !closedDepartures.some(
      (closed) => closed.tourId === id && closed.tourDate === tourDate && closed.timeSlot === slot,
    )) ?? "");
    if (next?.priceChild == null) setChildren(0);
  }

  function onDateChange(date: string) {
    setTourDate(date);
    setTimeSlot(tour?.departureTimes.find((slot) => !closedDepartures.some(
      (closed) => closed.tourId === tour?.id && closed.tourDate === date && closed.timeSlot === slot,
    )) ?? "");
  }

  const num = (v: string) => Math.max(0, Math.min(99, Math.floor(Number(v) || 0)));

  return (
    <form action={action} className="grid max-w-4xl gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium">
          Tura
          <select name="tourId" value={tourId} onChange={(e) => onTourChange(e.target.value)} className={fieldClass}>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Vrijeme polaska
            <select
              name="timeSlot"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className={fieldClass}
              required
              disabled={availableTimes.length === 0}
            >
              {availableTimes.length === 0 ? (
                <option value="">Nema dostupnih polazaka</option>
              ) : (
                availableTimes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
                ))
              )}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Datum ture
            <input
              type="date"
              name="tourDate"
              required
              min={today}
              value={tourDate}
              onChange={(e) => onDateChange(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Odrasli
            <input
              type="number"
              name="adults"
              required
              min={1}
              max={99}
              value={adults}
              onChange={(e) => setAdults(num(e.target.value))}
              className={fieldClass}
            />
          </label>
          {hasChildPrice && (
            <label className="block text-sm font-medium">
              Djeca
              <input
                type="number"
                name="children"
                min={0}
                max={99}
                value={children}
                onChange={(e) => setChildren(num(e.target.value))}
                className={fieldClass}
              />
            </label>
          )}
        </div>

        {canUseK && (
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium">
            <input
              type="checkbox"
              name="isK"
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
            Oznaka K
          </label>
        )}
      </div>

      <aside className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold">Sažetak cijene</h2>
        {tour && (
          <dl className="space-y-1 text-sm text-slate-600">
            <div className="flex justify-between">
              <dt>
                {adults} × odrasli ({eur.format(Number(tour.priceAdult))})
              </dt>
              <dd>{eur.format((adults * Number(tour.priceAdult)))}</dd>
            </div>
            {hasChildPrice && children > 0 && (
              <div className="flex justify-between">
                <dt>
                  {children} × djeca ({eur.format(Number(tour.priceChild))})
                </dt>
                <dd>{eur.format(children * Number(tour.priceChild))}</dd>
              </div>
            )}
          </dl>
        )}
        <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-semibold">
          <span>Ukupno</span>
          <span data-testid="total">{eur.format(total / 100)}</span>
        </div>

        {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

        <button
          type="submit"
          disabled={pending || !tour || availableTimes.length === 0}
          className={`${btn.primary} w-full py-2.5`}
        >
          {pending ? "Generiranje…" : "Generiraj vaučer"}
        </button>
      </aside>
    </form>
  );
}
