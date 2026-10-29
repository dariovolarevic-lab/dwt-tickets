import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { renderVoucherPdf } from "@/lib/voucher-pdf";
import { checkUrl } from "@/lib/checkin";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  // Re-check in the DB so revoked accounts lose access immediately
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, status: true },
  });
  if (!user || user.status !== "APPROVED") return new Response("Unauthorized", { status: 401 });

  const { id } = await params;
  const voucher = await prisma.voucher.findFirst({
    where: { id, ...(user.role === "ADMIN" ? {} : { userId: user.id }) },
    include: { tour: true, user: { select: { agencyName: true } } },
  });
  if (!voucher) return new Response("Not found", { status: 404 });

  const pdf = await renderVoucherPdf({
    code: voucher.code,
    agencyName: voucher.user.agencyName,
    tourName: voucher.tour.name,
    tourDate: voucher.tourDate,
    timeSlot: voucher.timeSlot,
    adults: voucher.adults,
    children: voucher.children,
    totalPrice: voucher.totalPrice.toFixed(2),
    meetingPoint: voucher.tour.meetingPoint,
    issuedAt: voucher.createdAt,
    checkUrl: checkUrl(voucher.checkToken, process.env.APP_URL || new URL(req.url).origin),
  });

  const download = new URL(req.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${voucher.code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
