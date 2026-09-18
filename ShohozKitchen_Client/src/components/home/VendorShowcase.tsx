"use client";

import React from 'react';
import Link from 'next/link';
import { FiStar } from 'react-icons/fi';
import { useGetAllShopsQuery } from '@/redux/api/shopApi';
import SectionHeader from './SectionHeader';

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Daraz-style "Top Stores" row — horizontal scroll of approved shops from
 * GET /api/shops. Each store shows its logo, name, rating and a "Visit Store"
 * link to /vendor/<slug>. Renders nothing if there are no shops.
 */
const VendorShowcase: React.FC = () => {
    const { data } = useGetAllShopsQuery({ limit: 12 });
    const shops: any[] = data?.data || [];

    if (shops.length === 0) return null;

    return (
        <div className="container mx-auto px-2 sm:px-4 my-2 sm:my-3">
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                <SectionHeader title="Top Stores" seeMoreHref="/vendors" />

                <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {shops.map((shop) => {
                        const rating = Number(shop.rating || 0);
                        const shopLogo = shop.logo || shop.businessPhoto || shop.owner?.avatar;
                        return (
                            <div
                                key={shop._id}
                                className="group flex-shrink-0 w-[150px] sm:w-[180px] bg-white rounded-lg border border-gray-100 hover:border-[var(--color-primary)]/40 hover:shadow-md transition-all p-3 flex flex-col items-center text-center"
                            >
                                {/* Logo */}
                                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                                    {shopLogo ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={shopLogo}
                                            alt={shop.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-2xl sm:text-3xl font-extrabold text-[var(--color-primary)]">
                                            {(shop.name || '?').charAt(0).toUpperCase()}
                                        </span>
                                    )}
                                </div>

                                {/* Name */}
                                <h3 className="mt-2 text-[13px] sm:text-sm font-bold text-gray-800 line-clamp-1 w-full group-hover:text-[var(--color-primary)] transition-colors">
                                    {shop.name}
                                </h3>

                                {/* Rating */}
                                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
                                    <FiStar size={11} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
                                    <span className="text-gray-500 font-medium">
                                        {rating > 0 ? rating.toFixed(1) : 'New'}
                                    </span>
                                </div>

                                {/* Visit Store */}
                                <Link
                                    href={`/vendor/${shop.slug}`}
                                    className="mt-2.5 w-full text-center text-[11px] sm:text-xs font-semibold py-1.5 rounded-full border border-[var(--color-primary)]/30 text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
                                >
                                    Visit Store
                                </Link>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default VendorShowcase;
