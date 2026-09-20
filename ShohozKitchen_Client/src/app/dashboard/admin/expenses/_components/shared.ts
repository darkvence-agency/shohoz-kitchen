"use client";

import { useEffect, useState } from 'react';

/*
 * Helpers shared by the Expenses and Investors pages.
 * Dates are Bangladesh calendar days as YYYY-MM-DD strings, handled with UTC maths
 * so the viewer's own time zone can never shift a day.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today in Dhaka, YYYY-MM-DD. */
export const dhakaToday = (): string =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const addDays = (day: string, n: number): string =>
    new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

export const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** "2026-09-17" → "17 Sep 2026" (the day as written, whatever the viewer's zone). */
export const fmtDay = (day?: string | null, withYear = true) => {
    if (!day || !isDay(day)) return '—';
    return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC',
    });
};

/** "2026-09" → "Sep" / "Sep 2026" */
export const fmtMonth = (key: string, withYear = false) =>
    new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' });

/** "17 Sep 2026", "1 – 17 Sep 2026", "28 Aug – 17 Sep 2026" */
export function fmtRange(from?: string, to?: string): string {
    if (!from && !to) return 'All time';
    if (from && !to) return `Since ${fmtDay(from)}`;
    if (!from && to) return `Up to ${fmtDay(to)}`;
    if (from === to) return fmtDay(from);
    const [fy, fm] = (from as string).split('-');
    const [ty, tm] = (to as string).split('-');
    const d = (s: string, o: Intl.DateTimeFormatOptions) => new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' });
    if (fy !== ty) return `${fmtDay(from)} – ${fmtDay(to)}`;
    if (fm !== tm) return `${d(from as string, { day: 'numeric', month: 'short' })} – ${fmtDay(to)}`;
    return `${d(from as string, { day: 'numeric' })} – ${fmtDay(to)}`;
}

/** Every month key (YYYY-MM) from the month of `from` to the month of `to`, inclusive. */
export function monthKeysBetween(from: string, to: string): string[] {
    let [y, m] = from.split('-').map(Number);
    const [ty, tm] = to.split('-').map(Number);
    const out: string[] = [];
    while ((y < ty || (y === ty && m <= tm)) && out.length < 1200) {
        out.push(`${y}-${String(m).padStart(2, '0')}`);
        m += 1;
        if (m > 12) { m = 1; y += 1; }
    }
    return out;
}

/* ─── Period presets ─────────────────────────────────────── */

export type PeriodKey = 'this_month' | 'last_month' | 'last_30' | 'last_90' | 'this_year' | 'last_year' | 'all' | 'custom';

export const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
    { value: 'this_month', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
    { value: 'last_30', label: 'Last 30 days' },
    { value: 'last_90', label: 'Last 90 days' },
    { value: 'this_year', label: 'This year' },
    { value: 'last_year', label: 'Last year' },
    { value: 'all', label: 'All time' },
    { value: 'custom', label: 'Custom range' },
];

/** Inclusive Dhaka days for a preset; {} = all time. 'custom' returns {} (the caller keeps its own dates). */
export function presetRange(key: PeriodKey, today = dhakaToday()): { from?: string; to?: string } {
    const y = Number(today.slice(0, 4));
    const monthStart = `${today.slice(0, 8)}01`;
    switch (key) {
        case 'this_month': return { from: monthStart, to: today };
        case 'last_month': {
            const lastPrev = addDays(monthStart, -1);
            return { from: `${lastPrev.slice(0, 8)}01`, to: lastPrev };
        }
        case 'last_30': return { from: addDays(today, -29), to: today };
        case 'last_90': return { from: addDays(today, -89), to: today };
        case 'this_year': return { from: `${y}-01-01`, to: today };
        case 'last_year': return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
        default: return {};
    }
}

/* ─── Money ──────────────────────────────────────────────── */

export const round2 = (n: number) => Math.round((n + (n >= 0 ? Number.EPSILON : -Number.EPSILON)) * 100) / 100;

/** A positive amount (≤ 2 decimals) from an input; null when empty, NaN when invalid. */
export function parseAmount(v: string): number | null {
    const s = v.replace(/[,\s৳]/g, '');
    if (s === '') return null;
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
    return round2(Number(s));
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
    'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const upTo99 = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);
const upTo999 = (n: number) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : '', n % 100 ? upTo99(n % 100) : ''].filter(Boolean).join(' ');

/** Whole number in words, South-Asian scale: 1,25,000 → "One Lakh Twenty Five Thousand". */
export function numberInWords(n: number): string {
    n = Math.floor(Math.abs(n));
    if (n === 0) return 'Zero';
    const crore = Math.floor(n / 1e7);
    const lakh = Math.floor((n % 1e7) / 1e5);
    const thousand = Math.floor((n % 1e5) / 1e3);
    const rest = n % 1e3;
    return [
        crore ? `${numberInWords(crore)} Crore` : '',
        lakh ? `${upTo99(lakh)} Lakh` : '',
        thousand ? `${upTo99(thousand)} Thousand` : '',
        rest ? upTo999(rest) : '',
    ].filter(Boolean).join(' ');
}

/** 2500.5 → "Taka Two Thousand Five Hundred and Fifty Paisa Only" */
export function takaInWords(amount: number): string {
    const r = round2(Math.abs(amount || 0));
    const whole = Math.floor(r);
    const paisa = Math.round((r - whole) * 100);
    return `Taka ${numberInWords(whole)}${paisa ? ` and ${upTo99(paisa)} Paisa` : ''} Only`;
}

/* ─── Errors, debounce ───────────────────────────────────── */

type ApiError = { data?: { message?: string; errorMessages?: { path?: string; message?: string }[] } };

/** First useful message from an RTK Query error. */
export const errMsg = (err: unknown, fallback: string) => {
    const e = err as ApiError;
    return e?.data?.errorMessages?.[0]?.message || e?.data?.message || fallback;
};

/** Field errors from a server validation error: { amount: '…', title: '…' }. */
export const fieldErrors = (err: unknown): Record<string, string> => {
    const out: Record<string, string> = {};
    for (const m of (err as ApiError)?.data?.errorMessages || []) {
        const key = String(m.path || '').replace(/^body\./, '').split('.').pop() || '';
        if (key && m.message && !out[key]) out[key] = m.message;
    }
    return out;
};

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

/* ─── CSV ────────────────────────────────────────────────── */

const csvCell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\r\n');

/** Save rows as a CSV file (with a BOM so Excel reads ৳ and Bangla correctly). */
export function downloadCsv(filename: string, rows: unknown[][]) {
    const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The pill-style date input used in the filter bars. */
export const DATE_PILL = 'h-9 min-w-0 flex-1 rounded-full border border-transparent bg-gray-100 px-3 text-sm text-gray-800 outline-none transition focus:border-[var(--color-primary-border)] focus:bg-white sm:w-[150px] sm:flex-none';
