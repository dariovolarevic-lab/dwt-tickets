import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Placeholder } from "@/components/dashboard-shell";
import { btn } from "@/components/ui";

const dateFmt = new Intl.DateTimeFormat("hr-HR", { dateStyle: "full", timeZone: "UTC" });
const timeFmt = new Intl.DateTimeFormat("hr-HR", { timeStyle: "short", timeZone: "Europe/Zagreb" });

export function todayInZagreb() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zagreb" }).format(new Date());
}

export function parseDay(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value ? value : null;
}

function shiftDay(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function guestsLabel(adults: number, children: number) {
  return children ? `${adults} odr. + ${children} dj.` : `${adults} odr.`;
}

// Vouchers of one day grouped by departure time and tour. With `navPath` set, day navigation is shown.
export async function DayVouchers({ day, title, navPath }: { day: string; title: string; navPath?: string }) {
  const today = todayInZagreb();

  const vouchers = await prisma.voucher.findMany({
    where: { tourDate: new Date(`${day}T00:00:00.000Z`) },
    select: {
      id: true,
      code: true,
      timeSlot: true,
      leadGuestName: true,
      adults: true,
      children: true,
      isK: true,
      checkedInAt: true,
      tour: { select: { name: true } },
      user: { select: { agencyName: true } },
    },
    orderBy: [{ timeSlot: "asc" }, { createdAt: "asc" }],
  });

  const slots = new Map<string, Map<string, typeof vouchers>>();
  for (const v of vouchers) {
    const tours = slots.get(v.timeSlot) ?? new Map<string, typeof vouchers>();
    tours.set(v.tour.name, [...(tours.get(v.tour.name) ?? []), v]);
    slots.set(v.timeSlot, tours);
  }

  const totalGuests = vouchers.reduce((sum, v) => sum + v.adults + v.children, 0);

  return (
    <>
      <PageHeader
        title={title}
        description={`${day === today ? "Danas" : "Datum"}: ${dateFmt.format(new Date(`${day}T00:00:00.000Z`))} · ${vouchers.length} vaučera · ${totalGuests} gostiju`}
      />

      {navPath && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Link href={`${navPath}?date=${shiftDay(day, -1)}`} className={btn.secondary}>
            ← Prethodni dan
          </Link>
          {day !== today && (
            <Link href={navPath} className={btn.secondary}>
              Danas
            </Link>
          )}
          <Link href={`${navPath}?date=${shiftDay(day, 1)}`} className={btn.secondary}>
            Sljedeći dan →
          </Link>
          <form className="ml-auto flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={day}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
            <button type="submit" className={btn.secondary}>
              Prikaži
            </button>
          </form>
        </div>
      )}

      {slots.size === 0 ? (
        <Placeholder>Nema izdanih vaučera za ovaj dan.</Placeholder>
      ) : (
        <div className="space-y-6">
          {[...slots.entries()].map(([timeSlot, tours]) => {
            const slotVouchers = [...tours.values()].flat();
            const slotGuests = slotVouchers.reduce((sum, v) => sum + v.adults + v.children, 0);
            const arrivedGuests = slotVouchers.reduce((sum, v) => sum + (v.checkedInAt ? v.adults + v.children : 0), 0);
            return (
              <section key={timeSlot} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between bg-emerald-700 px-4 py-2.5 text-white">
                  <h2 className="text-lg font-semibold">{timeSlot}</h2>
                  <span className="text-sm">
                    {slotVouchers.length} vaučera · stiglo {arrivedGuests}/{slotGuests} gostiju
                  </span>
                </div>
                {[...tours.entries()].map(([tourName, list]) => (
                  <div key={tourName} className="border-t border-slate-200 first:border-t-0">
                    <p className="bg-slate-50 px-4 py-2 text-sm font-semibold">{tourName}</p>
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y divide-slate-100">
                        {list.map((v) => (
                          <tr key={v.id}>
                            <td className="px-4 py-2.5 font-mono">
                              {v.code}
                              {v.isK && (
                                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-800">
                                  K
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">{v.user.agencyName}</td>
                            <td className="px-4 py-2.5 text-slate-600">{v.leadGuestName ?? "—"}</td>
                            <td className="px-4 py-2.5 text-right">{guestsLabel(v.adults, v.children)}</td>
                            <td className="px-4 py-2.5 text-right">
                              {v.checkedInAt ? (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                                  ✓ Došao {timeFmt.format(v.checkedInAt)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">Nije došao</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
