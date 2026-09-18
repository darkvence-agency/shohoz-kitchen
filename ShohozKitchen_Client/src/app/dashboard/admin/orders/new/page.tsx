/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { LuMinus, LuPlus, LuTrash2, LuPackage, LuUserCheck, LuUserPlus } from 'react-icons/lu';
import { useCreateAdminOrderMutation } from '@/redux/api/orderApi';
import { useGetProductsQuery } from '@/redux/api/productApi';
import { useGetAdminUsersQuery } from '@/redux/api/userApi';
import { useGetDeliveryZonesQuery, useGetShippingQuoteQuery } from '@/redux/api/shippingApi';
import {
    PageHeader, Btn, Card, Field, SearchInput, INPUT, TEXTAREA, Badge, taka, cx,
} from '@/components/admin/ui';

type Line = { key: string; product: any; color: string; size: string; qty: number };

const same = (a: any, b: any) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
const uniq = (xs: string[]) => Array.from(new Set(xs.filter(Boolean)));

/** The unit price the server will charge — mirrors resolveEffectivePrice in order.service. */
function unitPrice(p: any, color: string, size: string): number {
    if (color || size) {
        const v = (p.variants || []).find((vv: any) => (!color || same(vv.color, color)) && (!size || same(vv.size, size)));
        if (v) {
            const d = v.discount || 0;
            return d > 0 ? v.price - (v.price * d) / 100 : v.price;
        }
    }
    const now = Date.now();
    const start = p.offerStartDate ? new Date(p.offerStartDate).getTime() : NaN;
    const end = p.offerEndDate ? new Date(p.offerEndDate).getTime() : NaN;
    const offerActive = (isNaN(start) || now >= start) && (isNaN(end) || now <= end);
    if (offerActive) return p.price;
    return p.originalPrice > 0 ? p.originalPrice : p.price;
}

const normalisePhone = (s: string) => s.replace(/[\s-]/g, '').replace(/^\+?88/, '');
const validPhone = (s: string) => /^01[3-9]\d{8}$/.test(s);

function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}

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
    const [search, setSearch] = useState('');
    const q = useDebounced(search.trim());
    const { data: found, isFetching: searching } = useGetProductsQuery(
        { searchTerm: q, status: 'active', limit: 8 },
        { skip: q.length < 2 },
    );
    const results: any[] = q.length >= 2 ? found?.data || [] : [];

    const addProduct = (p: any) => {
        setLines((ls) => {
            const hasVariants = (p.variants || []).length > 0;
            const i = hasVariants ? -1 : ls.findIndex((l) => l.product._id === p._id);
            if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
            return [...ls, { key: `${p._id}-${Date.now()}`, product: p, color: '', size: '', qty: 1 }];
        });
        setSearch('');
    };
    const patchLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

    const subtotal = useMemo(() => lines.reduce((s, l) => s + unitPrice(l.product, l.color, l.size) * l.qty, 0), [lines]);
    const units = lines.reduce((n, l) => n + l.qty, 0);

    /* ─── Delivery ─── */
    const { data: zones = [] } = useGetDeliveryZonesQuery();
    const [zoneId, setZoneId] = useState('');
    const quoteZone = zoneId && zoneId !== 'other' ? zoneId : undefined;
    const city = useDebounced(cust.city.trim(), 400);
    const { data: quote, isFetching: quoting } = useGetShippingQuoteQuery(
        { city: city || undefined, subtotal, zoneId: quoteZone },
        { skip: subtotal === 0 },
    );
    const delivery = subtotal === 0 ? 0 : quote?.shippingCost ?? 0;

    /* ─── Payment & notes ─── */
    const [pay, setPay] = useState({ method: 'cod', senderNumber: '', transactionId: '' });
    const [couponCode, setCouponCode] = useState('');
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

        try {
            const res = await createOrder({
                items: lines.map((l) => ({ product: l.product._id, quantity: l.qty, ...(l.color ? { color: l.color } : {}), ...(l.size ? { size: l.size } : {}) })),
                shippingAddress: {
                    fullName: cust.fullName.trim(),
                    phone,
                    email: cust.email.trim() || undefined,
                    address: cust.address.trim(),
                    area: cust.area.trim() || undefined,
                    city: cust.city.trim() || undefined,
                },
                paymentMethod: pay.method,
                ...(pay.method !== 'cod' && (pay.senderNumber || pay.transactionId)
                    ? { paymentDetails: { senderNumber: pay.senderNumber || undefined, transactionId: pay.transactionId || undefined } }
                    : {}),
                couponCode: couponCode.trim() || undefined,
                note: note.trim() || undefined,
                ...(quoteZone ? { zoneId: quoteZone } : {}),
            }).unwrap();
            toast.success(`Order ${res?.data?.orderId || ''} created`);
            router.push(res?.data?._id ? `/dashboard/admin/orders/${res.data._id}` : '/dashboard/admin/orders');
        } catch (err: any) {
            toast.error(err?.data?.errorMessages?.[0]?.message || err?.data?.message || 'Could not create the order');
        }
    };

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
                                        {existing.defaultDiscount > 0 && <> · has a {existing.defaultDiscount}% default discount</>}
                                    </span>
                                ) : <span>New customer — they are added when you create the order.</span>}
                            </div>
                        )}

                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <Field label="Address" required className="sm:col-span-2">
                                <textarea className={TEXTAREA} rows={2} placeholder="House, road, area" value={cust.address}
                                    onChange={(e) => setCust({ ...cust, address: e.target.value })} />
                            </Field>
                            {zones.length > 0 && (
                                <Field label="Delivery area">
                                    <select className={cx(INPUT, 'cursor-pointer')} value={zoneId}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setZoneId(v);
                                            const z = zones.find((zz) => zz._id === v);
                                            if (z) setCust((c) => ({ ...c, city: z.name }));
                                        }}>
                                        <option value="">Choose…</option>
                                        {zones.map((z) => <option key={z._id} value={z._id}>{z.name} — {taka(z.price)}</option>)}
                                        <option value="other">Other (by city)</option>
                                    </select>
                                </Field>
                            )}
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
                    <Card title="Products" description="Only active products with stock can be ordered.">
                        <div className="relative">
                            <SearchInput value={search} onChange={setSearch} placeholder="Search products by name or SKU…" className="sm:w-full" />
                            {q.length >= 2 && (
                                <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                                    {searching && !results.length ? <p className="px-3 py-3 text-sm text-gray-500">Searching…</p>
                                        : !results.length ? <p className="px-3 py-3 text-sm text-gray-500">No active product matches “{q}”.</p>
                                            : results.map((p) => (
                                                <button key={p._id} type="button" onClick={() => addProduct(p)} disabled={p.stock <= 0}
                                                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                                        {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-full w-full object-cover" /> : <LuPackage className="text-gray-300" />}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm text-gray-900">{p.name}</p>
                                                        <p className="text-xs text-gray-400">{p.sku || 'No SKU'} · {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}</p>
                                                    </div>
                                                    <span className="text-sm font-medium text-gray-900">{taka(unitPrice(p, '', ''))}</span>
                                                </button>
                                            ))}
                                </div>
                            )}
                        </div>

                        {lines.length === 0 ? (
                            <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                                <LuPackage size={26} className="mx-auto mb-2 text-gray-300" />
                                Search above and click a product to add it.
                            </div>
                        ) : (
                            <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200">
                                {lines.map((l) => {
                                    const p = l.product;
                                    const vs: any[] = p.variants || [];
                                    const colors = uniq(vs.map((v) => v.color));
                                    const sizes = uniq(vs.filter((v) => !l.color || same(v.color, l.color)).map((v) => v.size));
                                    const price = unitPrice(p, l.color, l.size);
                                    const over = l.qty > (p.stock || 0);
                                    return (
                                        <li key={l.key} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                                            <div className="flex min-w-0 flex-1 items-center gap-3">
                                                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                                    {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-full w-full object-cover" /> : <LuPackage className="text-gray-300" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="line-clamp-1 text-sm font-medium text-gray-900">{p.name}</p>
                                                    <p className={cx('text-xs', over ? 'text-red-600' : 'text-gray-400')}>
                                                        {taka(price)} each · {over ? `only ${p.stock} in stock` : `${p.stock} in stock`}
                                                    </p>
                                                    {(colors.length > 0 || sizes.length > 0) && (
                                                        <div className="mt-1.5 flex flex-wrap gap-2">
                                                            {colors.length > 0 && (
                                                                <select aria-label="Colour" value={l.color} onChange={(e) => patchLine(l.key, { color: e.target.value, size: '' })}
                                                                    className={cx('h-7 rounded-lg border bg-white px-2 text-xs outline-none', !l.color ? 'border-amber-300' : 'border-gray-200')}>
                                                                    <option value="">Colour…</option>
                                                                    {colors.map((c) => <option key={c} value={c}>{c}</option>)}
                                                                </select>
                                                            )}
                                                            {sizes.length > 0 && (
                                                                <select aria-label="Size" value={l.size} onChange={(e) => patchLine(l.key, { size: e.target.value })}
                                                                    className={cx('h-7 rounded-lg border bg-white px-2 text-xs outline-none', !l.size ? 'border-amber-300' : 'border-gray-200')}>
                                                                    <option value="">Size…</option>
                                                                    {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 sm:justify-end">
                                                <div className="inline-flex items-center rounded-full border border-gray-200">
                                                    <button type="button" aria-label="Decrease" onClick={() => patchLine(l.key, { qty: Math.max(1, l.qty - 1) })}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"><LuMinus size={14} /></button>
                                                    <input aria-label="Quantity" inputMode="numeric" value={l.qty}
                                                        onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10); patchLine(l.key, { qty: Number.isFinite(n) && n > 0 ? Math.min(n, 10000) : 1 }); }}
                                                        className="w-10 bg-transparent text-center text-sm outline-none" />
                                                    <button type="button" aria-label="Increase" onClick={() => patchLine(l.key, { qty: Math.min(10000, l.qty + 1) })}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-100"><LuPlus size={14} /></button>
                                                </div>
                                                <span className="w-24 text-right text-sm font-medium text-gray-900">{taka(price * l.qty)}</span>
                                                <button type="button" aria-label="Remove" onClick={() => removeLine(l.key)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600"><LuTrash2 size={15} /></button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Card>

                    {/* Payment & notes */}
                    <Card title="Payment & notes">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Payment method">
                                <select className={cx(INPUT, 'cursor-pointer')} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                                    <option value="cod">Cash on delivery</option>
                                    <option value="bkash">bKash</option>
                                    <option value="nagad">Nagad</option>
                                    <option value="rocket">Rocket</option>
                                </select>
                            </Field>
                            <Field label="Coupon code" hint="Applied only if it is valid for this customer.">
                                <input className={cx(INPUT, 'uppercase')} value={couponCode} onChange={(e) => setCouponCode(e.target.value)} />
                            </Field>
                            {pay.method !== 'cod' && <>
                                <Field label="Sender number">
                                    <input className={INPUT} inputMode="tel" value={pay.senderNumber} onChange={(e) => setPay({ ...pay, senderNumber: e.target.value })} />
                                </Field>
                                <Field label="Transaction ID">
                                    <input className={INPUT} value={pay.transactionId} onChange={(e) => setPay({ ...pay, transactionId: e.target.value })} />
                                </Field>
                            </>}
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
                            <div className="flex justify-between"><dt className="text-gray-500">Subtotal</dt><dd className="text-gray-900">{taka(subtotal)}</dd></div>
                            <div className="flex justify-between">
                                <dt className="text-gray-500">Delivery</dt>
                                <dd className="text-gray-900">{subtotal === 0 ? '—' : quoting ? '…' : delivery === 0 ? 'Free' : taka(delivery)}</dd>
                            </div>
                            {couponCode.trim() && (
                                <div className="flex justify-between"><dt className="text-gray-500">Coupon</dt><dd className="text-gray-500">{couponCode.trim().toUpperCase()}</dd></div>
                            )}
                            <div className="flex justify-between border-t border-gray-100 pt-3 text-base">
                                <dt className="font-semibold text-gray-900">Total</dt>
                                <dd className="font-semibold text-gray-900">{taka(subtotal + delivery)}</dd>
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
