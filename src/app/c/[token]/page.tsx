import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { PIN_COOKIE, getPinHash, isValidPinCookie } from "@/lib/checkin";
import { ConfirmForm } from "./confirm-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Voucher check-in", robots: { index: false, follow: false } };

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" });
const stampFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Zagreb" });

function Shell({ tone, title, children }: { tone: "ok" | "used" | "bad"; title: string; children?: React.ReactNode }) {
  const bar = { ok: "bg-emerald-600", used: "bg-amber-500", bad: "bg-red-600" }[tone];
  return (
    <main className="mx-auto min-h-screen max-w-md bg-white shadow-sm sm:my-6 sm:min-h-0 sm:rounded-xl sm:border sm:border-slate-200">
      <div className={`${bar} px-5 py-4 text-white sm:rounded-t-xl`}>
        <h1 className="text-xl font-semibold">{title}</h1>
      </div>
      <div className="p-5">{children}</div>
    </main>
  );
}

export default async function CheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const voucher =
    token.length >= 16 && token.length <= 128
      ? await prisma.voucher.findUnique({
          where: { checkToken: token },
          select: {
            code: true,
            tourDate: true,
            timeSlot: true,
            adults: true,
            children: true,
            leadGuestName: true,
            checkedInAt: true,
            tour: { select: { name: true } },
            user: { select: { agencyName: true } },
          },
        })
      : null;

  if (!voucher) {
    return (
      <Shell tone="bad" title="✕ Invalid voucher">
        <p className="text-sm text-slate-600">This voucher could not be found. Please check the QR code and try again.</p>
      </Shell>
    );
  }

  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Zagreb" }).format(new Date());
  const tourDay = voucher.tourDate.toISOString().slice(0, 10);
  const pinHash = await getPinHash();
  const trusted = !!pinHash && isValidPinCookie((await cookies()).get(PIN_COOKIE)?.value, pinHash);

  const rows: [string, string][] = [
    ["Voucher", voucher.code],
    ["Tour", voucher.tour.name],
    ["Date", dateFmt.format(voucher.tourDate)],
    ["Departure", voucher.timeSlot],
    ["Guests", `${voucher.adults + voucher.children} (${voucher.adults} adults${voucher.children ? `, ${voucher.children} children` : ""})`],
    ["Agency", voucher.user.agencyName],
    ...(voucher.leadGuestName ? ([["Lead guest", voucher.leadGuestName]] as [string, string][]) : []),
  ];

  const details = (
    <dl className="divide-y divide-slate-100 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 py-2">
          <dt className="text-slate-500">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );

  if (voucher.checkedInAt) {
    return (
      <Shell tone="used" title="Already checked in">
        <p className="mb-3 text-sm text-slate-600">
          Arrival of these guests was confirmed on {stampFmt.format(voucher.checkedInAt)}.
        </p>
        {details}
      </Shell>
    );
  }

  return (
    <Shell tone="ok" title="✓ Valid voucher">
      {tourDay !== today && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Warning: this voucher is for {dateFmt.format(voucher.tourDate)}, not today.
        </p>
      )}
      {details}
      {pinHash ? (
        <ConfirmForm token={token} needsPin={!trusted} />
      ) : (
        <p className="mt-6 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          Check-in is not enabled yet. Please contact the office.
        </p>
      )}
    </Shell>
  );
}
