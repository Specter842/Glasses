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
            {/* Brand stays optically centred; Setup lives here rather than in
                the tab bar, which is reserved for the daily-use screens. */}
            <header className="sticky top-0 z-30 flex items-center justify-center border-b border-border bg-bg/95 px-5 py-3 backdrop-blur">
              <Link
                href="/"
                className="text-base font-semibold tracking-tight text-text-primary"
              >
                Glass<span className="text-accent">es</span>
              </Link>
              <Link
                href="/setup"
                aria-label="Setup"
                className="absolute right-4 flex h-8 w-8 items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <circle cx="9" cy="7" r="2.4" fill="currentColor" stroke="none" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                  <circle cx="15" cy="17" r="2.4" fill="currentColor" stroke="none" />
                </svg>
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
