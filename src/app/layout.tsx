import type { Metadata, Viewport } from "next";
import { Shantell_Sans, Instrument_Sans } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { list } from "@/lib/store";
import "./globals.css";

const hand = Shantell_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hand",
  display: "swap",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const description =
  "Ask a question and the answer gets drawn one piece at a time, the way a teacher builds it at a whiteboard. If the question has no structure, Chalk says so instead of drawing a shrug.";

export const metadata: Metadata = {
  title: { default: "Chalk", template: "%s — Chalk" },
  description,
  applicationName: "Chalk",
  openGraph: { type: "website", siteName: "Chalk", title: "Chalk", description },
  twitter: { card: "summary_large_image", title: "Chalk", description },
};

export const viewport: Viewport = {
  themeColor: "#16150f",
  colorScheme: "dark light",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const conversations = await list();

  return (
    <html lang="en" className={`${hand.variable} ${sans.variable}`}>
      <body>
        <div className="app">
          <Sidebar conversations={conversations} />
          <main className="stage">{children}</main>
        </div>
      </body>
    </html>
  );
}
