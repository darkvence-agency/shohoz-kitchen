import type { Metadata } from "next";
import "./globals.css";
import { ReduxProvider } from "@/redux";
import FloatingContact from "@/components/shared/FloatingContact";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import Preloader from "@/components/shared/Preloader";
import { getSiteContent } from "@/lib/siteContent.server";
import { cleanMarketingIds } from "@/lib/marketing";

// Used until a super admin fills in Digital marketing → SEO, or if the API is down.
const DEFAULT_TITLE = "Shohoz Kitchen — Your trusted online marketplace";
const DEFAULT_DESCRIPTION = "Shop quality products at the best prices with Shohoz Kitchen, your trusted online marketplace in Bangladesh.";
const DEFAULT_KEYWORDS = ["shohoz kitchen", "shohozkitchen", "online shopping", "ecommerce", "bangladesh", "marketplace", "best deals", "products"];

// The title, description, keywords and the search-engine verification tags come
// from the admin panel, read on the server so they are in the first HTML Google sees.
export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  const seo = content?.seo || {};
  const ids = cleanMarketingIds(content?.marketing);

  const title = String(seo.title || "").trim() || DEFAULT_TITLE;
  const description = String(seo.description || "").trim() || DEFAULT_DESCRIPTION;
  const keywords = String(seo.keywords || "").split(",").map((k: string) => k.trim()).filter(Boolean);

  const other: Record<string, string> = {};
  if (ids.bingVerification) other["msvalidate.01"] = ids.bingVerification;
  if (ids.metaDomainVerification) other["facebook-domain-verification"] = ids.metaDomainVerification;

  return {
    metadataBase: new URL("https://www.shohozkitchen.com"),
    title: { default: title, template: "%s | Shohoz Kitchen" },
    description,
    keywords: keywords.length ? keywords : DEFAULT_KEYWORDS,
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
      title,
      description,
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
    verification: {
      ...(ids.googleVerification ? { google: ids.googleVerification } : {}),
      ...(Object.keys(other).length ? { other } : {}),
    },
  };
}

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
