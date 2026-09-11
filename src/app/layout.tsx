import "./globals.css";
import type { Metadata } from "next";
import ReactQueryProvider from "@/components/providers/ReactQueryProvider";
import ToasterProvider from "@/components/providers/ToasterProvider";
import { Manrope, Poppins } from "next/font/google";
import { getLocale } from "next-intl/server";
import { SITE_URL } from "@/utils/seo";

const poppins = Poppins({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
  weight: ["200", "300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Leading Sires Registry",
  description: "Performance Stallion Registry (Phase 1 UI)",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${manrope.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="font-sans min-h-screen bg-(--bg-main) text-(--text-main) antialiased"
      >
        <ReactQueryProvider>
          {children}
          <ToasterProvider />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
