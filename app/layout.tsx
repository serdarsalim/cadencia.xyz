import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/branding";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cadencia - Achieve your goals",
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: [
    "Cadencia",
    "personal goal setting",
    "productivity tracker",
    "personal OKRs",
    "weekly schedule planner",
    "minimalist planning app",
    "productivity rhythm",
  ],
  authors: [{ name: APP_NAME }],
  category: "productivity",
  openGraph: {
    title: "Cadencia - Achieve your goals",
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    type: "website",
    url: "https://cadencia.xyz",
    images: [
      {
        url: "https://cadencia.xyz/websitecard.png",
        width: 1200,
        height: 630,
        alt: "Cadencia - Achieve your goals",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cadencia - Achieve your goals",
    description: APP_DESCRIPTION,
    images: ["https://cadencia.xyz/websitecard.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
