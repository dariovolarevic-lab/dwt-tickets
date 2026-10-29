import QRCode from "qrcode";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { ensurePdfFonts } from "./pdf-fonts";

export type VoucherPdfData = {
  code: string;
  agencyName: string;
  tourName: string;
  tourDate: Date;
  timeSlot: string;
  adults: number;
  children: number;
  totalPrice: string;
  meetingPoint: string;
  issuedAt: Date;
  // Link encoded in the QR code (guide check-in page)
  checkUrl: string;
};

const GREEN = "#047857";

const s = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 11, padding: 40, color: "#0f172a" },
  header: { backgroundColor: GREEN, color: "#fff", padding: 18, borderRadius: 6, marginBottom: 20 },
  headerTitle: { fontSize: 22, fontWeight: 700 },
  headerSub: { fontSize: 10, marginTop: 3, opacity: 0.9 },
  top: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  codeLabel: { fontSize: 9, color: "#64748b", textTransform: "uppercase" },
  code: { fontSize: 24, fontWeight: 700, marginTop: 3, letterSpacing: 1 },
  qr: { width: 110, height: 110 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 8 },
  label: { width: 170, color: "#64748b" },
  value: { flex: 1, fontWeight: 700 },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: 14, padding: 12, backgroundColor: "#ecfdf5", borderRadius: 6 },
  totalText: { fontSize: 14, fontWeight: 700, color: GREEN },
  box: { marginTop: 20, padding: 12, borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 6 },
  boxTitle: { fontWeight: 700, marginBottom: 4 },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, fontSize: 9, color: "#64748b", textAlign: "center" },
});

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeZone: "UTC" });
const stampFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Zagreb" });
const moneyFmt = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" });

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}

function VoucherDocument({ d, qr }: { d: VoucherPdfData; qr: string }) {
  const pax = `${d.adults + d.children} (${d.adults} adults${d.children ? `, ${d.children} children` : ""})`;

  return (
    <Document title={`Voucher ${d.code}`} author={d.agencyName}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.headerTitle}>Tour voucher</Text>
          <Text style={s.headerSub}>{d.agencyName}</Text>
        </View>

        <View style={s.top}>
          <View>
            <Text style={s.codeLabel}>Voucher code</Text>
            <Text style={s.code}>{d.code}</Text>
          </View>
          <Image src={qr} style={s.qr} />
        </View>

        <Row label="Tour" value={d.tourName} />
        <Row label="Date" value={dateFmt.format(d.tourDate)} />
        <Row label="Departure time" value={d.timeSlot} />
        <Row label="Guests" value={pax} />
        <Row label="Agency" value={d.agencyName} />

        <View style={s.total}>
          <Text style={s.totalText}>Total</Text>
          <Text style={s.totalText}>{moneyFmt.format(Number(d.totalPrice))}</Text>
        </View>

        <View style={s.box}>
          <Text style={s.boxTitle}>Meeting point</Text>
          <Text>{d.meetingPoint}</Text>
        </View>

        <Text style={s.footer}>
          Issued: {stampFmt.format(d.issuedAt)} · Please show this voucher to your guide.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderVoucherPdf(data: VoucherPdfData): Promise<Buffer> {
  await ensurePdfFonts();
  const qr = await QRCode.toDataURL(data.checkUrl, { margin: 1, width: 300, errorCorrectionLevel: "M" });
  return renderToBuffer(<VoucherDocument d={data} qr={qr} />);
}
