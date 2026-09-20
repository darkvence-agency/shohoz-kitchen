"use client";

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { LuPlus, LuTrash2, LuX, LuSearch, LuInfo, LuSave, LuCircleCheck } from 'react-icons/lu';
import { Card, Btn, Field, Segmented, Badge, INPUT, TEXTAREA, taka, cx } from '@/components/admin/ui';
import {
    useCreatePurchaseMutation, useUpdatePurchaseMutation,
    type Purchase, type PurchaseCurrency, type PurchaseInput, type ShippingMode,
} from '@/redux/api/purchaseApi';
import { useGetSupplierListQuery, type Supplier } from '@/redux/api/supplierApi';
import { useGetInventoryStockQuery } from '@/redux/api/inventoryApi';
import { errorMessage, qty, unitShort, useDebounced, Thumb } from '@/app/dashboard/admin/inventory/shared';
import SupplierFormModal from '@/app/dashboard/admin/suppliers/_components/SupplierFormModal';
import {
    CURRENCIES, SHIPPING, calcTotals, currencySymbol, dhakaDay, money, parseAmount, purchaseHref, round2,
} from './shared';

/* ─── Form model ─────────────────────────────────────────────────────── */

type Picked = {
    _id: string; name: string; sku: string; unit: string; thumbnail: string; status: string; stock: number;
    variants: { _id: string; label: string; stock: number }[];
};

type Line = {
    key: string;
    _id?: string;
    product: Picked | null;
    variantId: string;
    name: string;
    sku: string;
    qty: string;
    unitCost: string;
};

let keySeq = 0;
const newKey = () => `line-${++keySeq}`;
const emptyLine = (): Line => ({ key: newKey(), product: null, variantId: '', name: '', sku: '', qty: '', unitCost: '' });
const isBlank = (l: Line) => !l.product && !l.name.trim() && !l.qty.trim() && !l.unitCost.trim();

type FormState = {
    supplier: string;
    supplierInvoice: string;
    shippingMode: ShippingMode;
    orderDate: string;
    eta: string;
    currency: PurchaseCurrency;
    rate: string;
    lines: Line[];
    shippingCost: string;
    customsDuty: string;
    otherCost: string;
    otherCostLabel: string;
    discount: string;
    note: string;
};

const numStr = (n?: number | null) => (n ? String(n) : '');

function fromPurchase(p: Purchase | null | undefined, today: string, supplier?: string): FormState {
    if (!p) {
        return {
            supplier: supplier || '', supplierInvoice: '', shippingMode: '', orderDate: today, eta: '',
            currency: 'BDT', rate: '', lines: [emptyLine()],
            shippingCost: '', customsDuty: '', otherCost: '', otherCostLabel: '', discount: '', note: '',
        };
    }
    return {
        supplier: p.supplier?._id || '',
        supplierInvoice: p.supplierInvoice || '',
        shippingMode: p.shippingMode || '',
        orderDate: dhakaDay(p.orderDate),
        eta: p.eta ? dhakaDay(p.eta) : '',
        currency: p.currency,
        rate: p.currency === 'BDT' ? '' : String(p.exchangeRate || ''),
        lines: p.items.map((i) => ({
            key: newKey(),
            _id: i._id,
            product: i.product && !i.product.isDeleted ? {
                _id: i.product._id, name: i.product.name, sku: i.product.sku, unit: i.product.unit,
                thumbnail: i.product.thumbnail, status: i.product.status, stock: i.product.stock,
                variants: i.product.variants.map((v) => ({ _id: v._id, label: v.label, stock: v.stock })),
            } : null,
            variantId: i.variantId || '',
            name: i.name,
            sku: i.sku || '',
            qty: String(i.qty),
            unitCost: String(i.unitCost),
        })),
        shippingCost: numStr(p.shippingCost),
        customsDuty: numStr(p.customsDuty),
        otherCost: numStr(p.otherCost),
        otherCostLabel: p.otherCostLabel || '',
        discount: numStr(p.discount),
        note: p.note || '',
    };
}

/* ─── Component ──────────────────────────────────────────────────────── */

/**
 * New purchase, or edit one that has received nothing yet. Totals shown here are a
 * live preview; the server recomputes them from the items and costs on save.
 */
export default function PurchaseForm({ purchase, initialSupplier, onDone, onCancel }: {
    purchase?: Purchase | null;
    initialSupplier?: string;
    onDone?: (p: Purchase) => void;
    onCancel?: () => void;
}) {
    const router = useRouter();
    const editing = !!purchase;
    const [today] = useState(() => dhakaDay());
    const [f, setF] = useState<FormState>(() => fromPurchase(purchase, today, initialSupplier));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [quickAdd, setQuickAdd] = useState<{ key: number } | null>(null);

    const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));
    const setLine = (key: string, patch: Partial<Line>) =>
        setF((s) => ({ ...s, lines: s.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));
    const addLine = () => setF((s) => ({ ...s, lines: [...s.lines, emptyLine()] }));
    const removeLine = (key: string) =>
        setF((s) => ({ ...s, lines: s.lines.length > 1 ? s.lines.filter((l) => l.key !== key) : [emptyLine()] }));

    const { data: suppliers = [], isLoading: suppliersLoading } = useGetSupplierListQuery({ scope: 'all' });
    const supplierOptions = suppliers.filter((s) => s.isActive || s._id === f.supplier);
    const chosen = suppliers.find((s) => s._id === f.supplier);

    const [create, { isLoading: creating }] = useCreatePurchaseMutation();
    const [update, { isLoading: updating }] = useUpdatePurchaseMutation();
    const busy = creating || updating;

    /* Live figures */
    const rate = f.currency === 'BDT' ? 1 : Number(f.rate) || 0;
    const nums = useMemo(() => f.lines.map((l) => ({
        qty: Number(l.qty) > 0 ? Number(l.qty) : 0,
        unitCost: Number(l.unitCost) >= 0 ? Number(l.unitCost) : 0,
    })), [f.lines]);
    const extra = (v: string) => { const n = parseAmount(v); return typeof n === 'number' ? n : 0; };
    const totals = calcTotals({
        currency: f.currency, exchangeRate: rate, items: nums,
        shippingCost: extra(f.shippingCost), customsDuty: extra(f.customsDuty), otherCost: extra(f.otherCost), discount: extra(f.discount),
    });
    const sym = currencySymbol(f.currency);
    const foreign = f.currency !== 'BDT';

    /* Validation */
    const validate = () => {
        const e: Record<string, string> = {};
        if (!f.supplier) e.supplier = 'Choose the supplier';
        if (!f.orderDate) e.orderDate = 'Pick the order date';
        else if (f.orderDate > today) e.orderDate = 'The order date cannot be in the future';
        if (f.eta && f.orderDate && f.eta < f.orderDate) e.eta = 'ETA cannot be before the order date';
        if (foreign && !(Number(f.rate) > 0)) e.rate = `Enter how many taka 1 ${f.currency} costs`;
        const lines = f.lines.filter((l) => !isBlank(l));
        if (!lines.length) e.lines = 'Add at least one item';
        for (const l of lines) {
            if (!l.name.trim() && !l.product) e[`${l.key}.name`] = 'Pick a product or type the item name';
            const q = Number(l.qty);
            if (!l.qty.trim() || !Number.isInteger(q) || q < 1) e[`${l.key}.qty`] = 'Whole number, 1 or more';
            const c = Number(l.unitCost);
            if (!l.unitCost.trim() || !Number.isFinite(c) || c < 0) e[`${l.key}.unitCost`] = 'Enter the cost (0 if free)';
        }
        for (const k of ['shippingCost', 'customsDuty', 'otherCost', 'discount'] as const) {
            if (parseAmount(f[k]) === null) e[k] = 'Enter 0 or more';
        }
        if (!Object.keys(e).length && totals.grandTotal < 0) e.discount = 'The discount is larger than the whole bill';
        if (!Object.keys(e).length && editing && purchase!.paid > totals.grandTotal + 0.001) {
            e.lines = `${taka(purchase!.paid, 2)} has already been paid — the new total cannot be less than that`;
        }
        return e;
    };

    const body = (): PurchaseInput => ({
        supplier: f.supplier,
        supplierInvoice: f.supplierInvoice.trim(),
        shippingMode: f.shippingMode,
        orderDate: f.orderDate,
        eta: f.eta || null,
        currency: f.currency,
        ...(foreign ? { exchangeRate: Number(f.rate) } : {}),
        items: f.lines.filter((l) => !isBlank(l)).map((l) => ({
            ...(l._id ? { _id: l._id } : {}),
            product: l.product?._id || null,
            variantId: l.product && l.variantId ? l.variantId : null,
            name: l.name.trim() || l.product?.name || '',
            ...(l.sku.trim() ? { sku: l.sku.trim() } : {}),
            qty: Number(l.qty),
            unitCost: Number(l.unitCost),
        })),
        shippingCost: extra(f.shippingCost),
        customsDuty: extra(f.customsDuty),
        otherCost: extra(f.otherCost),
        otherCostLabel: f.otherCostLabel.trim(),
        discount: extra(f.discount),
        note: f.note.trim(),
    });

    const save = async (status?: 'draft' | 'confirmed') => {
        const e = validate();
        setErrors(e);
        if (Object.keys(e).length) {
            toast.error(e.lines && Object.keys(e).length === 1 ? e.lines : 'Check the highlighted fields');
            return;
        }
        try {
            if (editing) {
                const saved = await update({ id: purchase!._id, ...body(), ...(status ? { status } : {}) }).unwrap();
                toast.success(status === 'confirmed' && purchase!.status === 'draft' ? `${saved.reference} saved and confirmed` : `${saved.reference} saved`);
                onDone?.(saved);
            } else {
                const saved = await create({ ...body(), status: status || 'draft' }).unwrap();
                toast.success(`${saved.reference} created${saved.status === 'confirmed' ? ' and confirmed' : ' as a draft'}`);
                router.push(purchaseHref(saved._id));
            }
        } catch (err) {
            toast.error(errorMessage(err, 'Could not save the purchase'), { duration: 6000 });
        }
    };

    const cancel = () => (onCancel ? onCancel() : router.back());

    return (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-5">
                {/* ═══ Supplier & order ═══ */}
                <Card title="Supplier & order">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <span className="mb-1.5 block text-sm font-medium text-gray-700">Supplier<span className="text-red-500"> *</span></span>
                            <div className="flex gap-2">
                                <select
                                    aria-label="Supplier"
                                    className={cx(INPUT, 'min-w-0 flex-1', errors.supplier && 'border-red-300')}
                                    value={f.supplier}
                                    onChange={(e) => set('supplier', e.target.value)}
                                >
                                    <option value="">{suppliersLoading ? 'Loading…' : 'Choose a supplier…'}</option>
                                    {supplierOptions.map((s) => (
                                        <option key={s._id} value={s._id}>{s.name}{s.country ? ` — ${s.country}` : ''}{s.isActive ? '' : ' (inactive)'}</option>
                                    ))}
                                </select>
                                <Btn icon={<LuPlus size={15} />} onClick={() => setQuickAdd({ key: Date.now() })} className="h-10 shrink-0">
                                    <span className="hidden sm:inline">New supplier</span>
                                </Btn>
                            </div>
                            {errors.supplier ? <span className="mt-1 block text-xs text-red-600">{errors.supplier}</span>
                                : chosen ? <SupplierHint s={chosen} /> : null}
                        </div>
                        <Field label="Supplier invoice no." hint="Their bill or proforma number">
                            <input className={INPUT} value={f.supplierInvoice} maxLength={80} onChange={(e) => set('supplierInvoice', e.target.value)} />
                        </Field>
                        <Field label="Shipping mode">
                            <select className={INPUT} value={f.shippingMode} onChange={(e) => set('shippingMode', e.target.value as ShippingMode)}>
                                {SHIPPING.map((s) => <option key={s.value || 'none'} value={s.value}>{s.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Order date" required error={errors.orderDate}>
                            <input className={INPUT} type="date" value={f.orderDate} max={today} onChange={(e) => set('orderDate', e.target.value)} />
                        </Field>
                        <Field label="ETA" error={errors.eta} hint="When the goods should arrive">
                            <input className={INPUT} type="date" value={f.eta} min={f.orderDate || undefined} onChange={(e) => set('eta', e.target.value)} />
                        </Field>
                    </div>
                </Card>

                {/* ═══ Currency ═══ */}
                <Card title="Currency" description="Item prices are entered in this currency; extra costs and payments are always in taka.">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                        <Segmented
                            value={f.currency}
                            onChange={(v) => set('currency', v)}
                            options={CURRENCIES.map((c) => ({ value: c.value, label: `${c.symbol} ${c.label}` }))}
                        />
                        {foreign && (
                            <Field label={`Exchange rate — 1 ${f.currency} =`} required error={errors.rate} className="sm:w-56">
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">৳</span>
                                    <input className={cx(INPUT, 'pl-7')} type="number" inputMode="decimal" min={0} step="any" value={f.rate}
                                        placeholder={f.currency === 'RMB' ? 'e.g. 17.20' : 'e.g. 122.50'}
                                        onChange={(e) => set('rate', e.target.value)} />
                                </div>
                            </Field>
                        )}
                    </div>
                </Card>

                {/* ═══ Items ═══ */}
                <Card
                    title="Items"
                    description="Pick a catalogue product (its stock can be updated when the goods arrive) or just type a name."
                    actions={<Btn icon={<LuPlus size={15} />} onClick={addLine}>Add item</Btn>}
                >
                    <div className="hidden grid-cols-[minmax(0,1fr)_88px_120px_140px_36px] gap-2 border-b border-gray-100 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 sm:grid">
                        <span>Item</span>
                        <span className="text-right">Qty</span>
                        <span className="text-right">Unit cost ({sym})</span>
                        <span className="text-right">Amount</span>
                        <span />
                    </div>
                    <div className="divide-y divide-gray-100">
                        {f.lines.map((l, k) => (
                            <LineRow
                                key={l.key}
                                line={l}
                                index={k}
                                currency={f.currency}
                                rate={rate}
                                landed={totals.landed[k]}
                                errors={errors}
                                onChange={(patch) => setLine(l.key, patch)}
                                onRemove={() => removeLine(l.key)}
                            />
                        ))}
                    </div>
                    {errors.lines && <p className="mt-2 text-xs text-red-600">{errors.lines}</p>}
                    <button type="button" onClick={addLine} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline">
                        <LuPlus size={15} /> Add another item
                    </button>
                </Card>

                {/* ═══ Extra costs ═══ */}
                <Card title="Extra costs (৳)" description="Spread over the items by value to give each one its landed cost.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <MoneyField label="Shipping / freight" value={f.shippingCost} error={errors.shippingCost} onChange={(v) => set('shippingCost', v)} />
                        <MoneyField label="Customs duty" value={f.customsDuty} error={errors.customsDuty} onChange={(v) => set('customsDuty', v)} />
                        <MoneyField label="Other cost" value={f.otherCost} error={errors.otherCost} onChange={(v) => set('otherCost', v)} />
                        <Field label="Other cost is for">
                            <input className={INPUT} value={f.otherCostLabel} maxLength={60} placeholder="e.g. C&F agent, labour" onChange={(e) => set('otherCostLabel', e.target.value)} />
                        </Field>
                        <MoneyField label="Discount" value={f.discount} error={errors.discount} onChange={(v) => set('discount', v)} />
                    </div>
                </Card>

                <Card title="Note">
                    <textarea aria-label="Note" className={TEXTAREA} rows={3} maxLength={1000} value={f.note} onChange={(e) => set('note', e.target.value)}
                        placeholder="Anything worth remembering about this order" />
                </Card>
            </div>

            {/* ═══ Totals (sticky on wide screens) ═══ */}
            <div className="space-y-3 lg:sticky lg:top-4">
                <Card title="Totals">
                    <dl className="space-y-2 text-sm">
                        {foreign && <Sum label={`Subtotal (${f.currency})`} value={money(totals.subtotal, f.currency)} />}
                        <Sum label={foreign ? 'Subtotal in taka' : 'Subtotal'} value={taka(totals.subtotalBdt, 2)}
                            hint={foreign && rate > 0 ? `× ${rate} per ${f.currency}` : foreign ? 'Enter the exchange rate' : undefined} />
                        <Sum label="Shipping" value={taka(extra(f.shippingCost), 2)} muted={!extra(f.shippingCost)} />
                        <Sum label="Customs duty" value={taka(extra(f.customsDuty), 2)} muted={!extra(f.customsDuty)} />
                        <Sum label={f.otherCostLabel.trim() ? `Other — ${f.otherCostLabel.trim()}` : 'Other cost'} value={taka(extra(f.otherCost), 2)} muted={!extra(f.otherCost)} />
                        <Sum label="Discount" value={`− ${taka(extra(f.discount), 2)}`} muted={!extra(f.discount)} />
                        <div className="flex items-baseline justify-between border-t border-gray-100 pt-3">
                            <dt className="font-semibold text-gray-900">Grand total</dt>
                            <dd className={cx('text-xl font-semibold tabular-nums', totals.grandTotal < 0 ? 'text-red-600' : 'text-gray-900')}>{taka(totals.grandTotal, 2)}</dd>
                        </div>
                        {editing && purchase!.paid > 0 && (
                            <>
                                <Sum label="Already paid" value={taka(purchase!.paid, 2)} />
                                <Sum label="Due after saving" value={taka(Math.max(0, round2(totals.grandTotal - purchase!.paid)), 2)} />
                            </>
                        )}
                    </dl>
                </Card>
                <div className="flex flex-col gap-2">
                    {editing ? (
                        <>
                            <Btn variant="primary" icon={<LuSave size={15} />} onClick={() => save()} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Btn>
                            {purchase!.status === 'draft' && (
                                <Btn icon={<LuCircleCheck size={15} />} onClick={() => save('confirmed')} disabled={busy}>Save & confirm</Btn>
                            )}
                        </>
                    ) : (
                        <>
                            <Btn variant="primary" icon={<LuCircleCheck size={15} />} onClick={() => save('confirmed')} disabled={busy}>{busy ? 'Saving…' : 'Save & confirm'}</Btn>
                            <Btn icon={<LuSave size={15} />} onClick={() => save('draft')} disabled={busy}>Save as draft</Btn>
                        </>
                    )}
                    <Btn variant="ghost" onClick={cancel} disabled={busy}>Cancel</Btn>
                </div>
                <p className="flex items-start gap-1.5 text-xs text-gray-400">
                    <LuInfo size={13} className="mt-px shrink-0" />
                    {editing
                        ? 'Items and prices can change until goods are received.'
                        : 'A draft is not placed yet and stays out of the totals. Confirm it once the order is placed with the supplier.'}
                </p>
            </div>

            {quickAdd && (
                <SupplierFormModal
                    key={quickAdd.key}
                    onClose={() => setQuickAdd(null)}
                    onSaved={(s) => { set('supplier', s._id); setErrors((e) => ({ ...e, supplier: '' })); }}
                />
            )}
        </div>
    );
}

/* ─── Pieces ─────────────────────────────────────────────────────────── */

function SupplierHint({ s }: { s: Supplier }) {
    const bits = [
        s.contactPerson,
        s.phone,
        s.due > 0 ? `you owe ${taka(s.due)}` : null,
        s.openCount > 0 ? `${s.openCount} open PO${s.openCount === 1 ? '' : 's'}` : null,
    ].filter(Boolean);
    if (!s.isActive) return <span className="mt-1 block text-xs text-amber-600">This supplier is inactive — activate it on the Suppliers page to use it.</span>;
    return bits.length ? <span className="mt-1 block text-xs text-gray-400">{bits.join(' · ')}</span> : null;
}

function Sum({ label, value, hint, muted }: { label: string; value: React.ReactNode; hint?: string; muted?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="min-w-0 text-gray-500">
                {label}
                {hint && <span className="block text-xs text-gray-400">{hint}</span>}
            </dt>
            <dd className={cx('shrink-0 tabular-nums', muted ? 'text-gray-400' : 'text-gray-900')}>{value}</dd>
        </div>
    );
}

function MoneyField({ label, value, error, onChange }: { label: string; value: string; error?: string; onChange: (v: string) => void }) {
    return (
        <Field label={label} error={error}>
            <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">৳</span>
                <input className={cx(INPUT, 'pl-7', error && 'border-red-300')} type="number" inputMode="decimal" min={0} step="0.01" placeholder="0"
                    value={value} onChange={(e) => onChange(e.target.value)} />
            </div>
        </Field>
    );
}

function LineRow({ line, index, currency, rate, landed, errors, onChange, onRemove }: {
    line: Line;
    index: number;
    currency: PurchaseCurrency;
    rate: number;
    landed: number;
    errors: Record<string, string>;
    onChange: (patch: Partial<Line>) => void;
    onRemove: () => void;
}) {
    const q = Number(line.qty) > 0 ? Number(line.qty) : 0;
    const c = Number(line.unitCost) >= 0 ? Number(line.unitCost) : 0;
    const amount = round2(q * c);
    const foreign = currency !== 'BDT';
    const err = (k: string) => errors[`${line.key}.${k}`];

    return (
        <div className="grid gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_88px_120px_140px_36px] sm:items-start">
            <div className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-gray-500 sm:hidden">Item {index + 1}</span>
                <ProductPicker line={line} onChange={onChange} />
                {err('name') && <span className="mt-1 block text-xs text-red-600">{err('name')}</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:contents">
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500 sm:hidden">Qty{line.product ? ` (${unitShort(line.product.unit)})` : ''}</span>
                    <input aria-label="Quantity" className={cx(INPUT, 'text-right', err('qty') && 'border-red-300')} type="number" inputMode="numeric" min={1} step={1}
                        placeholder="0" value={line.qty} onChange={(e) => onChange({ qty: e.target.value })} />
                    {err('qty') && <span className="mt-1 block text-xs text-red-600">{err('qty')}</span>}
                </label>
                <label className="block">
                    <span className="mb-1 block text-xs font-medium text-gray-500 sm:hidden">Unit cost ({currencySymbol(currency)})</span>
                    <input aria-label="Unit cost" className={cx(INPUT, 'text-right', err('unitCost') && 'border-red-300')} type="number" inputMode="decimal" min={0} step="any"
                        placeholder="0.00" value={line.unitCost} onChange={(e) => onChange({ unitCost: e.target.value })} />
                    {err('unitCost') && <span className="mt-1 block text-xs text-red-600">{err('unitCost')}</span>}
                </label>
            </div>
            <div className="flex items-start justify-between gap-2 sm:block sm:pt-2 sm:text-right">
                <span className="text-xs font-medium text-gray-500 sm:hidden">Amount</span>
                <div className="text-right">
                    <p className="text-sm font-medium tabular-nums text-gray-900">{money(amount, currency)}</p>
                    {foreign && rate > 0 && <p className="text-xs tabular-nums text-gray-400">{taka(amount * rate)}</p>}
                    {q > 0 && landed > 0 && <p className="text-xs tabular-nums text-gray-400" title="Per unit, incl. its share of shipping, duty and other costs">landed {taka(landed, 2)}/u</p>}
                </div>
            </div>
            <div className="flex justify-end sm:pt-1">
                <button type="button" aria-label="Remove item" onClick={onRemove}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600">
                    <LuTrash2 size={15} />
                </button>
            </div>
        </div>
    );
}

/** Catalogue search, or a free-text name when the item isn't a product (yet). */
function ProductPicker({ line, onChange }: { line: Line; onChange: (patch: Partial<Line>) => void }) {
    const [focused, setFocused] = useState(false);
    const q = useDebounced(line.name.trim());
    const searching = focused && !line.product && q.length >= 2;
    const { data, isFetching } = useGetInventoryStockQuery({ search: q, sort: 'name', limit: 8 }, { skip: !searching });
    const results = searching ? data?.data || [] : [];

    if (line.product) {
        const p = line.product;
        return (
            <div className="rounded-xl border border-gray-200 p-2">
                <div className="flex items-center gap-2.5">
                    <Thumb src={p.thumbnail} size={36} />
                    <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sku || 'No SKU'} · {qty(p.stock)} {unitShort(p.unit)} in stock</p>
                    </div>
                    {p.status === 'draft' && <Badge tone="gray">Draft</Badge>}
                    <button type="button" aria-label="Unlink product" title="Unlink — keep it as a typed name"
                        onClick={() => onChange({ product: null, variantId: '' })}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                        <LuX size={14} />
                    </button>
                </div>
                {p.variants.length > 0 && (
                    <select aria-label="Variant" className={cx(INPUT, 'mt-2 h-9')} value={line.variantId} onChange={(e) => onChange({ variantId: e.target.value })}>
                        <option value="">Any variant — choose when the goods arrive</option>
                        {p.variants.map((v) => <option key={v._id} value={v._id}>{v.label} ({qty(v.stock)} in stock)</option>)}
                    </select>
                )}
            </div>
        );
    }

    return (
        <div className="relative">
            <LuSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
                aria-label="Item"
                className={cx(INPUT, 'pl-9')}
                placeholder="Search product or type an item name…"
                value={line.name}
                maxLength={200}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) => onChange({ name: e.target.value })}
            />
            {searching && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {isFetching && !results.length ? (
                        <p className="px-3 py-2.5 text-sm text-gray-500">Searching…</p>
                    ) : results.length ? results.map((r) => (
                        <button
                            key={r._id}
                            type="button"
                            // mousedown keeps the input from blurring (and closing the list) first
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                                onChange({
                                    product: {
                                        _id: r._id, name: r.name, sku: r.sku, unit: r.unit, thumbnail: r.thumbnail, status: r.status, stock: r.stock,
                                        variants: r.variants.map((v) => ({ _id: v._id, label: v.label, stock: v.stock })),
                                    },
                                    name: r.name,
                                    sku: r.sku,
                                    variantId: r.variants.length === 1 ? r.variants[0]._id : '',
                                });
                                setFocused(false);
                            }}
                            className="flex w-full items-center gap-2.5 border-t border-gray-100 px-3 py-2 text-left transition first:border-t-0 hover:bg-gray-50"
                        >
                            <Thumb src={r.thumbnail} size={32} />
                            <span className="min-w-0 flex-1">
                                <span className="line-clamp-1 text-sm font-medium text-gray-900">{r.name}</span>
                                <span className="block text-xs text-gray-400">
                                    {r.sku || 'No SKU'}{r.variants.length > 0 && ` · ${r.variants.length} variants`}
                                </span>
                            </span>
                            <span className="whitespace-nowrap text-xs text-gray-500">{qty(r.stock)} {unitShort(r.unit)}</span>
                        </button>
                    )) : (
                        <p className="px-3 py-2.5 text-sm text-gray-500">
                            No product matches — “{q}” will be saved as a typed item (stock not tracked).
                        </p>
                    )}
                </div>
            )}
            {!focused && line.name.trim() && (
                <span className="mt-1 block text-xs text-gray-400">Typed item — not linked to a product, so stock won&apos;t change.</span>
            )}
        </div>
    );
}
