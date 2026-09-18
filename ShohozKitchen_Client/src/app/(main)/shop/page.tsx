import { Suspense } from 'react';
import type { Metadata } from 'next';
import ShopBrowsePage from '@/components/shop/ShopBrowsePage';

export const metadata: Metadata = {
    title: "Browse All — Shohoz Kitchen",
    description: "Browse the full Shohoz Kitchen catalog across every store and category. Filter by price, rating and availability, sort by best match or newest.",
    alternates: { canonical: "/shop" },
};

export default function ShopRoutePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
            </div>
        }>
            <ShopBrowsePage />
        </Suspense>
    );
}
