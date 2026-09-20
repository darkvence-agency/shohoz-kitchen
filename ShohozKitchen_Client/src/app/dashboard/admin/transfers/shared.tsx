"use client";

import { useEffect, useState } from 'react';
import { LuPackage } from 'react-icons/lu';
import type { Tone } from '@/components/admin/ui';
import type { TransferStatus } from '@/redux/api/transferApi';

/* Helpers shared by the Warehouses and Transfers pages. Dates are Bangladesh days. */

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const TZ = 'Asia/Dhaka';

/** Today in Bangladesh, YYYY-MM-DD. */
export const dhakaToday = () => new Date(Date.now() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);

/** The Bangladesh calendar day of an instant, YYYY-MM-DD. */
export const dhakaDayOf = (d: string | Date) => new Date(new Date(d).getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);

export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** 19 Sep 2026 (Bangladesh time) */
export const fmtDay = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '—';

/** 19 Sep 2026, 3:28 pm (Bangladesh time) */
export const fmtDayTime = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }) : '—';

export const qty = (n: number | null | undefined) => Number(n || 0).toLocaleString('en-IN');
export const plural = (n: number, one: string, many = `${one}s`) => `${qty(n)} ${n === 1 ? one : many}`;

const UNIT_SHORT: Record<string, string> = {
    piece: 'PC', pieces: 'PC', pcs: 'PC', pc: 'PC', kilogram: 'KG', kg: 'KG', gram: 'G', g: 'G', liter: 'L', litre: 'L', l: 'L',
    milliliter: 'ML', ml: 'ML', meter: 'M', m: 'M', centimeter: 'CM', cm: 'CM', inch: 'IN', pack: 'PACK', pair: 'PAIR',
    box: 'BOX', dozen: 'DZ', set: 'SET', roll: 'ROLL',
};
/** "piece" → "PC"; unknown units are shown upper-cased; free-text items have none. */
export const unitShort = (u?: string) => (u ? UNIT_SHORT[u.toLowerCase()] || u.toUpperCase() : '');

export const TRANSFER_STATUS: Record<TransferStatus, { label: string; tone: Tone }> = {
    in_transit: { label: 'In transit', tone: 'amber' },
    received: { label: 'Received', tone: 'green' },
    cancelled: { label: 'Cancelled', tone: 'gray' },
};

/** First useful message from an RTK Query error. */
export function errMsg(err: unknown, fallback: string): string {
    const e = err as { data?: { message?: string; errorMessages?: { message?: string }[] } } | undefined;
    // errorMessages holds the specific reason (e.g. which field failed validation).
    return e?.data?.errorMessages?.[0]?.message || e?.data?.message || fallback;
}

/** HTTP status of an RTK Query error, if any. */
export const errStatus = (err: unknown) => (err as { status?: number } | undefined)?.status;

export function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setV(value), ms);
        return () => clearTimeout(t);
    }, [value, ms]);
    return v;
}

/* ─── Periods (Bangladesh days, inclusive) ─── */

export type Period = 'all' | 'this_month' | 'last_month' | 'last_30' | 'last_90' | 'this_year' | 'custom';

export const PERIODS: { value: Period; label: string }[] = [
    { value: 'all', label: 'All time' },
    { value: 'this_month', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
    { value: 'last_30', label: 'Last 30 days' },
    { value: 'last_90', label: 'Last 90 days' },
    { value: 'this_year', label: 'This year' },
    { value: 'custom', label: 'Custom range' },
];

export function periodDays(p: Period, today: string, customFrom: string, customTo: string): { dateFrom?: string; dateTo?: string } {
    const [y, m] = today.split('-');
    switch (p) {
        case 'this_month': return { dateFrom: `${y}-${m}-01`, dateTo: today };
        case 'last_month': {
            const firstThis = `${y}-${m}-01`;
            const lastPrev = addDays(firstThis, -1);
            return { dateFrom: `${lastPrev.slice(0, 7)}-01`, dateTo: lastPrev };
        }
        case 'last_30': return { dateFrom: addDays(today, -29), dateTo: today };
        case 'last_90': return { dateFrom: addDays(today, -89), dateTo: today };
        case 'this_year': return { dateFrom: `${y}-01-01`, dateTo: today };
        case 'custom': {
            const ok = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
            const f = ok(customFrom) ? customFrom : undefined;
            const t = ok(customTo) ? customTo : undefined;
            // A reversed range is swapped rather than rejected.
            return f && t && f > t ? { dateFrom: t, dateTo: f } : { dateFrom: f, dateTo: t };
        }
        default: return {};
    }
}

/** Whole days from one Bangladesh day to another. */
export const daysBetween = (from: string, to: string) =>
    Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

/** Whole number from 1 to 1,000,000 typed in a box, or null. */
export function parseQty(v: string): number | null {
    if (v.trim() === '') return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= 1_000_000 ? n : null;
}

export function Thumb({ src, size = 36 }: { src?: string; size?: number }) {
    return (
        <span
            className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-gray-300"
            style={{ width: size, height: size }}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <LuPackage size={Math.round(size * 0.45)} />}
        </span>
    );
}

export const DATE_PILL ='h-9 min-w-0 rounded-full border border-transparent bg-gray-100 px-4 text-sm text-gray-800 outline-none transition focus:border-[var(--color-primary-border)] focus:bg-white';
