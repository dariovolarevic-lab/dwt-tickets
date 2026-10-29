import { prisma } from "@/lib/prisma";
import { Placeholder } from "@/components/dashboard-shell";
import { timesOf } from "@/lib/tour-times";
import { btn, fieldClass } from "@/components/ui";
import { closeDepartureAction, reopenDepartureAction } from "../departures/actions";

const dateFmt = new Intl.DateTimeFormat("hr-HR", { dateStyle: "full", timeZone: "UTC" });

export async function DeparturesSection() {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zagreb" }).format(new Date());
  const [tours, closedDepartures] = await Promise.all([
    prisma.tour.findMany({
      where: { active: true },
      select: { id: true, name: true, departureTimes: true },
      orderBy: { name: "asc" },
    }),
    prisma.closedDeparture.findMany({
      where: { tourDate: { gte: new Date(`${today}T00:00:00.000Z`) } },
      include: { tour: { select: { name: true } } },
      orderBy: [{ tourDate: "asc" }, { timeSlot: "asc" }],
    }),
  ]);
  const departures = tours.flatMap((tour) =>
    timesOf(tour.departureTimes).map((timeSlot) => ({ id: `${tour.id}|${timeSlot}`, name: tour.name, timeSlot })),
  );

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold tracking-tight">Zatvaranje polazaka</h2>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        Zaustavite prodaju određene ture za odabrani datum i vrijeme polaska.
      </p>

      {departures.length === 0 ? (
        <Placeholder>Nema aktivnih tura s definiranim polascima.</Placeholder>
      ) : (
        <form action={closeDepartureAction} className="mb-6 grid max-w-3xl gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-sm font-medium">
            Tura i polazak
            <select name="departure" required className={fieldClass} defaultValue="">
              <option value="" disabled>Odaberite polazak</option>
              {departures.map((departure) => (
                <option key={departure.id} value={departure.id}>
                  {departure.name} — {departure.timeSlot}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium">
            Datum
            <input type="date" name="tourDate" required min={today} defaultValue={today} className={fieldClass} />
          </label>
          <button type="submit" className={btn.primary}>Zatvori prodaju</button>
        </form>
      )}

      <h3 className="mb-3 text-lg font-semibold">Zatvoreni polasci</h3>
      {closedDepartures.length === 0 ? (
        <Placeholder>Nema zatvorenih budućih polazaka.</Placeholder>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Tura</th>
                <th className="px-4 py-3">Datum</th>
                <th className="px-4 py-3">Polazak</th>
                <th className="px-4 py-3 text-right">Radnja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {closedDepartures.map((departure) => (
                <tr key={departure.id}>
                  <td className="px-4 py-3 font-medium">{departure.tour.name}</td>
                  <td className="px-4 py-3">{dateFmt.format(departure.tourDate)}</td>
                  <td className="px-4 py-3">{departure.timeSlot}</td>
                  <td className="px-4 py-3 text-right">
                    <form action={reopenDepartureAction.bind(null, departure.id)}>
                      <button type="submit" className={btn.secondary}>Ponovno otvori</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
