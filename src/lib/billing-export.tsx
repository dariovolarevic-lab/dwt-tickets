import ExcelJS from "exceljs";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { ensurePdfFonts } from "./pdf-fonts";
import type { Basis, Report } from "./billing";

export type ReportMeta = { from: string; to: string; basis: Basis; agencyLabel: string; kindLabel: string };

const BASIS_LABEL: Record<Basis, string> = { issued: "datumu izdavanja", tour: "datumu ture" };

const fmtDate = (d: Date, tz = "UTC") => new Intl.DateTimeFormat("hr-HR", { dateStyle: "short", timeZone: tz }).format(d);
const fmtStamp = (d: Date) =>
  new Intl.DateTimeFormat("hr-HR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Zagreb" }).format(d);
const isoDate = (s: string) => s.split("-").reverse().join(".") + ".";
const money = (v: string) => new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR" }).format(Number(v));

export function filenameBase(m: ReportMeta) {
  return `izvjestaj_${m.from}_${m.to}`;
}

export const KIND_LABEL = { all: "Svi vaučeri", k: "Samo K", regular: "Bez K" } as const;

// ---------- CSV (semicolon-separated, comma decimals, BOM: opens correctly in Croatian Excel) ----------

function csvCell(v: string | number) {
  const s = String(v);
  // Guard against spreadsheet formula injection from user-entered text
  const safe = /^[=+\-@\t\r]/.test(s) && typeof v === "string" ? `'${s}` : s;
  return /[;"\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const dec = (v: string) => v.replace(".", ",");

function toCsv(rows: (string | number)[][]) {
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

export function summaryCsv(r: Report) {
  return toCsv([
    ["Agencija", "Broj vaučera", "Odrasli", "Djeca", "Ukupno (EUR)", "Popust", "Popust (EUR)", "Iznos za naplatu (EUR)"],
    ...r.summary.map((s) => [
      s.agencyName,
      s.vouchers,
      s.adults,
      s.children,
      dec(s.total),
      s.percentLabel,
      dec(s.discount),
      dec(s.net),
    ]),
    ["UKUPNO", r.totals.vouchers, r.totals.adults, r.totals.children, dec(r.totals.total), "", dec(r.totals.discount), dec(r.totals.net)],
  ]);
}

export function vouchersCsv(r: Report) {
  return toCsv([
    [
      "Kod",
      "Agencija",
      "Tura",
      "Datum ture",
      "Vrijeme",
      "Odrasli",
      "Djeca",
      "Cijena odrasli (EUR)",
      "Cijena dijete (EUR)",
      "Izdano",
      "Ukupno (EUR)",
      "Popust",
      "Popust (EUR)",
      "Iznos za naplatu (EUR)",
    ],
    ...r.vouchers.map((v) => [
      v.code,
      v.agencyName,
      v.tourName,
      fmtDate(v.tourDate),
      v.timeSlot,
      v.adults,
      v.children,
      dec(v.priceAdult),
      dec(v.priceChild),
      fmtStamp(v.createdAt),
      dec(v.totalPrice),
      v.discountPercent,
      dec(v.discountAmount),
      dec(v.netAmount),
    ]),
  ]);
}

// ---------- Excel ----------

export async function reportXlsx(r: Report, m: ReportMeta): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const eur = '#,##0.00 "€"';
  const headerStyle = (row: ExcelJS.Row) => {
    row.font = { bold: true, color: { argb: "FFFFFFFF" } };
    row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
  };

  const s = wb.addWorksheet("Sažetak");
  s.addRow([`Izvještaj za naplatu: ${isoDate(m.from)} – ${isoDate(m.to)}`]).font = { bold: true, size: 14 };
  s.addRow([`Agencija: ${m.agencyLabel} · Vrsta: ${m.kindLabel} · Filtrirano po ${BASIS_LABEL[m.basis]}`]);
  s.addRow([]);
  headerStyle(
    s.addRow(["Agencija", "Broj vaučera", "Odrasli", "Djeca", "Ukupno", "Popust", "Popust (iznos)", "Iznos za naplatu"]),
  );
  for (const x of r.summary) {
    s.addRow([
      x.agencyName,
      x.vouchers,
      x.adults,
      x.children,
      Number(x.total),
      x.percentLabel,
      Number(x.discount),
      Number(x.net),
    ]);
  }
  const tot = s.addRow([
    "UKUPNO",
    r.totals.vouchers,
    r.totals.adults,
    r.totals.children,
    Number(r.totals.total),
    "",
    Number(r.totals.discount),
    Number(r.totals.net),
  ]);
  tot.font = { bold: true };
  for (const c of [5, 7, 8]) s.getColumn(c).numFmt = eur;
  s.columns.forEach((c, i) => (c.width = [34, 14, 10, 10, 16, 14, 16, 20][i]));

  const d = wb.addWorksheet("Vaučeri");
  headerStyle(
    d.addRow([
      "Kod",
      "Agencija",
      "Tura",
      "Datum ture",
      "Vrijeme",
      "Odrasli",
      "Djeca",
      "Cijena odrasli",
      "Cijena dijete",
      "Izdano",
      "Ukupno",
      "Popust",
      "Popust (iznos)",
      "Iznos za naplatu",
    ]),
  );
  for (const v of r.vouchers) {
    d.addRow([
      v.code,
      v.agencyName,
      v.tourName,
      v.tourDate,
      v.timeSlot,
      v.adults,
      v.children,
      Number(v.priceAdult),
      Number(v.priceChild),
      v.createdAt,
      Number(v.totalPrice),
      v.discountPercent,
      Number(v.discountAmount),
      Number(v.netAmount),
    ]);
  }
  d.getColumn(4).numFmt = "dd.mm.yyyy.";
  d.getColumn(10).numFmt = "dd.mm.yyyy. hh:mm";
  for (const c of [8, 9, 11, 13, 14]) d.getColumn(c).numFmt = eur;
  d.columns.forEach((c, i) => (c.width = [20, 28, 32, 13, 9, 9, 8, 15, 15, 18, 14, 10, 15, 18][i]));
  d.views = [{ state: "frozen", ySplit: 1 }];

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------- PDF (voucher-level listing grouped by agency) ----------

const st = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 8.5, paddingHorizontal: 30, paddingTop: 30, paddingBottom: 44, color: "#0f172a" },
  title: { fontSize: 18, fontWeight: 700, color: "#047857" },
  meta: { marginTop: 3, fontSize: 9.5, color: "#475569" },
  head: { flexDirection: "row", marginTop: 14, backgroundColor: "#047857", color: "#fff", paddingVertical: 5, fontWeight: 700 },
  agency: { marginTop: 12, paddingVertical: 4, paddingHorizontal: 5, backgroundColor: "#e2e8f0", fontWeight: 700, fontSize: 10 },
  row: { flexDirection: "row", paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", alignItems: "center" },
  sub: { flexDirection: "row", paddingVertical: 5, backgroundColor: "#f1f5f9", fontWeight: 700 },
  total: { flexDirection: "row", marginTop: 12, paddingVertical: 7, backgroundColor: "#ecfdf5", fontWeight: 700, fontSize: 10, color: "#047857" },
  cell: { paddingHorizontal: 5 },
  muted: { color: "#64748b" },
  footer: { position: "absolute", bottom: 20, left: 30, right: 30, fontSize: 8, color: "#64748b", flexDirection: "row", justifyContent: "space-between" },
});

// Column widths shared by header, rows and totals so everything lines up
const W = { code: 1.95, tour: 1.7, date: 1.4, pax: 0.75, price: 1.55, issued: 0.95, gross: 1.0, discount: 1.75, net: 1.1 };
const discountText = (amount: string, label?: string) =>
  Number(amount) > 0 ? `−${money(amount)}${label ? ` (${label})` : ""}` : label ? `— (${label})` : "—";
const col = (k: keyof typeof W, right = false) => ({
  ...st.cell,
  flex: W[k],
  ...(right ? { textAlign: "right" as const } : {}),
});

function VoucherLine({ v }: { v: Report["vouchers"][number] }) {
  return (
    <View style={st.row} wrap={false}>
      <Text style={col("code")}>{v.code}</Text>
      <Text style={col("tour")}>{v.tourName}</Text>
      <View style={col("date")}>
        <Text>{fmtDate(v.tourDate)}</Text>
        <Text style={st.muted}>{v.timeSlot}</Text>
      </View>
      <Text style={col("pax")}>
        {v.adults + v.children} <Text style={st.muted}>({v.adults}+{v.children})</Text>
      </Text>
      <Text style={col("price")}>
        {money(v.priceAdult)} / {Number(v.priceChild) > 0 ? money(v.priceChild) : "—"}
      </Text>
      <Text style={{ ...col("issued"), ...st.muted }}>{fmtDate(v.createdAt, "Europe/Zagreb")}</Text>
      <Text style={col("gross", true)}>{money(v.totalPrice)}</Text>
      <Text style={col("discount", true)}>{discountText(v.discountAmount, v.discountPercent)}</Text>
      <Text style={{ ...col("net", true), fontWeight: 700 }}>{money(v.netAmount)}</Text>
    </View>
  );
}

function ReportDoc({ r, m }: { r: Report; m: ReportMeta }) {
  const byAgency = r.summary.map((s) => ({ s, rows: r.vouchers.filter((v) => v.agencyId === s.agencyId) }));

  return (
    <Document title={`Izvještaj ${m.from} – ${m.to}`}>
      <Page size="A4" orientation="landscape" style={st.page}>
        <Text style={st.title}>Izvještaj za naplatu: vaučeri</Text>
        <Text style={st.meta}>
          Razdoblje: {isoDate(m.from)} – {isoDate(m.to)} (po {BASIS_LABEL[m.basis]}) · Agencija: {m.agencyLabel} · Vrsta: {m.kindLabel}
        </Text>

        <View style={st.head} fixed>
          <Text style={col("code")}>KOD</Text>
          <Text style={col("tour")}>TURA</Text>
          <Text style={col("date")}>DATUM TURE</Text>
          <Text style={col("pax")}>OSOBE</Text>
          <Text style={col("price")}>TARIFA ODR./DJ.</Text>
          <Text style={col("issued")}>IZDANO</Text>
          <Text style={col("gross", true)}>UKUPNO</Text>
          <Text style={col("discount", true)}>POPUST</Text>
          <Text style={col("net", true)}>ZA NAPLATU</Text>
        </View>

        {byAgency.length === 0 && <Text style={{ marginTop: 12 }}>Nema vaučera u odabranom razdoblju.</Text>}

        {byAgency.map(({ s, rows }) => (
          <View key={s.agencyId}>
            {/* Heading stays on the same page as the first voucher row */}
            <View wrap={false}>
              <Text style={st.agency}>{s.agencyName}</Text>
              {rows[0] && <VoucherLine v={rows[0]} />}
            </View>
            {rows.slice(1).map((v) => (
              <VoucherLine key={v.code} v={v} />
            ))}
            <View style={st.sub} wrap={false}>
              <Text style={{ ...st.cell, flex: W.code + W.tour + W.date }}>
                Ukupno {s.agencyName}: {s.vouchers} {s.vouchers === 1 ? "vaučer" : "vaučera"}
              </Text>
              <Text style={col("pax")}>{s.adults + s.children}</Text>
              <Text style={{ ...st.cell, flex: W.price + W.issued }} />
              <Text style={col("gross", true)}>{money(s.total)}</Text>
              <Text style={col("discount", true)}>{discountText(s.discount, s.percentLabel)}</Text>
              <Text style={col("net", true)}>{money(s.net)}</Text>
            </View>
          </View>
        ))}

        {byAgency.length > 0 && (
          <View style={st.total} wrap={false}>
            <Text style={{ ...st.cell, flex: W.code + W.tour + W.date }}>
              SVE UKUPNO: {r.totals.vouchers} {r.totals.vouchers === 1 ? "vaučer" : "vaučera"}
            </Text>
            <Text style={col("pax")}>{r.totals.adults + r.totals.children}</Text>
            <Text style={{ ...st.cell, flex: W.price + W.issued }} />
            <Text style={col("gross", true)}>{money(r.totals.total)}</Text>
            <Text style={col("discount", true)}>{discountText(r.totals.discount)}</Text>
            <Text style={col("net", true)}>{money(r.totals.net)}</Text>
          </View>
        )}

        <View style={st.footer} fixed>
          <Text>Generirano: {fmtStamp(new Date())}</Text>
          <Text render={({ pageNumber, totalPages }) => `Stranica ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function reportPdf(r: Report, m: ReportMeta) {
  await ensurePdfFonts();
  return renderToBuffer(<ReportDoc r={r} m={m} />);
}
