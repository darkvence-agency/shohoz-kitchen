import { Suspense } from 'react';
import type { Metadata } from 'next';
import ProductsPage from '@/components/products/ProductsPage';

export const metadata: Metadata = {
    title: "Browse All Products",
    description: "Explore our full catalog of quality products sourced from China — electronics, fashion, home & lifestyle, industrial supplies and more. Best prices, fast shipping to Bangladesh.",
    alternates: { canonical: "/products" },
};

export default function ProductsRoutePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
            </div>
        }>
            <ProductsPage />
        </Suspense>
    );
}
