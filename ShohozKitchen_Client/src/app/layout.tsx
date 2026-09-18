import type { Metadata } from "next";
import "./globals.css";
import { ReduxProvider } from "@/redux";
import FloatingContact from "@/components/shared/FloatingContact";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import Preloader from "@/components/shared/Preloader";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.shohozkitchen.com"),
  title: {
    default: "Shohoz Kitchen — Your trusted online marketplace",
    template: "%s | Shohoz Kitchen",
  },
  description: "Shop quality products at the best prices with Shohoz Kitchen, your trusted online marketplace in Bangladesh.",
  keywords: ["shohoz kitchen", "shohozkitchen", "online shopping", "ecommerce", "bangladesh", "marketplace", "best deals", "products"],
  applicationName: "Shohoz Kitchen",
  icons: {
    icon: "/logo-mark.svg",
    shortcut: "/logo-mark.svg",
    apple: "/logo-mark.svg",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Shohoz Kitchen",
    title: "Shohoz Kitchen — Your trusted online marketplace",
    description: "Shop quality products at the best prices with Shohoz Kitchen, your trusted online marketplace in Bangladesh.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shohoz Kitchen — Your trusted online marketplace",
    description: "Shop quality products at the best prices with Shohoz Kitchen, your trusted online marketplace in Bangladesh.",
  },
  robots: { index: true, follow: true },
};

import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ReduxProvider>
          <ThemeProvider>
            <Preloader />
            <Toaster position="top-center" reverseOrder={false} />
            {children}
            <FloatingContact />
          </ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
