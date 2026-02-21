import type { Metadata } from "next";
import { Geist, Geist_Mono, Montserrat, Outfit } from "next/font/google";
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

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cadencia.xyz"),
  title: {
    default: "Cadencia - Stop drifting. Track your goals daily.",
    template: "%s | Cadencia",
  },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    "Cadencia",
    "goal tracking app",
    "personal goal setting",
    "productivity tracker",
    "github style heatmap",
    "accountability app",
    "mentor progress tracking",
    "personal OKRs",
    "weekly schedule planner",
    "minimalist planning app",
    "productivity rhythm",
  ],
  authors: [{ name: APP_NAME }],
  category: "productivity",
  openGraph: {
    title: "Cadencia - Stop drifting. Track your goals daily.",
    description: APP_DESCRIPTION,
    siteName: APP_NAME,
    type: "website",
    url: "/",
    images: [
      {
        url: "/websitecard.png",
        width: 1200,
        height: 630,
        alt: "Cadencia - Goal tracking with a GitHub-style heatmap",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cadencia - Stop drifting. Track your goals daily.",
    description: APP_DESCRIPTION,
    images: ["/websitecard.png"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${outfit.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
