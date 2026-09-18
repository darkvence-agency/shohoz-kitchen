"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import Link from 'next/link';
import { FiHeart, FiShare2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import NewProductCard from '@/components/shared/NewProductCard';
import { useAppSelector } from '@/redux';
import { useGetWishlistQuery } from '@/redux/api/userApi';

/**
 * Storefront wishlist page (Daraz-style).
 * - Logged-in users  → server wishlist via useGetWishlistQuery
 * - Guests           → local Redux wishlistSlice items
 * Reuses NewProductCard, which already handles wishlist-toggle (remove) and
 * add-to-cart for both auth + guest states, so each card gets remove + add-to-cart.
 */

// Server product shape → NewProductCard props
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

// Guest wishlistSlice item shape → NewProductCard props
const mapGuestItem = (i: any) => ({
    id: String(i.id),
    name: i.name,
    image: i.image,
    price: i.price,
    originalPrice: i.mrp && i.mrp > i.price ? i.mrp : undefined,
    mrp: i.mrp,
    rating: i.rating || 0,
    categoryName: i.category || '',
});

export default function WishlistStorefrontPage() {
    const { isAuthenticated, user } = useAppSelector((state: any) => state.auth);
    const localItems = useAppSelector((state: any) => state.wishlist.items);

    const { data, isLoading, isFetching } = useGetWishlistQuery({}, { skip: !isAuthenticated });

    const products: any[] = isAuthenticated
        ? (data?.data || []).map(mapServerProduct)
        : (localItems || []).map(mapGuestItem);

    const loading = isAuthenticated && (isLoading || isFetching);
    const count = products.length;

    const handleShare = async () => {
        const userId = user?.id;
        if (!userId) return;
        const url = `${window.location.origin}/wishlist/shared/${userId}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success('Wishlist link copied to clipboard!', {
                style: { borderRadius: '10px', background: 'var(--color-primary)', color: '#fff' },
            });
        } catch {
            // Clipboard API may be unavailable (insecure context) — show the link as a fallback
            toast(url, { duration: 6000 });
        }
    };

    return (
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-5 mb-3 sm:mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0">
                        <FiHeart size={18} className="text-[var(--color-primary)]" />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">My Wishlist</h1>
                        <p className="text-[12px] text-slate-400">
                            {count} item{count !== 1 ? 's' : ''} saved
                        </p>
                    </div>
                </div>

                {isAuthenticated && (
                    <button
                        onClick={handleShare}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-white text-[13px] font-semibold transition-all hover:-translate-y-0.5"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                    >
                        <FiShare2 size={15} />
                        <span className="hidden sm:inline">Share Wishlist</span>
                        <span className="sm:hidden">Share</span>
                    </button>
                )}
            </div>

            {/* Body */}
            {loading ? (
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
            ) : count === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-10 sm:p-14 text-center">
                    <FiHeart size={48} className="mx-auto text-slate-200 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">Your wishlist is empty</h3>
                    <p className="text-sm text-slate-400 mb-5">Save items you love so you can find them later.</p>
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
