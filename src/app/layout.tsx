import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { themeInitScript } from "@/components/shared/ThemeInitScript";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-brand",
  display: "swap",
});

export const metadata: Metadata = {
  title: "WebTrak — Workforce Tracker",
  description: "Modern workforce tracking and management platform",
  icons: {
    icon: [{ url: "/webtrak-logo.png", type: "image/png" }],
    apple: [{ url: "/webtrak-logo.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full", inter.variable, plusJakarta.variable, "font-sans")} suppressHydrationWarning>
      <body className="min-h-full bg-wt-bg text-wt-text antialiased">
        <Script id="wt-theme-init" strategy="beforeInteractive">
          {themeInitScript()}
        </Script>
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
