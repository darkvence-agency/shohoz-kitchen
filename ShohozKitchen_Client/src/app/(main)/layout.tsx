import Header from "@/components/layout/Header/Header";
import NewFooter from "@/components/layout/Footer/NewFooter";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import MarketingTags from "@/components/marketing/MarketingTags";
import { getSiteContent } from "@/lib/siteContent.server";
import { cleanMarketingIds } from "@/lib/marketing";

// Tracking lives here and not in the root layout, so the admin panel and the
// customer dashboard are never sent to Google, Meta or TikTok.
export default async function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const content = await getSiteContent();
    const ids = cleanMarketingIds(content?.marketing);

    return (
        <>
            <MarketingTags ids={ids} />
            <Header />
            <main className="pb-[58px] sm:pb-0">
                {children}
            </main>
            <NewFooter />
            <MobileBottomNav />
        </>
    );
}
