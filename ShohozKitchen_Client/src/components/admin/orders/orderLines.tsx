/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * The parts of an order's line list that the dashboard builds twice: once when staff take
 * a new order over the phone, and again when they correct one that has already been
 * placed. Both need the same product picker, the same idea of what a line costs, and the
 * same money input — and both must agree with the server, which re-prices every line it
 * is sent.
 */

import React, { useEffect, useRef, useState } from 'react';
import { LuMinus, LuPackage, LuPlus, LuRotateCcw, LuSearch, LuTrash2 } from 'react-icons/lu';
import { useGetProductsQuery } from '@/redux/api/productApi';
import type { OrderPaymentMethod } from '@/redux/api/orderApi';
import { Badge, taka, cx } from '@/components/admin/ui';

/* ─── Types ─────────────────────────────────────────────────────────────── */

/**
 * Prices typed for one line of THIS order. `null` on the line means "the product's own
 * price" — nothing is sent and the server resolves it. `by` tells the customer's default
 * discount (re-applied when the customer changes) from staff's own edits (kept).
 */
export type Pricing = { original: string; sale: string; by: 'customer' | 'admin' };
export type Line = { key: string; product: any; color: string; size: string; qty: number; pricing: Pricing | null };
export type ShipMode = 'auto' | 'free' | 'custom';

export const PAYMENT_METHODS: ReadonlyArray<{ id: OrderPaymentMethod; label: string; color: string }> = [
    { id: 'cod', label: 'Cash on delivery', color: '#16a34a' },
    { id: 'bkash', label: 'bKash', color: '#E2136E' },
    { id: 'nagad', label: 'Nagad', color: '#F47920' },
    { id: 'rocket', label: 'Rocket', color: '#8C3EC0' },
    { id: 'bank', label: 'Bank transfer', color: '#0F766E' },
];

/* ─── Pricing helpers ───────────────────────────────────────────────────── */

export const same = (a: any, b: any) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
export const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean)));

export function findVariant(p: any, color: string, size: string): any | undefined {
    if (!color && !size) return undefined;
    return (p.variants || []).find((vv: any) => (!color || same(vv.color, color)) && (!size || same(vv.size, size)));
}

/**
 * The unit price the server charges when staff leave the price alone — mirrors
 * catalogUnitPrice in order.service. A variant's `price` is already its sale price
 * (its `discount` is only the % off its originalPrice), so it is not discounted again.
 */
export function unitPrice(p: any, color: string, size: string): number {
    const v = findVariant(p, color, size);
    if (v) return Number(v.price) || 0;
    const now = Date.now();
    const start = p.offerStartDate ? new Date(p.offerStartDate).getTime() : NaN;
    const end = p.offerEndDate ? new Date(p.offerEndDate).getTime() : NaN;
    const offerActive = (isNaN(start) || now >= start) && (isNaN(end) || now <= end);
    if (offerActive) return p.price;
    return p.originalPrice > 0 ? p.originalPrice : p.price;
}

/** The list ("was") price of the product, or of the chosen variant. */
export function listPrice(p: any, color: string, size: string): number {
    const src = findVariant(p, color, size) || p;
    const price = Number(src.price) || 0;
    const original = Number(src.originalPrice) || 0;
    return original > price ? original : price;
}

/**
 * The customer's default discount on one line: `d`% off the list price. Left alone when
 * the product's own offer is already as cheap or cheaper, so the discount never raises a price.
 */
export function customerPricing(l: Pick<Line, 'product' | 'color' | 'size'>, d: number): Pricing | null {
    const original = listPrice(l.product, l.color, l.size);
    const sale = Math.round(original * (1 - d / 100));
    if (sale >= unitPrice(l.product, l.color, l.size)) return null;
    return { original: String(original), sale: String(sale), by: 'customer' };
}

export const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s));
export const okMoney = (n: number) => Number.isFinite(n) && n >= 0;
export const pctOff = (original: number, sale: number) => (original > 0 ? Math.round(((original - sale) / original) * 100) : 0);
/** ৳ amounts, keeping paisa only when there are any. */
export const money = (n: number) => taka(n, Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2);

/** What a line costs right now: the typed prices when edited, otherwise the product's own. */
export function linePrices(l: Line) {
    if (!l.pricing) {
        return { original: listPrice(l.product, l.color, l.size), sale: unitPrice(l.product, l.color, l.size), edited: false, valid: true };
    }
    const original = toNum(l.pricing.original);
    const sale = toNum(l.pricing.sale);
    return { original, sale, edited: true, valid: okMoney(original) && okMoney(sale) };
}

export const cleanMoney = (s: string) => s.replace(/[^\d.]/g, '');

/* ─── Small helpers ─────────────────────────────────────────────────────── */

export const normalisePhone = (s: string) => s.replace(/[\s-]/g, '').replace(/^\+?88/, '');
export const validPhone = (s: string) => /^01[3-9]\d{8}$/.test(s);

export function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}

const MONEY_INPUT = 'h-9 w-full rounded-xl border bg-white pl-7 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]';

export function MoneyInput({ value, onChange, invalid, ariaLabel, placeholder, className }: {
    value: string; onChange: (v: string) => void; invalid?: boolean; ariaLabel?: string; placeholder?: string; className?: string;
}) {
    return (
        <div className={cx('relative', className)}>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">৳</span>
            <input
                inputMode="decimal"
                aria-label={ariaLabel}
                aria-invalid={invalid || undefined}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(cleanMoney(e.target.value))}
                className={cx(MONEY_INPUT, invalid ? 'border-red-300 focus:border-red-400' : 'border-gray-200 focus:border-[var(--color-primary)]')}
            />
        </div>
    );
}

export const SKU_BADGE = 'inline-flex items-center rounded bg-gray-100 px-1.5 py-px font-mono text-[11px] text-gray-600';

/* ─── Product picker ────────────────────────────────────────────────────── */

export const inStock = (p: any) => (Number(p.stock) || 0) > 0;

/**
 * Search box with a dropdown of every active product (opens on focus, no typing needed),
 * narrowed by name or SKU as staff type. ↑/↓ move, Enter adds, Esc closes.
 */
export function ProductPicker({ onPick }: { onPick: (p: any) => void }) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(-1);
    const boxRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const term = search.trim();
    const q = useDebounced(term, 250);

    // includeDrafts asks for the staff view (variants included — the public list drops them);
    // status: 'active' keeps drafts and hidden products out of the list.
    const { data: all, isLoading: loadingAll } = useGetProductsQuery({ status: 'active', includeDrafts: true, limit: 100, sort: 'name' });
    const { currentData: found, isFetching: searching } = useGetProductsQuery(
        { searchTerm: q, status: 'active', includeDrafts: true, limit: 50, sort: 'name' },
        { skip: !q },
    );

    const allList: any[] = all?.data || [];
    const results: any[] = (() => {
        if (!term) return allList;
        const t = term.toLowerCase();
        // Instant: what is already loaded, by name or SKU. Then whatever else the server found.
        const local = allList.filter((p) => String(p.name || '').toLowerCase().includes(t) || String(p.sku || '').toLowerCase().includes(t));
        const server: any[] = q === term ? found?.data || [] : [];
        const seen = new Set(local.map((p) => p._id));
        // A search that matches a category name can bring back non-active products for
        // staff; the order would refuse them, so they are not offered.
        const extra = server.filter((p) => !seen.has(p._id) && (!p.status || p.status === 'active'));
        return [...local, ...extra].slice(0, 50);
    })();

    const current = active >= 0 && active < results.length && inStock(results[active]) ? active : results.findIndex(inStock);

    // Keep the highlighted row in view while moving with the keyboard (not on hover).
    const keyMoved = useRef(false);
    useEffect(() => {
        if (!open || current < 0 || !keyMoved.current) return;
        keyMoved.current = false;
        listRef.current?.querySelector<HTMLElement>(`[data-idx="${current}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [open, current]);

    // Clicking anywhere outside closes the list.
    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const pick = (p: any) => {
        if (!inStock(p)) return;
        onPick(p);
        setSearch('');
        setActive(-1);
        setOpen(false);
    };

    const move = (dir: 1 | -1) => {
        for (let i = current + dir; i >= 0 && i < results.length; i += dir) {
            if (inStock(results[i])) { keyMoved.current = true; setActive(i); return; }
        }
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!open) { setOpen(true); return; }
            move(e.key === 'ArrowDown' ? 1 : -1);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (open && current >= 0) pick(results[current]);
        } else if (e.key === 'Escape') {
            if (open) { e.preventDefault(); setOpen(false); }
        }
    };

    const waiting = term ? searching && !results.length : loadingAll;

    return (
        <div ref={boxRef} className="relative">
            <LuSearch size={16} className="pointer-events-none absolute left-3.5 top-[18px] -translate-y-1/2 text-gray-400" />
            <input
                type="text"
                role="combobox"
                aria-expanded={open}
                aria-controls="product-picker-list"
                aria-autocomplete="list"
                aria-activedescendant={open && current >= 0 ? `product-picker-${current}` : undefined}
                autoComplete="off"
                value={search}
                placeholder="Search products by name or SKU…"
                onFocus={() => setOpen(true)}
                onClick={() => setOpen(true)}
                onChange={(e) => { setSearch(e.target.value); setActive(-1); setOpen(true); }}
                onKeyDown={onKeyDown}
                className="h-9 w-full rounded-full border border-transparent bg-gray-100 pl-10 pr-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[var(--color-primary-border)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]"
            />
            {open && (
                <div
                    ref={listRef}
                    id="product-picker-list"
                    role="listbox"
                    className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg"
                >
                    {waiting ? <p className="px-3 py-3 text-sm text-gray-500">{term ? 'Searching…' : 'Loading products…'}</p>
                        : !results.length ? (
                            <p className="px-3 py-3 text-sm text-gray-500">
                                {term ? <>No active product matches “{term}”.</> : 'No active products yet.'}
                            </p>
                        ) : results.map((p, i) => {
                            const sale = unitPrice(p, '', '');
                            const original = listPrice(p, '', '');
                            const options = (p.variants || []).length;
                            const ok = inStock(p);
                            return (
                                <button
                                    key={p._id}
                                    id={`product-picker-${i}`}
                                    data-idx={i}
                                    type="button"
                                    role="option"
                                    aria-selected={i === current}
                                    disabled={!ok}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseEnter={() => ok && setActive(i)}
                                    onClick={() => pick(p)}
                                    className={cx(
                                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50',
                                        i === current ? 'bg-[rgba(var(--color-primary-rgb),0.08)]' : 'hover:bg-gray-50',
                                    )}
                                >
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                        {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-full w-full object-cover" /> : <LuPackage className="text-gray-300" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm text-gray-900">{p.name}</p>
                                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                                            {p.sku ? <span className={SKU_BADGE}>{p.sku}</span> : <span>No SKU</span>}
                                            <span className={ok ? undefined : 'text-red-500'}>{ok ? `${p.stock} in stock` : 'Out of stock'}</span>
                                            {options > 0 && <span>{options} option{options === 1 ? '' : 's'}</span>}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-medium text-gray-900">{money(sale)}</p>
                                        {original > sale && <p className="text-xs text-gray-400 line-through">{money(original)}</p>}
                                    </div>
                                </button>
                            );
                        })}
                    {!term && allList.length >= 100 && (
                        <p className="px-3 pb-2 pt-1 text-xs text-gray-400">Showing the first 100 — type a name or SKU to find the rest.</p>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── One line of the order ─────────────────────────────────────────────── */

/**
 * A single product line: its options, its two prices, how many, and what that comes to.
 * The new-order page and the order page's "Edit order" both render this, so a line looks
 * and behaves the same whether it is being taken down or corrected afterwards.
 *
 * `priced` is what linePrices() worked out for this line — passed in rather than computed
 * here, because the page above already needs it for the order's own totals.
 */
export function OrderLineRow({ line, priced, editedLabel = 'Edited', onPatch, onRemove, onPickOption, onEditPrice }: {
    line: Line;
    priced: { original: number; sale: number; edited: boolean; valid: boolean };
    editedLabel?: string;
    onPatch: (patch: Partial<Line>) => void;
    onRemove: () => void;
    onPickOption: (patch: { color?: string; size?: string }) => void;
    onEditPrice: (field: 'original' | 'sale', value: string) => void;
}) {
    const { original, sale, edited, valid } = priced;
    const p = line.product;
    const vs: any[] = p.variants || [];
    const colors = uniq(vs.map((v) => v.color));
    const sizes = uniq(vs.filter((v) => !line.color || same(v.color, line.color)).map((v) => v.size));
    // A line can outlive its product: an order being edited may hold one that has since
    // been deleted or hidden, and then all that is known is what the order itself saved.
    const stockKnown = Number.isFinite(Number(p.stock));
    const over = stockKnown && line.qty > Number(p.stock);
    const off = valid ? pctOff(original, sale) : 0;
    const origText = line.pricing ? line.pricing.original : String(original);
    const saleText = line.pricing ? line.pricing.sale : String(sale);
    const origBad = !!line.pricing && !okMoney(toNum(line.pricing.original));
    const saleBad = !!line.pricing && !okMoney(toNum(line.pricing.sale));

    return (
        <li className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                    {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-full w-full object-cover" /> : <LuPackage className="text-gray-300" />}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <p className="line-clamp-1 text-sm font-medium text-gray-900">{p.name}</p>
                        {p.sku && <span className={SKU_BADGE}>{p.sku}</span>}
                        {edited && <Badge tone="blue">{editedLabel}</Badge>}
                    </div>
                    <p className={cx('mt-0.5 text-xs', over ? 'text-red-600' : 'text-gray-400')}>
                        {!stockKnown ? 'This product is no longer in the catalogue'
                            : over ? `Only ${p.stock} in stock` : `${p.stock} in stock`}
                    </p>
                    {(colors.length > 0 || sizes.length > 0) && (
                        <div className="mt-1.5 flex flex-wrap gap-2">
                            {colors.length > 0 && (
                                <select aria-label="Colour" value={line.color} onChange={(e) => onPickOption({ color: e.target.value, size: '' })}
                                    className={cx('h-7 rounded-lg border bg-white px-2 text-xs outline-none', !line.color ? 'border-amber-300' : 'border-gray-200')}>
                                    <option value="">Colour…</option>
                                    {colors.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            )}
                            {sizes.length > 0 && (
                                <select aria-label="Size" value={line.size} onChange={(e) => onPickOption({ size: e.target.value })}
                                    className={cx('h-7 rounded-lg border bg-white px-2 text-xs outline-none', !line.size ? 'border-amber-300' : 'border-gray-200')}>
                                    <option value="">Size…</option>
                                    {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            )}
                        </div>
                    )}
                </div>
                <button type="button" aria-label="Remove" onClick={onRemove}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600"><LuTrash2 size={15} /></button>
            </div>

            <div className="mt-3 grid grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:pl-14">
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500">Original price</span>
                    <MoneyInput ariaLabel={`Original price of ${p.name}`} value={origText} invalid={origBad}
                        onChange={(v) => onEditPrice('original', v)} />
                </label>
                <label className="block">
                    <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        Sale price
                        {off > 0 && <Badge tone="green" className="px-1.5 py-0 text-[11px]">{off}% off</Badge>}
                    </span>
                    <MoneyInput ariaLabel={`Sale price of ${p.name}`} value={saleText} invalid={saleBad}
                        onChange={(v) => onEditPrice('sale', v)} />
                </label>
                <div>
                    <span className="mb-1 block text-xs font-medium text-gray-500">Qty</span>
                    <div className="inline-flex h-9 items-center rounded-full border border-gray-200">
                        <button type="button" aria-label="Decrease" onClick={() => onPatch({ qty: Math.max(1, line.qty - 1) })}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"><LuMinus size={14} /></button>
                        <input aria-label="Quantity" inputMode="numeric" value={line.qty}
                            onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); onPatch({ qty: Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 1 }); }}
                            className="w-10 bg-transparent text-center text-sm outline-none" />
                        <button type="button" aria-label="Increase" onClick={() => onPatch({ qty: Math.min(10000, line.qty + 1) })}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"><LuPlus size={14} /></button>
                    </div>
                </div>
                <div className="text-right sm:min-w-[96px]">
                    <span className="mb-1 block text-xs font-medium text-gray-500">Total</span>
                    <span className="inline-flex h-9 items-center text-sm font-semibold text-gray-900">{valid ? money(sale * line.qty) : '—'}</span>
                </div>
            </div>

            {(edited || (valid && sale > original)) && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs sm:pl-14">
                    <span className={!valid ? 'text-red-600' : 'text-amber-700'}>
                        {!valid ? 'Prices must be numbers of 0 or more.'
                            : sale > original ? 'Sale price is above the original price.' : ''}
                    </span>
                    {edited && (
                        <button type="button" onClick={() => onPatch({ pricing: null })}
                            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 hover:underline">
                            <LuRotateCcw size={12} /> Reset to the product&apos;s price
                        </button>
                    )}
                </div>
            )}
        </li>
    );
}
