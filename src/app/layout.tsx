import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vaučeri za ture",
  description: "Izdavanje i upravljanje vaučerima za pješačke ture za partnerske agencije",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
