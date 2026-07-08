import type { Metadata, Viewport } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { DataProvider } from "@/components/DataProvider";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Glasses",
  description: "Local-first schedule, attendance and learning tracker.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-text-primary antialiased">
        <DataProvider>
          <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
            <header className="sticky top-0 z-30 flex items-center justify-center border-b border-border bg-bg/95 px-5 py-3 backdrop-blur">
              <Link
                href="/"
                className="text-base font-semibold tracking-tight text-text-primary"
              >
                Glass<span className="text-accent">es</span>
              </Link>
            </header>

            {/* pb clears the fixed bottom tab bar */}
            <main className="flex-1 px-4 pb-28 pt-5">{children}</main>
          </div>

          <BottomNav />
        </DataProvider>
      </body>
    </html>
  );
}
