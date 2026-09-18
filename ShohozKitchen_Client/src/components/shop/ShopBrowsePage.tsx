"use client";

import React from 'react';
import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';
import StoreListing from '@/components/shared/StoreListing';

/* /shop — "Browse all" alias of the full product listing. */
const ShopHeader: React.FC = () => (
    <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-3 sm:py-4">
            <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mb-1">
                <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
                <FiChevronRight size={11} />
                <span className="text-gray-600 font-medium">Shop</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                Browse All Products
            </h1>
        </div>
    </div>
);

const ShopBrowsePage: React.FC = () => {
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
            <StoreListing syncUrl headerSlot={<ShopHeader />} />
        </div>
    );
};

export default ShopBrowsePage;
