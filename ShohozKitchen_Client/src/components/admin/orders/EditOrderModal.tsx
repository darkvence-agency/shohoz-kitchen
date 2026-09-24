/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * Correcting an order after it was placed — the customer's details, where it goes, how it
 * is paid, and what is on it.
 *
 * Only an order that has not gone to the courier can be opened here; the server refuses
 * the rest, and the order page hides the button for them. Everything sent is re-priced and
 * re-checked server-side, so the totals below are a preview, not the decision.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiAlertCircle, FiEdit3, FiX } from 'react-icons/fi';
import { LuPackage } from 'react-icons/lu';
import {
    useUpdateAdminOrderMutation, type AdminOrderUpdate, type OrderPaymentMethod,
} from '@/redux/api/orderApi';
import { useGetProductsQuery } from '@/redux/api/productApi';
import { useGetShippingSettingsQuery, type DeliveryArea } from '@/redux/api/shippingApi';
import { Badge, Field, INPUT, Segmented, TEXTAREA, cx } from '@/components/admin/ui';
import {
    MoneyInput, OrderLineRow, PAYMENT_METHODS, ProductPicker,
    customerPricing, linePrices, listPrice, money, normalisePhone, okMoney, toNum, uniq,
    unitPrice, validPhone,
    type Line, type ShipMode,
} from '@/components/admin/orders/orderLines';

/** What a saved order line tells us when its product can no longer be loaded. */
function lineFallbackProduct(item: any) {
    return {
        _id: typeof item.product === 'object' ? item.product?._id : item.product,
        name: item.name,
        thumbnail: item.thumbnail || item.product?.thumbnail || '',
        sku: item.sku || '',
        price: Number(item.price) || 0,
        originalPrice: Number(item.originalPrice) || 0,
        // Left undefined on purpose: the row says "no longer in the catalogue" rather than
        // inventing a stock figure nobody can stand behind.
        stock: undefined,
        variants: [],
    };
}

export default function EditOrderModal({ order, onClose }: { order: any; onClose: () => void }) {
    const [saveOrder, { isLoading: isSaving }] = useUpdateAdminOrderMutation();
    const [error, setError] = useState('');

    /* ─── Customer & address ─── */
    const addr = order.shippingAddress || {};
    const [cust, setCust] = useState({
        fullName: addr.fullName || '',
        phone: addr.phone || '',
        email: addr.email || '',
        address: addr.address || '',
        area: addr.area || '',
        city: addr.city || '',
        postalCode: addr.postalCode || '',
    });
    const phone = normalisePhone(cust.phone);
    const phoneOk = validPhone(phone);

    /* ─── Lines ─── */
    // The order's own copy of a line has only what was sold; editing needs the product as it
    // stands now — its options, its stock and today's price — so they are fetched by id.
    const savedItems: any[] = useMemo(() => order.items || [], [order.items]);
    const productIds = useMemo(
        () => Array.from(new Set(savedItems.map((it) => (typeof it.product === 'object' ? it.product?._id : it.product)).filter(Boolean))),
        [savedItems],
    );
    const { data: fetched, isLoading: loadingProducts } = useGetProductsQuery(
        { ids: productIds.join(','), includeDrafts: true, limit: 100 },
        { skip: !productIds.length },
    );

    // The order's lines as they stand, ready to edit: each keeps the price the order holds,
    // marked as a custom price only where that is not what the product costs today.
    const savedLines = useMemo<Line[] | null>(() => {
        if (productIds.length && loadingProducts) return null;
        const byId = new Map<string, any>((fetched?.data || []).map((p: any) => [String(p._id), p]));
        return savedItems.map((it, i) => {
            const id = String(typeof it.product === 'object' ? it.product?._id : it.product);
            const product = byId.get(id) || lineFallbackProduct(it);
            const color = it.color || '';
            const size = it.size || '';
            const sale = Number(it.price) || 0;
            const original = Number(it.originalPrice) > 0 ? Number(it.originalPrice) : sale;
            const asSold = sale !== unitPrice(product, color, size) || original !== listPrice(product, color, size);
            return {
                key: `${id}-${i}`,
                product,
                color,
                size,
                qty: Number(it.quantity) || 1,
                pricing: asSold ? { original: String(original), sale: String(sale), by: 'admin' as const } : null,
            };
        });
    }, [fetched, loadingProducts, productIds.length, savedItems]);

    // null until staff touch a line, so the list above stays the single source until then.
    const [editedLines, setEditedLines] = useState<Line[] | null>(null);
    const rows = editedLines ?? savedLines ?? [];
    const editLines = (change: (current: Line[]) => Line[]) => setEditedLines((prev) => change(prev ?? savedLines ?? []));

    const addProduct = (p: any) => {
        editLines((current) => {
            const hasVariants = (p.variants || []).length > 0;
            const i = hasVariants ? -1 : current.findIndex((l) => String(l.product._id) === String(p._id));
            if (i >= 0) return current.map((l, j) => (j === i ? { ...l, qty: Math.min(10000, l.qty + 1) } : l));
            return [...current, { key: `${p._id}-${Date.now()}`, product: p, color: '', size: '', qty: 1, pricing: null }];
        });
    };
    const patchLine = (key: string, patch: Partial<Line>) =>
        editLines((current) => current.map((l) => (l.key === key ? { ...l, ...patch } : l)));
    const removeLine = (key: string) => editLines((current) => current.filter((l) => l.key !== key));
    const pickOption = (l: Line, patch: { color?: string; size?: string }) => {
        const next = { ...l, ...patch };
        if (l.pricing?.by === 'customer') next.pricing = customerPricing(next, 0);
        patchLine(l.key, next);
    };
    // Typing either price fixes both for this line (the untouched one keeps its value).
    const editPrice = (l: Line, field: 'original' | 'sale', value: string) => {
        const base = l.pricing ?? {
            original: String(listPrice(l.product, l.color, l.size)),
            sale: String(unitPrice(l.product, l.color, l.size)),
        };
        patchLine(l.key, { pricing: { ...base, [field]: value, by: 'admin' } });
    };

    const priced = rows.map((l) => ({ l, ...linePrices(l) }));
    const subtotal = priced.reduce((s, x) => s + (x.valid ? x.sale * x.l.qty : 0), 0);

    /* ─── Delivery charge ─── */
    const { data: shipSettings } = useGetShippingSettingsQuery();
    const insideRate = shipSettings?.defaultInsideDhakaRate ?? 70;
    const outsideRate = shipSettings?.defaultOutsideDhakaRate ?? 130;
    const [area, setArea] = useState<DeliveryArea | ''>(
        order.deliveryArea === 'inside_dhaka' || order.deliveryArea === 'outside_dhaka' ? order.deliveryArea : '',
    );
    const [shipMode, setShipMode] = useState<ShipMode>((order.shippingMode as ShipMode) || 'auto');
    const [customShip, setCustomShip] = useState(String(Number(order.shippingCost) || 0));
    const customShipNum = toNum(customShip);
    const customShipOk = okMoney(customShipNum);
    // A preview only. 'auto' keeps whatever the order already has until the server re-runs
    // the delivery rules, which it does against the saved address, not this form.
    const areaRate = area === 'inside_dhaka' ? insideRate : area === 'outside_dhaka' ? outsideRate : 0;
    const autoDelivery = area ? areaRate : Number(order.shippingCost) || 0;
    const delivery = shipMode === 'free' ? 0 : shipMode === 'custom' ? (customShipOk ? customShipNum : 0) : autoDelivery;
    const discount = Number(order.discount) || 0;
    const total = Math.max(0, subtotal - discount) + delivery;

    /* ─── Payment ─── */
    const details = order.paymentDetails || {};
    const [pay, setPay] = useState<{ method: OrderPaymentMethod; senderNumber: string; transactionId: string; paymentTime: string }>({
        method: (order.paymentMethod === 'sslcommerz' ? 'bank' : order.paymentMethod) || 'cod',
        senderNumber: details.senderNumber || '',
        transactionId: details.transactionId || order.transactionId || '',
        // <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm"; anything else is dropped.
        paymentTime: (() => {
            const t = details.paymentTime ? new Date(details.paymentTime) : null;
            if (!t || isNaN(t.getTime())) return '';
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
        })(),
    });

    const [note, setNote] = useState(order.note || '');

    const missingVariant = (l: Line) => {
        const vs = l.product.variants || [];
        if (!vs.length) return false;
        return (uniq(vs.map((v: any) => v.color)).length > 0 && !l.color) || (uniq(vs.map((v: any) => v.size)).length > 0 && !l.size);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSaving) onClose(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [isSaving, onClose]);

    const submit = async () => {
        setError('');
        if (!cust.fullName.trim()) { toast.error('Customer name is required'); return; }
        if (!phoneOk) { toast.error('Enter a valid mobile number (01XXXXXXXXX)'); return; }
        if (!cust.address.trim()) { toast.error('Delivery address is required'); return; }
        if (!rows.length) { toast.error('An order must keep at least one product'); return; }
        const needsVariant = rows.find(missingVariant);
        if (needsVariant) { toast.error(`Choose the colour/size for “${needsVariant.product.name}”`); return; }
        const badPrice = priced.find((x) => !x.valid);
        if (badPrice) { toast.error(`Enter the prices for “${badPrice.l.product.name}” as numbers of 0 or more`); return; }
        if (shipMode === 'custom' && !customShipOk) { toast.error('Enter the delivery charge as a number of 0 or more'); return; }

        const paidAt = pay.paymentTime ? new Date(pay.paymentTime) : null;
        const payload: AdminOrderUpdate = {
            items: priced.map(({ l, edited, original, sale }) => ({
                product: String(l.product._id),
                quantity: l.qty,
                ...(l.color ? { color: l.color } : {}),
                ...(l.size ? { size: l.size } : {}),
                // Sent for every line whose price is not the product's own, so an edit never
                // silently re-prices an old order at today's catalogue price.
                ...(edited ? { unitPrice: sale, originalPrice: original } : {}),
            })),
            shippingAddress: {
                fullName: cust.fullName.trim(),
                phone,
                email: cust.email.trim() || undefined,
                address: cust.address.trim(),
                area: cust.area.trim() || undefined,
                city: cust.city.trim() || undefined,
                postalCode: cust.postalCode.trim() || undefined,
            },
            paymentMethod: pay.method,
            ...(pay.method !== 'cod'
                ? {
                    paymentDetails: {
                        senderNumber: pay.senderNumber.trim() || undefined,
                        transactionId: pay.transactionId.trim() || undefined,
                        paymentTime: paidAt && !isNaN(paidAt.getTime()) ? paidAt.toISOString() : undefined,
                    },
                }
                : {}),
            ...(area ? { deliveryArea: area } : {}),
            shipping: shipMode === 'custom' ? { mode: 'custom', amount: customShipNum } : { mode: shipMode },
            note: note.trim(),
        };

        try {
            await saveOrder({ id: String(order._id), ...payload }).unwrap();
            toast.success('Order updated');
            onClose();
        } catch (err: any) {
            const msg = err?.data?.errorMessages?.[0]?.message || err?.data?.message || 'Could not save the changes';
            setError(msg);
            toast.error(msg);
        }
    };

    const methodMeta = PAYMENT_METHODS.find((m) => m.id === pay.method) || PAYMENT_METHODS[0];

    return (
        <div className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto p-4 sm:py-10">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px]" onClick={isSaving ? undefined : onClose} />
            <div role="dialog" aria-modal="true" aria-labelledby="edit-order-title"
                className="relative flex w-full max-w-3xl flex-col rounded-md border border-gray-200 bg-white shadow-xl">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-800">
                        <FiEdit3 className="text-[var(--color-primary)]" size={18} />
                        <div>
                            <h3 id="edit-order-title" className="font-bold">Edit order</h3>
                            <p className="text-xs text-gray-500">{order.orderId} · changes here do not reach the courier once it is booked</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} disabled={isSaving} aria-label="Close"
                        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40"><FiX size={16} /></button>
                </div>

                <div className="space-y-6 px-6 py-5">
                    {/* Customer & address */}
                    <section>
                        <h4 className="mb-3 text-sm font-bold text-gray-800">Customer &amp; delivery address</h4>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Full name" required>
                                <input className={INPUT} value={cust.fullName} onChange={(e) => setCust({ ...cust, fullName: e.target.value })} />
                            </Field>
                            <Field label="Phone" required error={cust.phone && !phoneOk ? 'Enter an 11-digit number starting with 01' : undefined}>
                                <input className={INPUT} inputMode="tel" value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} />
                            </Field>
                            <Field label="Email" className="sm:col-span-2">
                                <input className={INPUT} type="email" value={cust.email} onChange={(e) => setCust({ ...cust, email: e.target.value })} />
                            </Field>
                            <Field label="Address" required className="sm:col-span-2">
                                <textarea className={TEXTAREA} rows={2} value={cust.address} onChange={(e) => setCust({ ...cust, address: e.target.value })} />
                            </Field>
                            <Field label="Area">
                                <input className={INPUT} value={cust.area} onChange={(e) => setCust({ ...cust, area: e.target.value })} />
                            </Field>
                            <Field label="City">
                                <input className={INPUT} value={cust.city} onChange={(e) => setCust({ ...cust, city: e.target.value })} />
                            </Field>
                            <Field label="Postal code">
                                <input className={INPUT} value={cust.postalCode} onChange={(e) => setCust({ ...cust, postalCode: e.target.value })} />
                            </Field>
                        </div>
                        <p className="mt-2 text-xs text-gray-400">
                            The order stays with the customer account it was placed against, even if the phone number is corrected here.
                        </p>
                    </section>

                    {/* Products */}
                    <section>
                        <h4 className="mb-3 text-sm font-bold text-gray-800">Products</h4>
                        <ProductPicker onPick={addProduct} />
                        {savedLines === null ? (
                            <p className="mt-4 px-4 py-6 text-center text-sm text-gray-500">Loading the order&apos;s products…</p>
                        ) : rows.length === 0 ? (
                            <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                                <LuPackage size={24} className="mx-auto mb-2 text-gray-300" />
                                An order must keep at least one product.
                            </div>
                        ) : (
                            <ul className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-200">
                                {priced.map(({ l, original, sale, edited, valid }) => (
                                    <OrderLineRow
                                        key={l.key}
                                        line={l}
                                        priced={{ original, sale, edited, valid }}
                                        editedLabel="Custom price"
                                        onPatch={(patch) => patchLine(l.key, patch)}
                                        onRemove={() => removeLine(l.key)}
                                        onPickOption={(patch) => pickOption(l, patch)}
                                        onEditPrice={(field, value) => editPrice(l, field, value)}
                                    />
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Delivery charge */}
                    <section>
                        <h4 className="mb-3 text-sm font-bold text-gray-800">Delivery charge</h4>
                        <div className="flex flex-wrap items-center gap-3">
                            <Segmented<DeliveryArea | ''>
                                value={area}
                                onChange={setArea}
                                options={[
                                    // "Not set" is offered only while the order has no area: it
                                    // means "leave it alone", and once one is chosen there is no
                                    // going back to none — pick the other side or type the charge.
                                    ...(order.deliveryArea ? [] : [{ value: '' as const, label: 'Not set' }]),
                                    { value: 'inside_dhaka' as const, label: `Inside Dhaka · ${money(insideRate)}` },
                                    { value: 'outside_dhaka' as const, label: `Outside Dhaka · ${money(outsideRate)}` },
                                ]}
                            />
                            <Segmented<ShipMode>
                                value={shipMode}
                                onChange={setShipMode}
                                options={[
                                    { value: 'auto', label: 'Normal' },
                                    { value: 'free', label: 'Free' },
                                    { value: 'custom', label: 'Type it' },
                                ]}
                            />
                            {shipMode === 'custom' && (
                                <MoneyInput className="w-36" ariaLabel="Delivery charge" value={customShip}
                                    invalid={!customShipOk} onChange={setCustomShip} />
                            )}
                        </div>
                    </section>

                    {/* Payment */}
                    <section>
                        <h4 className="mb-3 text-sm font-bold text-gray-800">Payment</h4>
                        <div className="flex flex-wrap gap-2">
                            {PAYMENT_METHODS.map((m) => (
                                <button key={m.id} type="button" onClick={() => setPay({ ...pay, method: m.id })}
                                    className={cx('rounded-full border px-3 py-1.5 text-sm transition',
                                        pay.method === m.id ? 'border-transparent text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50')}
                                    style={pay.method === m.id ? { backgroundColor: m.color } : undefined}>
                                    {m.label}
                                </button>
                            ))}
                        </div>
                        {pay.method !== 'cod' && (
                            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                                <Field label={pay.method === 'bank' ? 'From account' : 'Sender number'}>
                                    <input className={INPUT} value={pay.senderNumber} onChange={(e) => setPay({ ...pay, senderNumber: e.target.value })} />
                                </Field>
                                <Field label="Transaction ID">
                                    <input className={INPUT} value={pay.transactionId} onChange={(e) => setPay({ ...pay, transactionId: e.target.value })} />
                                </Field>
                                <Field label="Paid at">
                                    <input className={INPUT} type="datetime-local" value={pay.paymentTime}
                                        onChange={(e) => setPay({ ...pay, paymentTime: e.target.value })} />
                                </Field>
                            </div>
                        )}
                        <p className="mt-2 text-xs text-gray-400">
                            Whether it is paid stays on the order page — this only records how and with what reference. Switching to {methodMeta.label.toLowerCase()} keeps the rest of the order as it is.
                        </p>
                    </section>

                    {/* Note */}
                    <section>
                        <Field label="Order note" hint="Goes to the courier on the parcel.">
                            <textarea className={TEXTAREA} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                        </Field>
                    </section>

                    {/* What it comes to */}
                    <section className="rounded-xl bg-gray-50 px-4 py-3 text-sm">
                        <div className="flex justify-between py-0.5 text-gray-600"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                        {discount > 0 && (
                            <div className="flex justify-between py-0.5 text-gray-600">
                                <span>Discount{order.couponCode ? ` · ${order.couponCode}` : ''}</span><span>− {money(discount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-0.5 text-gray-600"><span>Delivery</span><span>{delivery === 0 ? 'Free' : money(delivery)}</span></div>
                        <div className="mt-1 flex justify-between border-t border-gray-200 pt-2 font-bold text-gray-900"><span>Total</span><span>{money(total)}</span></div>
                        <p className="mt-2 text-xs text-gray-400">
                            A preview — the server works the total out again when it saves{shipMode === 'auto' ? ', including the delivery charge for the address above' : ''}.
                        </p>
                        {discount > 0 && <Badge tone="gray" className="mt-2">The coupon is not re-checked; its amount follows the new subtotal.</Badge>}
                    </section>

                    {error && (
                        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                            <FiAlertCircle size={14} className="mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
                    <button type="button" onClick={onClose} disabled={isSaving}
                        className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all hover:bg-gray-50 disabled:opacity-50">
                        Cancel
                    </button>
                    <button type="button" onClick={submit} disabled={isSaving}
                        className="flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-[var(--color-primary-dark)] disabled:opacity-50">
                        {isSaving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
