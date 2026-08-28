import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Sidebar from "@/components/Sidebar";
import { list } from "@/lib/store";
import "./globals.css";

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
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
  themeColor: "#d7dbe1",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const conversations = await list();

  return (
    <html lang="en" className={mono.variable}>
      <body>
        <div className="app">
          <Sidebar conversations={conversations} />
          <div className="stage">{children}</div>
        </div>
        <Toaster
          position="bottom-right"
          offset={20}
          gap={10}
          duration={5000}
          toastOptions={{ className: "toast" }}
        />
      </body>
    </html>
  );
}
