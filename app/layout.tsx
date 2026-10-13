import type { Metadata } from "next";
import { JsonLd, getSiteJsonLd } from "@/app/_components/seo/JsonLd";
import { createRootMetadata } from "@/app/_components/seo/metadata";
import { PondBackdrop } from "@/app/_components/PondBackdrop";
import { RouteTransitionProvider } from "@/app/_components/RouteTransition";
import { Anton, Bricolage_Grotesque, Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Bricolage Grotesque — a warm, contemporary display grotesque. It replaces
// the old distressed Timmons face (which was uppercase-only and rendered
// lowercase as tofu). Bricolage carries a full mixed-case glyph set, so the
// wordmark and headings can read in natural case — cleaner and more modern,
// while still having enough character to feel playful rather than corporate.
// Variable weight range lets us go from medium body headings to bold display.
const headingFont = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
  weight: "variable",
});

// Anton — a tall, heavy condensed display face. Drives the big nav headings
// (both the home stack and the shrunk navbar row) and every card title, giving
// the site a poster-like, editorial stance. Single weight (400) but already
// very bold, so headings never need a bold class (which would only faux-bold
// it). Scoped via `--font-display` so it applies exactly where we want.
const displayFont = Anton({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = createRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${headingFont.variable} ${displayFont.variable} h-full antialiased`}
    >
      {/* No global overflow-hidden anymore: the content routes (/work, /about,
          /contact) scroll vertically. The home experience clips itself via
          Stage's own `overflow-hidden` main, so the hero is unaffected. */}
      <body className="min-h-full bg-[#4ec5f5]">
        <a
          href="#main-content"
          className="sr-only fixed top-4 left-4 z-[100] inline-flex min-h-11 items-center rounded-full bg-[#06263f] px-4 py-3 text-sm font-semibold text-white ring-2 ring-[#facc15] focus:not-sr-only focus:outline-none"
        >
          Skip to main content
        </a>
        <JsonLd data={getSiteJsonLd()} />
        <PondBackdrop />
        <RouteTransitionProvider>{children}</RouteTransitionProvider>
      </body>
    </html>
  );
}
