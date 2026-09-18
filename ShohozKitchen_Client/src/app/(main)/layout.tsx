import Header from "@/components/layout/Header/Header";
import NewFooter from "@/components/layout/Footer/NewFooter";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            <Header />
            <main className="pb-[58px] sm:pb-0">
                {children}
            </main>
            <NewFooter />
            <MobileBottomNav />
        </>
    );
}
