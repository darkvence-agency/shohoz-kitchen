"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FiHeart, FiAlertCircle } from 'react-icons/fi';
import NewProductCard from '@/components/shared/NewProductCard';
import { useGetSharedWishlistQuery } from '@/redux/api/userApi';

/**
 * Public, read-only shared wishlist: /wishlist/shared/[userId].
 * Anyone with the link can view the owner's saved products (no auth).
 * Reuses NewProductCard so visitors can still add items to their own cart;
 * the heart toggle only affects the viewer's own wishlist, never the owner's.
 */

const mapServerProduct = (p: any) => ({
    id: String(p._id),
    slug: p.slug,
    name: p.name,
    image: p.images?.[0] || '',
    price: p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price,
    originalPrice: p.discountPrice && p.discountPrice < p.price ? p.price : undefined,
    rating: p.averageRating || 0,
    reviews: p.totalReviews || 0,
    reviewCount: p.totalReviews || 0,
    categoryName: '',
});

export default function SharedWishlistPage() {
    const params = useParams();
    const userId = (Array.isArray(params?.userId) ? params.userId[0] : params?.userId) as string | undefined;

    const { data, isLoading, isError } = useGetSharedWishlistQuery(userId as string, {
        skip: !userId,
    });

    const products: any[] = (data?.data || []).map(mapServerProduct);
    const count = products.length;

    return (
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 mb-3 sm:mb-4 flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                    <FiHeart size={18} className="text-[var(--color-primary)]" />
                </span>
                <div className="min-w-0">
                    <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Shared Wishlist</h1>
                    <p className="text-[12px] text-slate-400">
                        {isLoading ? 'Loading…' : `${count} item${count !== 1 ? 's' : ''}`}
                    </p>
                </div>
            </div>

            {/* Body */}
            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white border border-gray-200 animate-pulse">
                            <div className="aspect-square bg-slate-100" />
                            <div className="p-2.5 space-y-2">
                                <div className="h-3 bg-slate-100 rounded w-3/4" />
                                <div className="h-3 bg-slate-100 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : isError ? (
                <div className="bg-white rounded-lg shadow-sm p-10 sm:p-14 text-center">
                    <FiAlertCircle size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Wishlist not found</h3>
                    <p className="text-sm text-slate-400 mb-5">This shared wishlist link may be invalid or no longer available.</p>
                    <Link
                        href="/products"
                        className="inline-block px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                    >
                        Browse products
                    </Link>
                </div>
            ) : count === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-10 sm:p-14 text-center">
                    <FiHeart size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">This wishlist is empty</h3>
                    <p className="text-sm text-slate-400 mb-5">There are no saved items to show right now.</p>
                    <Link
                        href="/products"
                        className="inline-block px-6 py-2.5 rounded-lg text-white font-semibold text-sm transition-all hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                    >
                        Browse products
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
                    {products.map((product) => (
                        <NewProductCard key={product.id} product={product} />
                    ))}
                </div>
            )}
        </div>
    );
}
