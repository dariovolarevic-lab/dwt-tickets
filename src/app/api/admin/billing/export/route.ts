import { getApiUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { loadReport, parseFilters } from "@/lib/billing";
import {
  KIND_LABEL,
  filenameBase,
  reportPdf,
  reportXlsx,
  summaryCsv,
  vouchersCsv,
  type ReportMeta,
} from "@/lib/billing-export";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await getApiUser("ADMIN"))) return new Response("Unauthorized", { status: 401 });

  const sp = new URL(req.url).searchParams;
  const filters = parseFilters(Object.fromEntries(sp));
  const format = sp.get("format") ?? "csv-summary";

  const [report, agency] = await Promise.all([
    loadReport(filters),
    filters.agencyId
      ? prisma.user.findFirst({ where: { id: filters.agencyId, role: "PARTNER" }, select: { agencyName: true } })
      : null,
  ]);
  const meta: ReportMeta = {
    from: filters.from,
    to: filters.to,
    basis: filters.basis,
    agencyLabel: agency?.agencyName ?? "Sve agencije",
    kindLabel: KIND_LABEL[filters.kind],
  };
  const base = filenameBase(meta) + (filters.kind === "all" ? "" : `_${filters.kind === "k" ? "K" : "bezK"}`);

  const respond = (body: BodyInit, type: string, name: string) =>
    new Response(body, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `${sp.get("inline") === "1" && type === "application/pdf" ? "inline" : "attachment"}; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });

  switch (format) {
    case "csv-summary":
      return respond(summaryCsv(report), "text/csv; charset=utf-8", `${base}_sazetak.csv`);
    case "csv-vouchers":
      return respond(vouchersCsv(report), "text/csv; charset=utf-8", `${base}_vauceri.csv`);
    case "xlsx":
      return respond(
        new Uint8Array(await reportXlsx(report, meta)),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        `${base}.xlsx`,
      );
    case "pdf":
      return respond(new Uint8Array(await reportPdf(report, meta)), "application/pdf", `${base}.pdf`);
    default:
      return new Response("Unknown format", { status: 400 });
  }
}
