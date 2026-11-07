import type { Metadata, Viewport } from "next";
import { Figtree, Noto_Sans, Noto_Sans_Arabic, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin", "latin-ext"],
});

const notoSans = Noto_Sans({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
});

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-ar",
  subsets: ["arabic"],
});

const notoSC = Noto_Sans_SC({
  variable: "--font-zh",
  preload: false,
});

export const metadata: Metadata = {
  title: "Synapse: every patient, understood",
  description:
    "A communication aid for clinics. Patients describe symptoms in their own language and way of communicating; Synapse turns it into a clear summary for the clinician. Nothing is stored.",
};

export const viewport: Viewport = {
  themeColor: "#101e34",
  viewportFit: "cover", // lets env(safe-area-inset-*) keep controls clear of notches and home indicators
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${figtree.variable} ${notoSans.variable} ${notoArabic.variable} ${notoSC.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
