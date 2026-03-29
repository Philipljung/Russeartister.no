import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Providers from "@/components/Providers";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Russeartister.no",
  description: "Markedsplass for russesanger låter, remakes, samples og presets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <body className={`${geist.variable} antialiased`}>
        <Providers>
            <Navbar />
            <main className="min-h-screen pb-16">{children}</main>
            <Footer />
        </Providers>
      </body>
    </html>
  );
}
