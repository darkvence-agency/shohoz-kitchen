"use client";

import React from 'react';
import Link from 'next/link';
import { useGetActiveOffersQuery } from '@/redux/api/offerApi';
import SectionHeader from './SectionHeader';

/* eslint-disable @typescript-eslint/no-explicit-any */

const computeDiscount = (p: any): number => {
    const raw = p?.discount;
    if (typeof raw === 'number' && raw > 0) return Math.round(raw);
    if (typeof raw === 'string' && parseFloat(raw) > 0) return Math.round(parseFloat(raw));
    const original = p?.originalPrice || p?.mrp;
    if (original && p?.price && original > p.price) {
        return Math.round(((original - p.price) / original) * 100);
    }
    return 0;
};

/** Daraz-style deal card — mirrors the FlashSale card look for visual consistency. */
const DealCard: React.FC<{ p: any }> = ({ p }) => {
    const img = p.thumbnail || p.images?.[0] || '';
    const slug = p.slug || p._id;
    const discount = computeDiscount(p);
    const original = p.originalPrice || p.mrp;

    return (
        <Link
            href={`/product/${slug}`}
            className="group relative flex-shrink-0 w-[120px] sm:w-[140px] bg-white rounded-lg overflow-hidden border border-gray-100 hover:shadow-md transition-shadow"
        >
            <div className="relative aspect-square bg-gray-50 overflow-hidden">
                {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={img}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                )}
                {discount > 0 && (
                    <span
                        className="absolute top-0 left-0 px-1.5 py-0.5 text-[10px] font-bold text-white rounded-br-lg"
                        style={{ background: 'var(--color-sale)' }}
                    >
                        -{discount}%
                    </span>
                )}
            </div>
            <div className="p-1.5">
                <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold" style={{ color: 'var(--color-sale)' }}>
                        ৳{Number(p.price).toLocaleString()}
                    </span>
                    {original && original > p.price && (
                        <span className="text-[10px] text-gray-400 line-through">৳{Number(original).toLocaleString()}</span>
                    )}
                </div>
            </div>
        </Link>
    );
};

/**
 * Daraz-style "Daily Deals" row — fully BACKEND-DRIVEN. The active deal offer
 * (its product set + title) comes from GET /api/offers/active?type=deal, managed
 * by an admin. Reuses the FlashSale card style for a consistent look. Renders
 * nothing if there is no active deal offer.
 */
const DealsRow: React.FC = () => {
    const { data } = useGetActiveOffersQuery({ type: 'deal' });
    const offers: any[] = data?.data || [];
    const offer = offers[0]; // show the highest-priority active deal

    const items: any[] = (offer?.products || []).filter(Boolean).slice(0, 12);
    if (!offer || items.length === 0) return null;

    return (
        <div className="container mx-auto px-2 sm:px-4 my-2 sm:my-3">
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                <SectionHeader
                    title={offer.title || 'Daily Deals'}
                    seeMoreHref={offer.link || '/products?sort=-discount'}
                    seeMoreLabel="Shop More"
                />

                {/* Scrollable product row */}
                <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {items.map((p) => (
                        <DealCard key={p._id} p={p} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DealsRow;
