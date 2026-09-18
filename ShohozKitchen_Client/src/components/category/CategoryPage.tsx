"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { FiChevronRight } from 'react-icons/fi';
import { useGetCategoriesQuery } from '@/redux/api/categoryApi';
import StoreListing from '@/components/shared/StoreListing';

/** Normalize a category.parent (string id | populated object | null) to an id string. */
const parentId = (parent: any): string =>
    !parent ? '' : typeof parent === 'string' ? parent : (parent._id || '');

const CategoryPage: React.FC<{ slug: string }> = ({ slug }) => {
    const { data: categoriesData, isLoading } = useGetCategoriesQuery({});
    const allCategories: any[] = categoriesData?.data || [];

    const category = useMemo(
        () => allCategories.find((c: any) => c.slug === slug),
        [allCategories, slug]
    );

    /* sub-categories: categories whose parent === this category */
    const subCategories = useMemo(() => {
        if (!category) return [];
        return allCategories.filter((c: any) => parentId(c.parent) === category._id);
    }, [allCategories, category]);

    /* ── Loading ── */
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
                <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
            </div>
        );
    }

    /* ── Not found (loaded but no match) ── */
    if (!category) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-[#F8FAFC]">
                <div className="text-6xl mb-4">🗂️</div>
                <h1 className="text-xl font-bold text-gray-800 mb-1">Category not found</h1>
                <p className="text-sm text-gray-400 mb-6">We couldn&apos;t find a category for &quot;{slug}&quot;.</p>
                <Link
                    href="/products"
                    className="px-6 py-2.5 rounded-md text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: 'var(--color-primary)' }}
                >
                    Browse all products
                </Link>
            </div>
        );
    }

    const header = (
        <div className="bg-white border-b border-gray-100">
            <div className="container mx-auto px-4 py-3 sm:py-4">
                {/* Breadcrumb */}
                <div className="flex items-center gap-1.5 text-[12px] text-gray-400 mb-1.5">
                    <Link href="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
                    <FiChevronRight size={11} />
                    <Link href="/products" className="hover:text-[var(--color-primary)] transition-colors">Products</Link>
                    <FiChevronRight size={11} />
                    <span style={{ color: 'var(--color-primary)' }} className="font-medium">{category.name}</span>
                </div>

                {/* Title row */}
                <div className="flex items-center gap-3">
                    {(category.icon || category.image) && (
                        <span className="shrink-0 w-11 h-11 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden text-2xl">
                            {category.image
                                ? <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                                : category.icon}
                        </span>
                    )}
                    <div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">
                            {category.name}
                        </h1>
                        {category.productCount > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">{category.productCount.toLocaleString()} products</p>
                        )}
                    </div>
                </div>

                {/* Sub-category chips */}
                {subCategories.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide mt-3 -mb-0.5 pb-0.5">
                        {subCategories.map((sub: any) => (
                            <Link
                                key={sub._id}
                                href={`/category/${sub.slug}`}
                                className="shrink-0 flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                            >
                                {sub.icon && <span>{sub.icon}</span>}
                                {sub.name}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

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
            <StoreListing
                lockedCategory={category._id}
                headerSlot={header}
                emptyTitle={`No products in ${category.name} yet`}
            />
        </div>
    );
};

export default CategoryPage;
