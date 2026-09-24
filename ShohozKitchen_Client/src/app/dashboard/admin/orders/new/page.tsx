/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { LuPackage, LuUserCheck, LuUserPlus } from 'react-icons/lu';
import { useCreateAdminOrderMutation, type AdminOrderInput, type OrderPaymentMethod } from '@/redux/api/orderApi';
import { useGetAdminUsersQuery } from '@/redux/api/userApi';
import { useGetSiteContentQuery } from '@/redux/api/siteContentApi';
import { useValidateCouponMutation } from '@/redux/api/couponApi';
import {
    useGetDeliveryZonesQuery, useGetShippingQuoteQuery, useGetShippingSettingsQuery, type DeliveryArea,
} from '@/redux/api/shippingApi';
import {
    PageHeader, Btn, Card, Field, INPUT, TEXTAREA, Badge, Segmented, taka, cx,
} from '@/components/admin/ui';
// The line list, its prices and the product picker are shared with the order page's
// "Edit order", so both stay in step with how the server re-prices what it is sent.
import {
    MoneyInput, OrderLineRow, PAYMENT_METHODS, ProductPicker, customerPricing,
    linePrices, listPrice, money, normalisePhone, okMoney, toNum, uniq, unitPrice,
    useDebounced, validPhone,
    type Line, type ShipMode,
} from '@/components/admin/orders/orderLines';

/* ─── This page only ────────────────────────────────────────────────────── */

type OrderStatus = NonNullable<AdminOrderInput['status']>;
type PayStatus = NonNullable<AdminOrderInput['paymentStatus']>;

const ORDER_STATUSES: ReadonlyArray<{ value: OrderStatus; label: string }> = [
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
];

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
                                {priced.map(({ l, original, sale, edited, valid }) => (
                                    <OrderLineRow
                                        key={l.key}
                                        line={l}
                                        priced={{ original, sale, edited, valid }}
                                        editedLabel={l.pricing?.by === 'customer' ? `Edited · ${custDiscount}% customer` : 'Edited'}
                                        onPatch={(patch) => patchLine(l.key, patch)}
                                        onRemove={() => removeLine(l.key)}
                                        onPickOption={(patch) => pickOption(l, patch)}
                                        onEditPrice={(field, value) => editPrice(l, field, value)}
                                    />
                                ))}
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
