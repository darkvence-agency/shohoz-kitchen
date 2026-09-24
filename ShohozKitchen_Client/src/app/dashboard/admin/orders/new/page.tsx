/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { LuMinus, LuPlus, LuTrash2, LuPackage, LuUserCheck, LuUserPlus, LuSearch, LuRotateCcw } from 'react-icons/lu';
import { useCreateAdminOrderMutation, type AdminOrderInput, type OrderPaymentMethod } from '@/redux/api/orderApi';
import { useGetProductsQuery } from '@/redux/api/productApi';
import { useGetAdminUsersQuery } from '@/redux/api/userApi';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';
import { useValidateCouponMutation } from '@/redux/api/couponApi';
import {
    useGetDeliveryZonesQuery, useGetShippingQuoteQuery, useGetShippingSettingsQuery, type DeliveryArea,
} from '@/redux/api/shippingApi';
import {
    PageHeader, Btn, Card, Field, INPUT, TEXTAREA, Badge, Segmented, taka, cx,
} from '@/components/admin/ui';

/* ─── Types ─────────────────────────────────────────────────────────────── */

/**
 * Prices typed for one line of THIS order. `null` on the line means "the product's own
 * price" — nothing is sent and the server resolves it. `by` tells the customer's default
 * discount (re-applied when the customer changes) from staff's own edits (kept).
 */
type Pricing = { original: string; sale: string; by: 'customer' | 'admin' };
type Line = { key: string; product: any; color: string; size: string; qty: number; pricing: Pricing | null };
type ShipMode = 'auto' | 'free' | 'custom';
type OrderStatus = NonNullable<AdminOrderInput['status']>;
type PayStatus = NonNullable<AdminOrderInput['paymentStatus']>;

const PAYMENT_METHODS: ReadonlyArray<{ id: OrderPaymentMethod; label: string; color: string }> = [
    { id: 'cod', label: 'Cash on delivery', color: '#16a34a' },
    { id: 'bkash', label: 'bKash', color: '#E2136E' },
    { id: 'nagad', label: 'Nagad', color: '#F47920' },
    { id: 'rocket', label: 'Rocket', color: '#8C3EC0' },
    { id: 'bank', label: 'Bank transfer', color: '#0F766E' },
];

const ORDER_STATUSES: ReadonlyArray<{ value: OrderStatus; label: string }> = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
];

/* ─── Pricing helpers ───────────────────────────────────────────────────── */

const same = (a: any, b: any) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean)));

function findVariant(p: any, color: string, size: string): any | undefined {
    if (!color && !size) return undefined;
    return (p.variants || []).find((vv: any) => (!color || same(vv.color, color)) && (!size || same(vv.size, size)));
}

/**
 * The unit price the server charges when staff leave the price alone — mirrors
 * resolveEffectivePrice in order.service. A variant's `price` is already its sale price
 * (its `discount` is only the % off its originalPrice), so it is not discounted again.
 */
function unitPrice(p: any, color: string, size: string): number {
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
function listPrice(p: any, color: string, size: string): number {
    const src = findVariant(p, color, size) || p;
    const price = Number(src.price) || 0;
    const original = Number(src.originalPrice) || 0;
    return original > price ? original : price;
}

/**
 * The customer's default discount on one line: `d`% off the list price. Left alone when
 * the product's own offer is already as cheap or cheaper, so the discount never raises a price.
 */
function customerPricing(l: Pick<Line, 'product' | 'color' | 'size'>, d: number): Pricing | null {
    const original = listPrice(l.product, l.color, l.size);
    const sale = Math.round(original * (1 - d / 100));
    if (sale >= unitPrice(l.product, l.color, l.size)) return null;
    return { original: String(original), sale: String(sale), by: 'customer' };
}

const toNum = (s: string) => (s.trim() === '' ? NaN : Number(s));
const okMoney = (n: number) => Number.isFinite(n) && n >= 0;
const pctOff = (original: number, sale: number) => (original > 0 ? Math.round(((original - sale) / original) * 100) : 0);
/** ৳ amounts, keeping paisa only when there are any. */
const money = (n: number) => taka(n, Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2);

/** What a line costs right now: the typed prices when edited, otherwise the product's own. */
function linePrices(l: Line) {
    if (!l.pricing) {
        return { original: listPrice(l.product, l.color, l.size), sale: unitPrice(l.product, l.color, l.size), edited: false, valid: true };
    }
    const original = toNum(l.pricing.original);
    const sale = toNum(l.pricing.sale);
    return { original, sale, edited: true, valid: okMoney(original) && okMoney(sale) };
}

const cleanMoney = (s: string) => s.replace(/[^\d.]/g, '');

/* ─── Small helpers ─────────────────────────────────────────────────────── */

const normalisePhone = (s: string) => s.replace(/[\s-]/g, '').replace(/^\+?88/, '');
const validPhone = (s: string) => /^01[3-9]\d{8}$/.test(s);

function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}

const MONEY_INPUT = 'h-9 w-full rounded-xl border bg-white pl-7 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]';

function MoneyInput({ value, onChange, invalid, ariaLabel, placeholder, className }: {
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

const SKU_BADGE = 'inline-flex items-center rounded bg-gray-100 px-1.5 py-px font-mono text-[11px] text-gray-600';

/* ─── Product picker ────────────────────────────────────────────────────── */

const inStock = (p: any) => (Number(p.stock) || 0) > 0;

/**
 * Search box with a dropdown of every active product (opens on focus, no typing needed),
 * narrowed by name or SKU as staff type. ↑/↓ move, Enter adds, Esc closes.
 */
function ProductPicker({ onPick }: { onPick: (p: any) => void }) {
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

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function NewOrderPage() {
    const router = useRouter();
    const [createOrder, { isLoading: isCreating }] = useCreateAdminOrderMutation();

    /* ─── Customer ─── */
    const [cust, setCust] = useState({ phone: '', fullName: '', email: '', address: '', area: '', city: '' });
    const phone = normalisePhone(cust.phone);
    const phoneOk = validPhone(phone);
    const { data: lookup, isFetching: lookingUp } = useGetAdminUsersQuery(
        { searchTerm: phone, role: 'user', limit: 5 },
        { skip: !phoneOk },
    );
    const existing = phoneOk ? (lookup?.data || []).find((u: any) => normalisePhone(u.phone || '') === phone) : undefined;
    // The customer's default discount (Customers → edit), applied to every line below.
    const custDiscount = existing && Number(existing.defaultDiscount) > 0 ? Math.min(100, Number(existing.defaultDiscount)) : 0;

    // Fill empty fields from the customer on file — never overwrite what staff typed.
    useEffect(() => {
        if (!existing) return;
        const addr = existing.shippingAddresses?.find((a: any) => a.isDefault) || existing.shippingAddresses?.[0];
        setCust((c) => ({
            ...c,
            fullName: c.fullName || `${existing.firstName || ''} ${existing.lastName || ''}`.trim(),
            email: c.email || (existing.email?.endsWith('@guest.shohozkitchen.com') ? '' : existing.email || ''),
            address: c.address || addr?.address || '',
            area: c.area || addr?.area || '',
            city: c.city || addr?.city || '',
        }));
    }, [existing?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ─── Items ─── */
    const [lines, setLines] = useState<Line[]>([]);

    // A customer with a default discount gets it on every line staff have not priced
    // themselves; switching to a customer without one takes it off again.
    useEffect(() => {
        setLines((ls) => {
            let changed = false;
            const next = ls.map((l) => {
                if (l.pricing?.by === 'admin') return l;
                const pricing = custDiscount ? customerPricing(l, custDiscount) : null;
                if (!pricing && !l.pricing) return l;
                changed = true;
                return { ...l, pricing };
            });
            return changed ? next : ls;
        });
    }, [custDiscount]);

    const addProduct = (p: any) => {
        setLines((ls) => {
            const hasVariants = (p.variants || []).length > 0;
            const i = hasVariants ? -1 : ls.findIndex((l) => l.product._id === p._id);
            if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: Math.min(10000, l.qty + 1) } : l));
            const line: Line = { key: `${p._id}-${Date.now()}`, product: p, color: '', size: '', qty: 1, pricing: null };
            return [...ls, { ...line, pricing: custDiscount ? customerPricing(line, custDiscount) : null }];
        });
    };
    const patchLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

    // A new colour / size moves a line that follows the product (or the customer discount)
    // to that option's price; prices staff typed themselves stay as they are.
    const pickOption = (l: Line, patch: { color?: string; size?: string }) => {
        const next = { ...l, ...patch };
        if (l.pricing?.by === 'customer') next.pricing = customerPricing(next, custDiscount);
        patchLine(l.key, next);
    };

    // Typing either price fixes both for this line (the untouched one keeps its current value).
    const editPrice = (l: Line, field: 'original' | 'sale', value: string) => {
        const base = l.pricing ?? {
            original: String(listPrice(l.product, l.color, l.size)),
            sale: String(unitPrice(l.product, l.color, l.size)),
        };
        patchLine(l.key, { pricing: { ...base, [field]: value, by: 'admin' } });
    };

    const priced = lines.map((l) => ({ l, ...linePrices(l) }));
    const subtotal = priced.reduce((s, x) => s + (x.valid ? x.sale * x.l.qty : 0), 0);
    const savings = priced.reduce((s, x) => s + (x.valid ? Math.max(0, x.original - x.sale) * x.l.qty : 0), 0);
    const units = lines.reduce((n, l) => n + l.qty, 0);

    /* ─── Delivery ─── */
    const { data: zones = [] } = useGetDeliveryZonesQuery();
    const { data: shipSettings } = useGetShippingSettingsQuery();
    const insideRate = shipSettings?.defaultInsideDhakaRate ?? 70;
    const outsideRate = shipSettings?.defaultOutsideDhakaRate ?? 130;
    const [zoneId, setZoneId] = useState('');
    const [pickedArea, setPickedArea] = useState<DeliveryArea | ''>('');
    const [areaTouched, setAreaTouched] = useState(false);
    const city = useDebounced(cust.city.trim(), 400);
    // A city that says "Dhaka" pre-picks Inside Dhaka until staff choose (as at checkout).
    const suggestedArea: DeliveryArea | '' = !areaTouched && !zoneId && /dhaka/i.test(city) ? 'inside_dhaka' : '';
    const area: DeliveryArea | '' = pickedArea || suggestedArea;
    const quoteZone = zoneId && zoneId !== 'other' ? zoneId : undefined;

    const pickArea = (a: DeliveryArea) => { setPickedArea(a); setAreaTouched(true); setZoneId(''); };
    const pickZone = (v: string) => {
        setZoneId(v);
        if (v) { setPickedArea(''); setAreaTouched(true); }
        const z = zones.find((zz) => zz._id === v);
        if (z) setCust((c) => ({ ...c, city: z.name }));
    };

    const { data: quote, isFetching: quoting } = useGetShippingQuoteQuery(
        { city: city || undefined, subtotal, zoneId: quoteZone, area: area || undefined },
        { skip: subtotal <= 0 },
    );

    const [shipMode, setShipMode] = useState<ShipMode>('auto');
    const [customShip, setCustomShip] = useState('');
    const customShipNum = toNum(customShip);
    const customShipOk = okMoney(customShipNum);

    /* ─── Coupon (previewed with the prices above; the server decides on create) ─── */
    const [couponCode, setCouponCode] = useState('');
    const code = couponCode.trim().toUpperCase();
    const [validateCoupon, { isLoading: checkingCoupon }] = useValidateCouponMutation();
    const [couponCheck, setCouponCheck] = useState<{ code: string; basis: string; discount: number; freeShipping: boolean } | null>(null);
    const couponItems = priced.map((x) => ({ product: String(x.l.product._id), amount: x.valid ? x.sale * x.l.qty : 0 }));
    const couponBasis = JSON.stringify(couponItems);
    // A preview only counts while the code and the priced lines are what was checked.
    const coupon = couponCheck && couponCheck.code === code && couponCheck.basis === couponBasis ? couponCheck : null;

    const checkCoupon = async () => {
        if (!code) return;
        if (subtotal <= 0) { toast.error('Add products before checking a coupon'); return; }
        try {
            const res: any = await validateCoupon({ code, orderAmount: subtotal, items: couponItems }).unwrap();
            const d = res?.data ?? res;
            setCouponCheck({ code, basis: couponBasis, discount: Number(d?.discount) || 0, freeShipping: Boolean(d?.freeShipping) });
            toast.success(`Coupon ${code} is valid`);
        } catch (err: any) {
            setCouponCheck(null);
            toast.error(err?.data?.message || 'Invalid or expired coupon code');
        }
    };
    const couponDiscount = coupon ? Math.min(coupon.discount, subtotal) : 0;

    /* ─── Delivery charge shown ─── */
    const areaRate = area === 'inside_dhaka' ? insideRate : area === 'outside_dhaka' ? outsideRate : 0;
    const autoDelivery = subtotal <= 0 || coupon?.freeShipping ? 0 : quote?.shippingCost ?? areaRate;
    const delivery = shipMode === 'free' ? 0 : shipMode === 'custom' ? (customShipOk ? customShipNum : 0) : autoDelivery;
    const total = Math.max(0, subtotal - couponDiscount) + delivery;

    /* ─── Payment ─── */
    const { data: siteRes } = useGetSiteContentQuery({});
    const paymentCfg = siteRes?.data?.payment || {};
    const [pay, setPay] = useState<{ method: OrderPaymentMethod; senderNumber: string; transactionId: string; paymentTime: string }>(
        { method: 'cod', senderNumber: '', transactionId: '', paymentTime: '' },
    );
    const [paymentStatus, setPaymentStatus] = useState<PayStatus>('pending');
    const methodMeta = PAYMENT_METHODS.find((m) => m.id === pay.method) || PAYMENT_METHODS[0];
    // The shop's own account for the chosen method, so staff can check the customer paid the right one.
    const payTo: { account: string; detail: string } | null = (() => {
        if (pay.method === 'cod') return null;
        if (pay.method === 'bank') {
            const b = paymentCfg.bank || {};
            const account = String(b.accountNumber || '').trim();
            return account ? { account, detail: [b.bankName, b.accountName].filter(Boolean).join(' · ') } : null;
        }
        const m = paymentCfg[pay.method] || {};
        const account = String(m.number || '').trim();
        return account ? { account, detail: m.accountType || 'Personal' } : null;
    })();

    /* ─── Order ─── */
    const [status, setStatus] = useState<OrderStatus>('pending');
    const [note, setNote] = useState('');

    const missingVariant = (l: Line) => {
        const vs = l.product.variants || [];
        if (!vs.length) return false;
        return (uniq(vs.map((v: any) => v.color)).length > 0 && !l.color) || (uniq(vs.map((v: any) => v.size)).length > 0 && !l.size);
    };

    const submit = async () => {
        if (!phoneOk) { toast.error('Enter a valid mobile number (01XXXXXXXXX)'); return; }
        if (!cust.fullName.trim()) { toast.error('Customer name is required'); return; }
        if (!cust.address.trim()) { toast.error('Delivery address is required'); return; }
        if (!lines.length) { toast.error('Add at least one product'); return; }
        const needsVariant = lines.find(missingVariant);
        if (needsVariant) { toast.error(`Choose the colour/size for “${needsVariant.product.name}”`); return; }
        const badPrice = priced.find((x) => !x.valid);
        if (badPrice) { toast.error(`Enter the prices for “${badPrice.l.product.name}” as numbers of 0 or more`); return; }
        if (shipMode === 'custom' && !customShipOk) { toast.error('Enter the delivery charge as a number of 0 or more'); return; }

        const paidAt = pay.paymentTime ? new Date(pay.paymentTime) : null;
        const paymentTime = paidAt && !isNaN(paidAt.getTime()) ? paidAt.toISOString() : undefined;
        const senderNumber = pay.senderNumber.trim() || undefined;
        const transactionId = pay.transactionId.trim() || undefined;

        const payload: AdminOrderInput = {
            items: priced.map(({ l, edited, original, sale }) => ({
                product: l.product._id,
                quantity: l.qty,
                ...(l.color ? { color: l.color } : {}),
                ...(l.size ? { size: l.size } : {}),
                // Only lines staff (or the customer discount) priced carry prices; the server
                // resolves the rest from the product.
                ...(edited ? { unitPrice: sale, originalPrice: original } : {}),
            })),
            shippingAddress: {
                fullName: cust.fullName.trim(),
                phone,
                email: cust.email.trim() || undefined,
                address: cust.address.trim(),
                area: cust.area.trim() || undefined,
                city: cust.city.trim() || undefined,
            },
            paymentMethod: pay.method,
            ...(pay.method !== 'cod' && (senderNumber || transactionId || paymentTime)
                ? { paymentDetails: { senderNumber, transactionId, paymentTime } }
                : {}),
            paymentStatus,
            status,
            ...(quoteZone ? { zoneId: quoteZone } : area ? { deliveryArea: area } : {}),
            shipping: shipMode === 'custom' ? { mode: 'custom', amount: customShipNum } : { mode: shipMode },
            couponCode: code || undefined,
            note: note.trim() || undefined,
        };

        try {
            const res = await createOrder(payload).unwrap();
            toast.success(`Order ${res?.data?.orderId || ''} created`);
            router.push(res?.data?._id ? `/dashboard/admin/orders/${res.data._id}` : '/dashboard/admin/orders');
        } catch (err: any) {
            toast.error(err?.data?.errorMessages?.[0]?.message || err?.data?.message || 'Could not create the order');
        }
    };

    const deliveryLabel = subtotal === 0 ? '—'
        : shipMode === 'free' ? 'Free'
            : shipMode === 'custom' ? (customShipOk ? money(customShipNum) : '—')
                : quoting ? '…' : autoDelivery === 0 ? 'Free' : money(autoDelivery);

    return (
        <div>
            <PageHeader
                back={{ href: '/dashboard/admin/orders', label: 'Orders' }}
                title="New order"
                subtitle="Take an order by phone or for a walk-in customer."
            />

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-6">
                    {/* Customer */}
                    <Card title="Customer" description="Search by phone — an existing customer is picked up automatically.">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Phone" required
                                error={cust.phone && !phoneOk ? 'Enter an 11-digit number starting with 01' : undefined}>
                                <input className={INPUT} inputMode="tel" placeholder="01XXXXXXXXX" value={cust.phone} autoFocus
                                    onChange={(e) => setCust({ ...cust, phone: e.target.value })} />
                            </Field>
                            <Field label="Full name" required>
                                <input className={INPUT} value={cust.fullName} onChange={(e) => setCust({ ...cust, fullName: e.target.value })} />
                            </Field>
                        </div>

                        {phoneOk && !lookingUp && (
                            <div className={cx('mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm',
                                existing ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-50 text-gray-600')}>
                                {existing ? <LuUserCheck size={16} /> : <LuUserPlus size={16} />}
                                {existing ? (
                                    <span>
                                        Existing customer · {existing.orderCount || 0} order{existing.orderCount === 1 ? '' : 's'}
                                        {existing.status === 'blocked' && <Badge tone="red" className="ml-2">Blocked</Badge>}
                                        {custDiscount > 0 && <> · {custDiscount}% default discount</>}
                                    </span>
                                ) : <span>New customer — they are added when you create the order.</span>}
                            </div>
                        )}

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <Field label="Address" required className="sm:col-span-2">
                                <textarea className={TEXTAREA} rows={2} placeholder="House, road, area" value={cust.address}
                                    onChange={(e) => setCust({ ...cust, address: e.target.value })} />
                            </Field>
                            <Field label="City / district">
                                <input className={INPUT} placeholder="e.g. Dhaka" value={cust.city}
                                    onChange={(e) => setCust({ ...cust, city: e.target.value })} />
                            </Field>
                            <Field label="Area / thana">
                                <input className={INPUT} value={cust.area} onChange={(e) => setCust({ ...cust, area: e.target.value })} />
                            </Field>
                            <Field label="Email" hint="Optional.">
                                <input className={INPUT} type="email" value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} />
                            </Field>
                        </div>
                    </Card>

                    {/* Items */}
                    <Card title="Products" description="Only active products with stock can be ordered. Prices changed here apply to this order only.">
                        <ProductPicker onPick={addProduct} />

                        {custDiscount > 0 && (
                            <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                                {custDiscount}% customer discount applied — edit any line to change it.
                            </p>
                        )}

                        {lines.length === 0 ? (
                            <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                                <LuPackage size={26} className="mx-auto mb-2 text-gray-300" />
                                Click the search box to pick a product.
                            </div>
                        ) : (
                            <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200">
                                {priced.map(({ l, original, sale, edited, valid }) => {
                                    const p = l.product;
                                    const vs: any[] = p.variants || [];
                                    const colors = uniq(vs.map((v) => v.color));
                                    const sizes = uniq(vs.filter((v) => !l.color || same(v.color, l.color)).map((v) => v.size));
                                    const over = l.qty > (p.stock || 0);
                                    const off = valid ? pctOff(original, sale) : 0;
                                    const origText = l.pricing ? l.pricing.original : String(original);
                                    const saleText = l.pricing ? l.pricing.sale : String(sale);
                                    const origBad = !!l.pricing && !okMoney(toNum(l.pricing.original));
                                    const saleBad = !!l.pricing && !okMoney(toNum(l.pricing.sale));
                                    return (
                                        <li key={l.key} className="p-3 sm:p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                                    {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-full w-full object-cover" /> : <LuPackage className="text-gray-300" />}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <p className="line-clamp-1 text-sm font-medium text-gray-900">{p.name}</p>
                                                        {p.sku && <span className={SKU_BADGE}>{p.sku}</span>}
                                                        {edited && (
                                                            <Badge tone="blue">{l.pricing?.by === 'customer' ? `Edited · ${custDiscount}% customer` : 'Edited'}</Badge>
                                                        )}
                                                    </div>
                                                    <p className={cx('mt-0.5 text-xs', over ? 'text-red-600' : 'text-gray-400')}>
                                                        {over ? `Only ${p.stock} in stock` : `${p.stock} in stock`}
                                                    </p>
                                                    {(colors.length > 0 || sizes.length > 0) && (
                                                        <div className="mt-1.5 flex flex-wrap gap-2">
                                                            {colors.length > 0 && (
                                                                <select aria-label="Colour" value={l.color} onChange={(e) => pickOption(l, { color: e.target.value, size: '' })}
                                                                    className={cx('h-7 rounded-lg border bg-white px-2 text-xs outline-none', !l.color ? 'border-amber-300' : 'border-gray-200')}>
                                                                    <option value="">Colour…</option>
                                                                    {colors.map((c) => <option key={c} value={c}>{c}</option>)}
                                                                </select>
                                                            )}
                                                            {sizes.length > 0 && (
                                                                <select aria-label="Size" value={l.size} onChange={(e) => pickOption(l, { size: e.target.value })}
                                                                    className={cx('h-7 rounded-lg border bg-white px-2 text-xs outline-none', !l.size ? 'border-amber-300' : 'border-gray-200')}>
                                                                    <option value="">Size…</option>
                                                                    {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <button type="button" aria-label="Remove" onClick={() => removeLine(l.key)}
                                                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600"><LuTrash2 size={15} /></button>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] sm:pl-14">
                                                <label className="block">
                                                    <span className="mb-1 block text-xs font-medium text-gray-500">Original price</span>
                                                    <MoneyInput ariaLabel={`Original price of ${p.name}`} value={origText} invalid={origBad}
                                                        onChange={(v) => editPrice(l, 'original', v)} />
                                                </label>
                                                <label className="block">
                                                    <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-500">
                                                        Sale price
                                                        {off > 0 && <Badge tone="green" className="px-1.5 py-0 text-[11px]">{off}% off</Badge>}
                                                    </span>
                                                    <MoneyInput ariaLabel={`Sale price of ${p.name}`} value={saleText} invalid={saleBad}
                                                        onChange={(v) => editPrice(l, 'sale', v)} />
                                                </label>
                                                <div>
                                                    <span className="mb-1 block text-xs font-medium text-gray-500">Qty</span>
                                                    <div className="inline-flex h-9 items-center rounded-full border border-gray-200">
                                                        <button type="button" aria-label="Decrease" onClick={() => patchLine(l.key, { qty: Math.max(1, l.qty - 1) })}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"><LuMinus size={14} /></button>
                                                        <input aria-label="Quantity" inputMode="numeric" value={l.qty}
                                                            onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); patchLine(l.key, { qty: Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 1 }); }}
                                                            className="w-10 bg-transparent text-center text-sm outline-none" />
                                                        <button type="button" aria-label="Increase" onClick={() => patchLine(l.key, { qty: Math.min(10000, l.qty + 1) })}
                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"><LuPlus size={14} /></button>
                                                    </div>
                                                </div>
                                                <div className="text-right sm:min-w-[96px]">
                                                    <span className="mb-1 block text-xs font-medium text-gray-500">Total</span>
                                                    <span className="inline-flex h-9 items-center text-sm font-semibold text-gray-900">{valid ? money(sale * l.qty) : '—'}</span>
                                                </div>
                                            </div>

                                            {(edited || (valid && sale > original)) && (
                                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs sm:pl-14">
                                                    <span className={!valid ? 'text-red-600' : 'text-amber-700'}>
                                                        {!valid ? 'Prices must be numbers of 0 or more.'
                                                            : sale > original ? 'Sale price is above the original price.' : ''}
                                                    </span>
                                                    {edited && (
                                                        <button type="button" onClick={() => patchLine(l.key, { pricing: null })}
                                                            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-900 hover:underline">
                                                            <LuRotateCcw size={12} /> Reset to the product&apos;s price
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Card>

                    {/* Delivery */}
                    <Card title="Delivery" description="The charge follows the delivery area. Change it below for this order only.">
                        <span className="mb-1.5 block text-sm font-medium text-gray-700">Delivery area</span>
                        <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Delivery area">
                            {([
                                { value: 'inside_dhaka', label: 'Inside Dhaka', rate: insideRate },
                                { value: 'outside_dhaka', label: 'Outside Dhaka', rate: outsideRate },
                            ] as const).map((opt) => {
                                const on = area === opt.value;
                                return (
                                    <button key={opt.value} type="button" role="radio" aria-checked={on} onClick={() => pickArea(opt.value)}
                                        className={cx('flex items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-left transition',
                                            on ? 'border-[var(--color-primary)] bg-[rgba(var(--color-primary-rgb),0.06)]' : 'border-gray-200 hover:border-gray-300')}>
                                        <span className="flex items-center gap-2">
                                            <span className={cx('inline-block h-4 w-4 rounded-full border-2',
                                                on ? 'border-[var(--color-primary)] bg-[var(--color-primary)] shadow-[inset_0_0_0_2px_#fff]' : 'border-gray-300')} />
                                            <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                                        </span>
                                        <span className="text-sm font-semibold text-gray-900">{taka(opt.rate)}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {zones.length > 0 && (
                            <Field label="Or a delivery zone" hint="Picking a zone uses its rate instead of the area above." className="mt-4">
                                <select className={cx(INPUT, 'cursor-pointer')} value={zoneId} onChange={(e) => pickZone(e.target.value)}>
                                    <option value="">None</option>
                                    {zones.map((z) => <option key={z._id} value={z._id}>{z.name} — {taka(z.price)}</option>)}
                                    <option value="other">Other (by city)</option>
                                </select>
                            </Field>
                        )}

                        <div className="mt-5">
                            <span className="mb-1.5 block text-sm font-medium text-gray-700">Delivery charge</span>
                            <div className="flex flex-wrap items-center gap-3">
                                <Segmented<ShipMode>
                                    value={shipMode}
                                    onChange={setShipMode}
                                    options={[{ value: 'auto', label: 'Auto' }, { value: 'free', label: 'Free' }, { value: 'custom', label: 'Custom' }]}
                                />
                                {shipMode === 'custom' && (
                                    <MoneyInput ariaLabel="Delivery charge" placeholder="0" value={customShip} onChange={setCustomShip}
                                        invalid={customShip !== '' && !customShipOk} className="w-32" />
                                )}
                            </div>
                            <p className="mt-1.5 text-xs text-gray-400">
                                {shipMode === 'auto'
                                    ? (subtotal <= 0 ? 'Worked out from the area once products are added.'
                                        : coupon?.freeShipping ? 'Free — the coupon waives delivery.'
                                            : quoting ? 'Working out the charge…'
                                                : `${autoDelivery === 0 ? 'Free' : money(autoDelivery)} — the normal charge for this order.`)
                                    : shipMode === 'free' ? 'No delivery charge on this order.'
                                        : 'This amount is charged instead of the normal rate.'}
                            </p>
                        </div>
                    </Card>

                    {/* Payment */}
                    <Card title="Payment">
                        <span className="mb-1.5 block text-sm font-medium text-gray-700">Method</span>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment method">
                            {PAYMENT_METHODS.map((m) => {
                                const on = pay.method === m.id;
                                return (
                                    <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => setPay({ ...pay, method: m.id })}
                                        className={cx('inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm transition',
                                            on ? 'border-[var(--color-primary)] bg-[rgba(var(--color-primary-rgb),0.06)] font-medium text-gray-900' : 'border-gray-200 text-gray-700 hover:border-gray-300')}>
                                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>

                        {pay.method !== 'cod' && (
                            <>
                                <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm">
                                    {payTo ? (
                                        <p className="text-gray-600">
                                            Paid to our {methodMeta.label}{' '}
                                            <span className="font-semibold tracking-wide text-gray-900">{payTo.account}</span>
                                            {payTo.detail && <span className="text-gray-400"> · {payTo.detail}</span>}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-gray-400">{methodMeta.label} is not set up in Settings — you can still record the payment.</p>
                                    )}
                                </div>
                                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                    <Field label={pay.method === 'bank' ? 'Paid from' : 'Sender number'}>
                                        <input className={INPUT} inputMode={pay.method === 'bank' ? undefined : 'tel'} value={pay.senderNumber}
                                            placeholder={pay.method === 'bank' ? 'Bank & account' : '01XXXXXXXXX'}
                                            onChange={(e) => setPay({ ...pay, senderNumber: e.target.value })} />
                                    </Field>
                                    <Field label="Transaction ID">
                                        <input className={INPUT} value={pay.transactionId} onChange={(e) => setPay({ ...pay, transactionId: e.target.value })} />
                                    </Field>
                                    <Field label="Payment time">
                                        <input className={INPUT} type="datetime-local" value={pay.paymentTime}
                                            onChange={(e) => setPay({ ...pay, paymentTime: e.target.value })} />
                                    </Field>
                                </div>
                            </>
                        )}

                        <div className="mt-5">
                            <span className="mb-1.5 block text-sm font-medium text-gray-700">Payment status</span>
                            <Segmented<PayStatus>
                                value={paymentStatus}
                                onChange={setPaymentStatus}
                                options={[{ value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }]}
                            />
                        </div>
                    </Card>

                    {/* Order */}
                    <Card title="Order">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Order status" hint="Where the order starts.">
                                <select className={cx(INPUT, 'cursor-pointer')} value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)}>
                                    {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </Field>
                            <Field label="Coupon code" hint="Applied only if it is valid for this customer.">
                                <div className="flex items-center gap-2">
                                    <input className={cx(INPUT, 'uppercase')} value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); checkCoupon(); } }} />
                                    <Btn onClick={checkCoupon} disabled={!code || checkingCoupon} className="shrink-0">
                                        {checkingCoupon ? 'Checking…' : 'Check'}
                                    </Btn>
                                </div>
                            </Field>
                            <Field label="Order note" hint="Printed on the order, e.g. delivery instructions." className="sm:col-span-2">
                                <textarea className={TEXTAREA} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                            </Field>
                        </div>
                    </Card>
                </div>

                {/* Summary */}
                <aside className="lg:sticky lg:top-20">
                    <Card title="Summary">
                        <dl className="space-y-2.5 text-sm">
                            <div className="flex justify-between"><dt className="text-gray-500">Items</dt><dd className="text-gray-900">{units}</dd></div>
                            <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd className="text-gray-900">{money(subtotal)}</dd></div>
                            {savings > 0 && (
                                <div className="flex justify-between"><dt className="text-gray-500">Line savings</dt><dd className="text-emerald-700">−{money(savings)}</dd></div>
                            )}
                            {code && (
                                <div className="flex justify-between gap-3">
                                    <dt className="text-gray-500">Coupon <span className="text-gray-400">({code})</span></dt>
                                    <dd className={coupon ? 'text-emerald-700' : 'text-gray-400'}>
                                        {coupon ? (couponDiscount > 0 ? `−${money(couponDiscount)}` : coupon.freeShipping ? 'Free delivery' : '৳0') : 'Not checked'}
                                    </dd>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <dt className="text-gray-500">
                                    Delivery
                                    {shipMode !== 'auto' && subtotal > 0 && <span className="text-gray-400"> ({shipMode === 'free' ? 'waived' : 'custom'})</span>}
                                </dt>
                                <dd className="text-gray-900">{deliveryLabel}</dd>
                            </div>
                            <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
                                <dt className="font-semibold text-gray-900">Total</dt>
                                <dd className="font-semibold text-gray-900">{money(total)}</dd>
                            </div>
                            <div className="flex justify-between pt-1 text-xs">
                                <dt className="text-gray-400">Payment</dt>
                                <dd className="text-gray-600">{methodMeta.label} · {paymentStatus === 'paid' ? 'Paid' : 'Pending'}</dd>
                            </div>
                            <div className="flex justify-between text-xs">
                                <dt className="text-gray-400">Status</dt>
                                <dd className="text-gray-600">{ORDER_STATUSES.find((s) => s.value === status)?.label}</dd>
                            </div>
                        </dl>
                        <Btn variant="primary" className="mt-5 w-full" onClick={submit} disabled={isCreating || !lines.length}>
                            {isCreating ? 'Creating order…' : 'Create order'}
                        </Btn>
                        <p className="mt-3 text-xs leading-relaxed text-gray-400">
                            Stock is reserved and the delivery charge and any coupon are confirmed by the server when you create the order.
                        </p>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
