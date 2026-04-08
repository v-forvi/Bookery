import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/client/trpc";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { MobileNav } from "@/components/MobileNav";
import { TelegramProvider } from "@/components/TelegramProvider";
import { PatronAuthProvider } from "@/components/PatronAuthContext";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bookery - Personal Library System",
  description: "AI-powered personal library management with conceptual blending",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bookery",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
  },
  other: {
    "telegram:web-app:url": "https://web-virid-three-19.vercel.app",
    "telegram:web-app:display-mode": "fullscreen",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#8b5cf6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TelegramProvider>
          <TRPCProvider>
            <PatronAuthProvider>
              {children}
            </PatronAuthProvider>
          </TRPCProvider>
        </TelegramProvider>
        <MobileNav />
        {/* ServiceWorkerRegister temporarily disabled for debugging */}
      </body>
    </html>
  );
}
