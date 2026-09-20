"use client";

import { useEffect, useState } from 'react';
import type { Tone } from '@/components/admin/ui';
import type { MovementType } from '@/redux/api/inventoryApi';

/* The unit list itself comes from Units (unitApi → unitOptions), shared with the product form. */
const UNIT_SHORT: Record<string, string> = {
    piece: 'PC', pcs: 'PC', pc: 'PC', kg: 'KG', kilogram: 'KG', gram: 'G', g: 'G', liter: 'L', litre: 'L', l: 'L',
    meter: 'M', pack: 'PACK', pair: 'PAIR', box: 'BOX', dozen: 'DZ', set: 'SET',
};
export const unitShort = (u?: string) => UNIT_SHORT[(u || 'piece').toLowerCase()] || (u || 'PC').toUpperCase();

export const qty = (n: number | null | undefined) => Number(n || 0).toLocaleString('en-IN');

/** +12 / −3 with a real minus sign. */
export const signed = (n: number) => (n > 0 ? `+${qty(n)}` : n < 0 ? `−${qty(Math.abs(n))}` : '0');

export const PRODUCT_STATUS: Record<string, { label: string; tone: Tone }> = {
    active: { label: 'Active', tone: 'green' },
    draft: { label: 'Draft', tone: 'gray' },
    'out-of-stock': { label: 'Out of stock', tone: 'red' },
};

export const MOVEMENT: Record<MovementType, { label: string; tone: Tone }> = {
    opening: { label: 'Opening', tone: 'blue' },
    stock_in: { label: 'Stock in', tone: 'green' },
    stock_out: { label: 'Stock out', tone: 'rose' },
    adjustment: { label: 'Adjustment', tone: 'amber' },
    sale: { label: 'Sale', tone: 'indigo' },
    return: { label: 'Return', tone: 'teal' },
    cancel: { label: 'Cancelled order', tone: 'sky' },
};

export const editProductHref = (id: string) => `/dashboard/admin/products/new?id=${id}`;

/** First useful message from an RTK Query error. */
export function errorMessage(err: unknown, fallback: string): string {
    const e = err as { data?: { message?: string; errorMessages?: { message?: string }[] } } | undefined;
    return e?.data?.errorMessages?.[0]?.message || e?.data?.message || fallback;
}

/** Debounce the search boxes so every keystroke doesn't hit the API. */
export function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

/** A page number that snaps back to 1 whenever `key` (the filters) changes. */
export function usePage(key: string) {
    const [s, setS] = useState({ key, page: 1 });
    const page = s.key === key ? s.page : 1;
    return [page, (p: number) => setS({ key, page: p })] as const;
}

/** Whole number ≥ min from an input string, or null. */
export function parseWhole(v: string, min = 0): number | null {
    if (v.trim() === '') return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= min ? n : null;
}

/** Money (≥ 0, up to 2 decimals) from an input string; undefined when empty, null when invalid. */
export function parseMoney(v: string): number | undefined | null {
    if (v.trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function Thumb({ src, size = 36 }: { src?: string; size?: number }) {
    return (
        <span
            className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
            style={{ width: size, height: size }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
        </span>
    );
}
