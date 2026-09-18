"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiZap, FiChevronRight } from 'react-icons/fi';
import { useGetActiveOffersQuery } from '@/redux/api/offerApi';
import { useGetProductsQuery } from '@/redux/api/productApi';

/* eslint-disable @typescript-eslint/no-explicit-any */

const pad = (n: number) => String(n).padStart(2, '0');

/** Seconds left until the given end time (from the backend offer). */
const secondsUntil = (end: Date): number =>
    Math.max(0, Math.floor((end.getTime() - Date.now()) / 1000));

const Box: React.FC<{ v: number }> = ({ v }) => (
    <span
        className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded text-white text-xs sm:text-sm font-bold tabular-nums"
        style={{ background: 'var(--color-sale)' }}
        suppressHydrationWarning
    >
        {pad(v)}
    </span>
);

const Countdown: React.FC<{ endTime: string }> = ({ endTime }) => {
    const [secs, setSecs] = useState<number | null>(null);

    useEffect(() => {
        const end = new Date(endTime);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSecs(secondsUntil(end));
        const t = setInterval(() => setSecs(secondsUntil(end)), 1000);
        return () => clearInterval(t);
    }, [endTime]);

    const h = secs === null ? 0 : Math.floor(secs / 3600);
    const m = secs === null ? 0 : Math.floor((secs % 3600) / 60);
    const s = secs === null ? 0 : secs % 60;

    return (
        <div className="flex items-center gap-1">
            <Box v={h} />
            <span className="font-bold" style={{ color: 'var(--color-sale)' }}>:</span>
            <Box v={m} />
            <span className="font-bold" style={{ color: 'var(--color-sale)' }}>:</span>
            <Box v={s} />
        </div>
    );
};

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

const FlashCard: React.FC<{ p: any }> = ({ p }) => {
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
 * Daraz-style Flash Sale row — loads active campaign or products marked isOnSale by Admin.
 */
const FlashSale: React.FC = () => {
    const { data } = useGetActiveOffersQuery({ type: 'flash-sale' });
    const { data: onSaleData } = useGetProductsQuery({ isOnSale: true, limit: 12 });
    const offers: any[] = data?.data || [];
    const offer = offers[0]; // show the highest-priority active flash sale

    const offerItems: any[] = (offer?.products || []).filter(Boolean);
    const onSaleItems: any[] = onSaleData?.data || [];
    const items: any[] = offerItems.length > 0 ? offerItems.slice(0, 12) : onSaleItems.slice(0, 12);
    if (items.length === 0) return null;

    return (
        <div className="container mx-auto px-2 sm:px-4 my-2 sm:my-3">
            <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <h2 className="flex items-center gap-1 text-lg sm:text-xl font-extrabold text-gray-900">
                            {offer?.title || 'Flash'}
                            <FiZap size={18} style={{ color: 'var(--color-sale)' }} className="fill-current" />
                            {!offer?.title && 'Sale'}
                        </h2>
                        {offer?.endTime && <Countdown endTime={offer.endTime} />}
                    </div>
                    <Link
                        href={offer?.link || '/products?isOnSale=true'}
                        className="flex items-center text-xs sm:text-sm font-semibold text-gray-600 hover:text-[var(--color-primary)]"
                    >
                        Shop More <FiChevronRight size={16} />
                    </Link>
                </div>

                {/* Scrollable product row */}
                <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide">
                    {items.map((p) => (
                        <FlashCard key={p._id} p={p} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FlashSale;
