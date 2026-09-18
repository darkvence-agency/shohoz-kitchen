"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';
import { useGetCategoriesQuery } from '@/redux/api/categoryApi';
import StoreListing from '@/components/shared/StoreListing';

/* ── Page header bar (breadcrumb + title) rendered above the listing ── */
const ProductsHeader: React.FC = () => {
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get('category') || '';
    const searchParam = searchParams.get('q') || '';

    const { data: categoriesData } = useGetCategoriesQuery({});
    const activeCategoryName =
        categoriesData?.data?.find((c: any) => c._id === categoryParam)?.name || '';

    return (
        <div className="bg-white border-b border-gray-100">
            <div className="container mx-auto px-4 py-3 sm:py-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mb-1">
                    <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
                    <FiChevronRight size={11} />
                    <span className="text-gray-600 font-medium">Products</span>
                    {activeCategoryName && (
                        <>
                            <FiChevronRight size={11} />
                            <span style={{ color: 'var(--color-primary)' }} className="font-medium">{activeCategoryName}</span>
                        </>
                    )}
                </div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                    {searchParam ? `Results for "${searchParam}"` : activeCategoryName || 'All Products'}
                </h1>
            </div>
        </div>
    );
};

const ProductsPage: React.FC = () => {
    return (
        <div
            className="min-h-screen"
            style={{
                background:
                    'radial-gradient(55% 35% at 90% 0%, rgba(var(--color-primary-rgb), 0.05), transparent 70%),' +
                    'radial-gradient(40% 30% at 0% 15%, rgba(var(--color-primary-rgb), 0.04), transparent 70%),' +
                    '#F8FAFC',
            }}
        >
            <StoreListing syncUrl headerSlot={<ProductsHeader />} />
        </div>
    );
};

export default ProductsPage;
