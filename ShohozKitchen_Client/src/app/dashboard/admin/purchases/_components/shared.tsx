"use client";

import type { Tone } from '@/components/admin/ui';
import type {
    PaymentMethod, PurchaseCurrency, PurchaseStatus, ShippingMode,
} from '@/redux/api/purchaseApi';

/* Helpers shared by the purchase pages, the supplier pages and the printable bill. */

export const PURCHASES_HREF = '/dashboard/admin/purchases';
export const purchaseHref = (id: string) => `${PURCHASES_HREF}/${id}`;
export const SUPPLIERS_HREF = '/dashboard/admin/suppliers';

export const STATUS: Record<PurchaseStatus, { label: string; tone: Tone }> = {
    draft: { label: 'Draft', tone: 'gray' },
    confirmed: { label: 'Confirmed', tone: 'blue' },
    partially_received: { label: 'Partially Received', tone: 'teal' },
    received: { label: 'Received', tone: 'green' },
    cancelled: { label: 'Cancelled', tone: 'red' },
};
export const statusMeta = (s: string) => STATUS[s as PurchaseStatus] || { label: s, tone: 'gray' as Tone };

export const SHIPPING: { value: ShippingMode; label: string }[] = [
    { value: '', label: 'Not set' },
    { value: 'sea', label: 'Sea' },
    { value: 'air', label: 'Air' },
    { value: 'road', label: 'Road' },
    { value: 'local', label: 'Local' },
];
export const shippingLabel = (m?: string) => SHIPPING.find((s) => s.value === m && m)?.label || '';

export const CURRENCIES: { value: PurchaseCurrency; label: string; symbol: string }[] = [
    { value: 'BDT', label: 'BDT', symbol: '৳' },
    { value: 'RMB', label: 'RMB', symbol: '¥' },
    { value: 'USD', label: 'USD', symbol: '$' },
];
export const currencySymbol = (c?: string) => CURRENCIES.find((x) => x.value === c)?.symbol || '৳';

/** ¥2,750.50 / $12 / ৳1,61,938 — BDT with South-Asian grouping, the others Western. */
export const money = (n: number | null | undefined, currency: string = 'BDT', decimals = 2) =>
    currencySymbol(currency) + Number(n || 0).toLocaleString(currency === 'BDT' ? 'en-IN' : 'en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
    });

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
    { value: 'bank', label: 'Bank transfer' },
    { value: 'cash', label: 'Cash' },
    { value: 'bkash', label: 'bKash' },
    { value: 'nagad', label: 'Nagad' },
    { value: 'other', label: 'Other' },
];
export const methodLabel = (m?: string) => PAYMENT_METHODS.find((x) => x.value === m)?.label || m || '';

export const personName = (u?: { firstName?: string; lastName?: string } | null) =>
    [u?.firstName, u?.lastName].filter(Boolean).join(' ');

/* ─── Bangladesh dates ─────────────────────────────────────────────────── */

const DHAKA = 'Asia/Dhaka';

/** YYYY-MM-DD of an instant in Dhaka (defaults to now). */
export const dhakaDay = (d: Date | string = new Date()) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: DHAKA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));

/** 30 Aug 2026, in Dhaka. */
export const fmtDay = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: DHAKA }) : '—';

/** 30 Aug 2026, 3:26 pm, in Dhaka. */
export const fmtStamp = (d?: string | null) =>
    d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: DHAKA }) : '—';

/** Day arithmetic on YYYY-MM-DD strings. */
export const shiftDay = (day: string, n: number) =>
    new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

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

/** Inclusive Dhaka days for a period, relative to `today` (YYYY-MM-DD). */
export function periodDays(p: Period, today: string, from: string, to: string): { from?: string; to?: string } {
    const [y, m] = today.split('-').map(Number);
    const pad = (n: number) => String(n).padStart(2, '0');
    const monthStart = `${y}-${pad(m)}-01`;
    switch (p) {
        case 'this_month': return { from: monthStart, to: today };
        case 'last_month': {
            const py = m === 1 ? y - 1 : y;
            const pm = m === 1 ? 12 : m - 1;
            return { from: `${py}-${pad(pm)}-01`, to: shiftDay(monthStart, -1) };
        }
        case 'last_30': return { from: shiftDay(today, -29), to: today };
        case 'last_90': return { from: shiftDay(today, -89), to: today };
        case 'this_year': return { from: `${y}-01-01`, to: today };
        case 'custom': return { from: from || undefined, to: to || undefined };
        default: return {};
    }
}

/* ─── Numbers from inputs ──────────────────────────────────────────────── */

/** '' → undefined; a finite number ≥ 0 → it; anything else → null. */
export function parseAmount(v: string): number | undefined | null {
    if (v.trim() === '') return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/* ─── Live totals (mirror of the server's purchase.utils; the server recomputes) ─ */

export interface CalcInput {
    currency: string;
    exchangeRate: number;
    items: { qty: number; unitCost: number }[];
    shippingCost: number;
    customsDuty: number;
    otherCost: number;
    discount: number;
}

export function calcTotals(p: CalcInput) {
    const rate = p.currency === 'BDT' ? 1 : p.exchangeRate || 0;
    const raw = p.items.reduce((s, i) => s + (i.qty || 0) * (i.unitCost || 0), 0);
    const subtotalBdt = round2(raw * rate);
    const extras = (p.shippingCost || 0) + (p.customsDuty || 0) + (p.otherCost || 0) - (p.discount || 0);
    const lines = p.items.map((i) => (i.qty || 0) * (i.unitCost || 0) * rate);
    const sumLines = lines.reduce((s, v) => s + v, 0);
    const totalQty = p.items.reduce((s, i) => s + (i.qty || 0), 0);
    const landed = p.items.map((i, k) => {
        if (!(i.qty > 0)) return 0;
        const share = sumLines > 0 ? lines[k] / sumLines : totalQty > 0 ? i.qty / totalQty : 0;
        return round2(Math.max(0, (lines[k] + extras * share) / i.qty));
    });
    return { subtotal: round2(raw), subtotalBdt, extras: round2(extras), grandTotal: round2(subtotalBdt + extras), landed, rate };
}
