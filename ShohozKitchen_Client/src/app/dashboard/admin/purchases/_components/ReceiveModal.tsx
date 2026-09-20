"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { LuInfo, LuPackageCheck, LuTriangleAlert, LuWarehouse } from 'react-icons/lu';
import { Modal, Btn, Field, Toggle, INPUT, TEXTAREA, taka, cx } from '@/components/admin/ui';
import {
    useGetPurchaseDetailQuery, useReceivePurchaseGoodsMutation, type Purchase, type PurchaseItem,
} from '@/redux/api/purchaseApi';
import { useGetWarehousesQuery } from '@/redux/api/warehouseApi';
import { errorMessage, qty, unitShort } from '@/app/dashboard/admin/inventory/shared';
import { dhakaDay } from './shared';

const LAST_WAREHOUSE_KEY = 'sk.purchases.lastWarehouse';
const SKIP = '__skip__';

function readLastWarehouse() {
    try { return window.localStorage.getItem(LAST_WAREHOUSE_KEY) || ''; } catch { return ''; }
}
function saveLastWarehouse(id: string) {
    try { window.localStorage.setItem(LAST_WAREHOUSE_KEY, id); } catch { /* private window */ }
}

/** Goods arrived: pick the warehouse, count what came, and (by default) add it to product stock. */
export default function ReceiveModal({ id, onClose }: { id: string; onClose: () => void }) {
    const { data: purchase, isLoading, isError, refetch } = useGetPurchaseDetailQuery(id, { refetchOnMountOrArgChange: true });

    if (!purchase) {
        return (
            <Modal open onClose={onClose} title="Receive goods" width="max-w-3xl">
                {isLoading || !isError ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />)}
                    </div>
                ) : (
                    <div className="py-8 text-center text-sm text-gray-500">
                        <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
                        Couldn&apos;t load the purchase.
                        <div className="mt-3"><Btn onClick={() => refetch()}>Try again</Btn></div>
                    </div>
                )}
            </Modal>
        );
    }
    return <ReceiveForm key={purchase.updatedAt} purchase={purchase} onClose={onClose} />;
}

type Line = { qty: string; variantId: string };

/** What a line needs before its stock can be added: a variant, when the product has variants. */
const needsVariant = (item: PurchaseItem) =>
    !!item.product && !item.product.isDeleted && item.product.variants.length > 0 && !item.variantId;

function ReceiveForm({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) {
    const [today] = useState(() => dhakaDay());
    const open = useMemo(() => purchase.items.filter((i) => i.remaining > 0), [purchase.items]);
    const done = purchase.items.length - open.length;

    const { data: warehouses = [], isLoading: whLoading, isError: whError } = useGetWarehousesQuery({ scope: 'active' });
    const [lastWarehouse] = useState(readLastWarehouse);
    const [warehouseChoice, setWarehouse] = useState('');
    const warehouse = warehouseChoice
        || (warehouses.some((w) => w._id === lastWarehouse) ? lastWarehouse : warehouses[0]?._id || '');

    const [date, setDate] = useState(today);
    const [addToStock, setAddToStock] = useState(true);
    const [note, setNote] = useState('');
    const [lines, setLines] = useState<Record<string, Line>>(() => Object.fromEntries(open.map((i) => [i._id, {
        qty: String(i.remaining),
        variantId: i.variantId || (i.product && i.product.variants.length === 1 ? i.product.variants[0]._id : ''),
    }])));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [receive, { isLoading: saving }] = useReceivePurchaseGoodsMutation();

    const setLine = (itemId: string, patch: Partial<Line>) => setLines((l) => ({ ...l, [itemId]: { ...l[itemId], ...patch } }));
    const fillAll = (all: boolean) => setLines((l) => Object.fromEntries(open.map((i) => [i._id, { ...l[i._id], qty: all ? String(i.remaining) : '' }])));

    const parsed = open.map((item) => {
        const l = lines[item._id] || { qty: '', variantId: '' };
        const n = l.qty.trim() === '' ? 0 : Number(l.qty);
        return { item, line: l, n };
    });
    const units = parsed.reduce((s, p) => s + (Number.isInteger(p.n) && p.n > 0 ? p.n : 0), 0);

    /** A one-line plain-language preview of what happens to stock for this line. */
    const preview = (item: PurchaseItem, l: Line, n: number) => {
        if (!(Number.isInteger(n) && n > 0)) return null;
        if (!addToStock) return { tone: 'muted', text: 'Received without touching stock' };
        if (!item.product) return { tone: 'muted', text: 'Not in the catalogue — stock is not tracked' };
        if (item.product.isDeleted) return { tone: 'warn', text: 'The product was deleted — stock will not be added' };
        if (l.variantId === SKIP) return { tone: 'muted', text: 'Received without adding to stock' };
        if (needsVariant(item) && !l.variantId) return { tone: 'warn', text: 'Choose which variant arrived' };
        const v = item.product.variants.find((x) => x._id === (item.variantId || l.variantId));
        const what = `${item.product.name}${v ? ` (${v.label})` : item.variantLabel ? ` (${item.variantLabel})` : ''}`;
        return {
            tone: 'ok',
            text: item.landedUnitCost > 0
                ? `Adds ${qty(n)} ${unitShort(item.unit || item.product.unit)} to ${what} stock at ${taka(item.landedUnitCost, 2)} each`
                : `Adds ${qty(n)} ${unitShort(item.unit || item.product.unit)} to ${what} stock (no cost — the average cost stays as it is)`,
        };
    };

    const submit = async () => {
        const errs: Record<string, string> = {};
        if (!warehouse) errs.warehouse = 'Choose the warehouse the goods went into';
        if (!date) errs.date = 'Pick the date';
        else if (date > today) errs.date = 'The date cannot be in the future';
        for (const { item, line, n } of parsed) {
            if (line.qty.trim() === '' || n === 0) continue;
            if (!Number.isInteger(n) || n < 0) errs[item._id] = 'Enter a whole number';
            else if (n > item.remaining) errs[item._id] = `Only ${qty(item.remaining)} left to receive`;
            else if (addToStock && needsVariant(item) && !line.variantId) errs[item._id] = 'Choose the variant, or “Don’t add to stock”';
        }
        if (!units && !Object.keys(errs).some((k) => open.some((i) => i._id === k))) errs.lines = 'Enter how many arrived for at least one item';
        setErrors(errs);
        if (Object.keys(errs).length) {
            toast.error('Check the highlighted fields');
            return;
        }

        const body = parsed
            .filter((p) => Number.isInteger(p.n) && p.n > 0)
            .map(({ item, line, n }) => ({
                itemId: item._id,
                qty: n,
                ...(line.variantId && line.variantId !== SKIP && !item.variantId ? { variantId: line.variantId } : {}),
                ...(line.variantId === SKIP ? { skipStock: true } : {}),
            }));
        try {
            const res = await receive({
                id: purchase._id,
                warehouse,
                date,
                addToStock,
                ...(note.trim() ? { note: note.trim() } : {}),
                lines: body,
            }).unwrap();
            saveLastWarehouse(warehouse);
            const where = warehouses.find((w) => w._id === warehouse)?.name || 'the warehouse';
            const stocked = res?.stocked?.length || 0;
            toast.success(`Received ${qty(units)} unit${units === 1 ? '' : 's'} into ${where}${stocked ? ` · stock updated for ${stocked} line${stocked === 1 ? '' : 's'}` : ''}`, { duration: 5000 });
            res?.warnings?.forEach((w) => toast.error(w, { duration: 9000 }));
            onClose();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not receive the goods'), { duration: 6000 });
        }
    };

    const noWarehouse = !whLoading && warehouses.length === 0;

    return (
        <Modal
            open
            onClose={onClose}
            title={`Receive goods · ${purchase.reference}`}
            subtitle={`${purchase.supplier?.name || 'Supplier'} · ${qty(purchase.receivedQty)} of ${qty(purchase.totalQty)} units received so far`}
            width="max-w-3xl"
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" icon={<LuPackageCheck size={15} />} onClick={submit} disabled={saving || noWarehouse || !open.length}>
                    {saving ? 'Saving…' : units ? `Receive ${qty(units)} unit${units === 1 ? '' : 's'}` : 'Receive'}
                </Btn>
            </>}
        >
            {!open.length ? (
                <p className="py-8 text-center text-sm text-gray-500">Everything on this purchase has already been received.</p>
            ) : (
                <div className="space-y-5">
                    {noWarehouse ? (
                        <div className="flex gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                            <LuWarehouse size={17} className="mt-0.5 shrink-0" />
                            <p>
                                {whError ? 'The warehouse list could not be loaded.' : 'There is no active warehouse yet.'}{' '}
                                Goods are received into a warehouse —{' '}
                                <Link href="/dashboard/admin/warehouses" className="font-semibold underline">add one on the Warehouses page</Link> first.
                            </p>
                        </div>
                    ) : null}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Warehouse" required error={errors.warehouse}>
                            <select className={INPUT} value={warehouse} onChange={(e) => setWarehouse(e.target.value)} disabled={whLoading || noWarehouse}>
                                {whLoading && <option value="">Loading…</option>}
                                {!whLoading && !warehouses.length && <option value="">No warehouses</option>}
                                {warehouses.map((w) => <option key={w._id} value={w._id}>{w.name}{w.location ? ` — ${w.location}` : ''}</option>)}
                            </select>
                        </Field>
                        <Field label="Date received" required error={errors.date}>
                            <input className={INPUT} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
                        </Field>
                    </div>

                    <div>
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-700">What arrived</p>
                            <div className="flex gap-1">
                                <Btn variant="ghost" className="h-8 px-3 text-xs" onClick={() => fillAll(true)}>All remaining</Btn>
                                <Btn variant="ghost" className="h-8 px-3 text-xs" onClick={() => fillAll(false)}>Clear</Btn>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                            {parsed.map(({ item, line, n }) => {
                                const p = preview(item, line, n);
                                return (
                                    <div key={item._id} className="p-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-gray-900">
                                                    {item.name}
                                                    {item.variantLabel && <span className="font-normal text-gray-500"> · {item.variantLabel}</span>}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Ordered {qty(item.qty)} · received {qty(item.receivedQty)} ·{' '}
                                                    <span className="font-medium text-gray-600">{qty(item.remaining)} left</span>
                                                    {item.sku && <> · {item.sku}</>}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2 sm:w-[300px] sm:flex-row">
                                                {addToStock && needsVariant(item) && (
                                                    <select
                                                        aria-label={`Variant of ${item.name}`}
                                                        className={cx(INPUT, 'h-9 sm:w-40')}
                                                        value={line.variantId}
                                                        onChange={(e) => setLine(item._id, { variantId: e.target.value })}
                                                    >
                                                        <option value="">Variant…</option>
                                                        {item.product!.variants.map((v) => <option key={v._id} value={v._id}>{v.label} ({qty(v.stock)})</option>)}
                                                        <option value={SKIP}>Don&apos;t add to stock</option>
                                                    </select>
                                                )}
                                                <div className="flex items-center gap-2 sm:ml-auto">
                                                    <input
                                                        aria-label={`Quantity of ${item.name} received`}
                                                        className={cx(INPUT, 'h-9 w-full text-right sm:w-24', errors[item._id] && 'border-red-300')}
                                                        type="number"
                                                        inputMode="numeric"
                                                        min={0}
                                                        max={item.remaining}
                                                        step={1}
                                                        placeholder="0"
                                                        value={line.qty}
                                                        onChange={(e) => setLine(item._id, { qty: e.target.value })}
                                                    />
                                                    <span className="w-10 shrink-0 text-xs text-gray-400">{unitShort(item.unit || item.product?.unit)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {errors[item._id] ? (
                                            <p className="mt-1.5 text-xs text-red-600">{errors[item._id]}</p>
                                        ) : p ? (
                                            <p className={cx('mt-1.5 text-xs', p.tone === 'ok' ? 'text-emerald-700' : p.tone === 'warn' ? 'text-amber-700' : 'text-gray-400')}>{p.text}</p>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                        {errors.lines && <p className="mt-1.5 text-xs text-red-600">{errors.lines}</p>}
                        {done > 0 && <p className="mt-2 text-xs text-gray-400">{done} item{done === 1 ? ' is' : 's are'} already fully received.</p>}
                    </div>

                    <div className="rounded-xl border border-gray-200 px-4 py-2">
                        <Toggle label="Add to product stock" checked={addToStock} onChange={setAddToStock} />
                        <p className="flex items-start gap-1.5 pb-1 text-xs text-gray-500">
                            <LuInfo size={13} className="mt-px shrink-0" />
                            {addToStock
                                ? 'Stock goes up at the landed cost (unit cost × rate plus its share of shipping, duty and other costs), the average cost updates and the stock ledger notes this purchase.'
                                : 'Only the receipt is recorded — product stock stays as it is. Use this when the stock was already counted on the Inventory page.'}
                        </p>
                    </div>

                    <Field label="Note" hint="Challan number, condition of the goods…">
                        <textarea className={TEXTAREA} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
                    </Field>
                </div>
            )}
        </Modal>
    );
}
