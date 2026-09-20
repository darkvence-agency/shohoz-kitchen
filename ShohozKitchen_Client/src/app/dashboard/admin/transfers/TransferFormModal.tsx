"use client";

import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuArrowLeftRight, LuInfo, LuPlus, LuSearch, LuTrash2, LuWarehouse } from 'react-icons/lu';
import { Modal, Btn, Field, Badge, INPUT, TEXTAREA, cx } from '@/components/admin/ui';
import { useGetProductsQuery } from '@/redux/api/productApi';
import { useGetWarehousesQuery, type Warehouse } from '@/redux/api/warehouseApi';
import {
    useCreateTransferMutation, useUpdateTransferMutation, type Transfer, type TransferInput,
} from '@/redux/api/transferApi';
import { Thumb, dhakaDayOf, dhakaToday, errMsg, parseQty, plural, qty, unitShort, useDebounced } from './shared';

type PickedProduct = { _id: string; name: string; sku?: string; thumbnail?: string; unit?: string; stock?: number; status?: string };

type Line = {
    key: string;
    product: PickedProduct | null;   // null = free-text item
    name: string;                    // free-text name
    qty: string;
};

type LineErrors = Record<string, { name?: string; qty?: string }>;

let seq = 0;
const newKey = () => `l${Date.now()}${seq++}`;

const linesFrom = (t: Transfer | null): Line[] =>
    (t?.items || []).map((it) => {
        const id = it.product && typeof it.product === 'object' ? it.product._id : it.product;
        return {
            key: newKey(),
            product: id ? { _id: String(id), name: it.name, sku: it.sku, unit: it.unit } : null,
            name: id ? '' : it.name,
            qty: String(it.qty),
        };
    });

const whLabel = (w: Warehouse) => `${w.name}${w.location ? ` — ${w.location}` : ''}${w.isActive ? '' : ' (inactive)'}`;

export default function TransferFormModal({ transfer, onClose, onCreated }: {
    transfer: Transfer | null;
    onClose: () => void;
    /** Called with the new transfer after a create. */
    onCreated?: (t: Transfer) => void;
}) {
    const editing = !!transfer;
    const today = useMemo(() => dhakaToday(), []);

    /* ─── Warehouses ─── */
    const { data: warehouses = [], isLoading: whLoading, isError: whError, refetch: whRefetch } = useGetWarehousesQuery({ scope: 'all' });
    const currentFrom = transfer?.from?._id || '';
    const currentTo = transfer?.to?._id || '';
    // Active ones, plus (when editing) the transfer's own warehouses even if deactivated since.
    const options = warehouses.filter((w) => w.isActive || w._id === currentFrom || w._id === currentTo);
    const activeCount = warehouses.filter((w) => w.isActive).length;

    const [from, setFrom] = useState(currentFrom);
    const [to, setTo] = useState(currentTo);
    const [day, setDay] = useState(transfer ? dhakaDayOf(transfer.transferredAt) : today);
    const [note, setNote] = useState(transfer?.note || '');
    const [lines, setLines] = useState<Line[]>(() => linesFrom(transfer));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [lineErrors, setLineErrors] = useState<LineErrors>({});
    const [focusKey, setFocusKey] = useState<string | null>(null);

    /* ─── Product search ─── */
    const [search, setSearch] = useState('');
    const q = useDebounced(search.trim());
    const { data: found, isFetching: searching, isError: searchError } = useGetProductsQuery(
        // Drafts too: goods can move before the product is published.
        { includeDrafts: true, searchTerm: q, limit: 8, page: 1 },
        { skip: q.length < 2 },
    );
    const results: PickedProduct[] = q.length >= 2 ? ((found?.data as PickedProduct[] | undefined) || []) : [];

    const [createTransfer, { isLoading: creating }] = useCreateTransferMutation();
    const [updateTransfer, { isLoading: updating }] = useUpdateTransferMutation();
    const saving = creating || updating;

    const clearErr = (k: string) => errors[k] && setErrors((e) => ({ ...e, [k]: '' }));

    const addProduct = (p: PickedProduct) => {
        const existing = lines.find((l) => l.product?._id === p._id);
        if (existing) {
            setLines((ls) => ls.map((l) => (l.key === existing.key ? { ...l, qty: String((parseQty(l.qty) || 0) + 1) } : l)));
            toast(`“${p.name}” is already on the list — quantity +1`);
            setFocusKey(existing.key);
        } else {
            const key = newKey();
            setLines((ls) => [...ls, { key, product: p, name: '', qty: '1' }]);
            setFocusKey(key);
        }
        setSearch('');
        clearErr('items');
    };

    const addFreeText = (name = '') => {
        const key = newKey();
        setLines((ls) => [...ls, { key, product: null, name, qty: '1' }]);
        setFocusKey(key);
        setSearch('');
        clearErr('items');
    };

    const patchLine = (key: string, patch: Partial<Line>) => {
        setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
        if (lineErrors[key]) setLineErrors((e) => ({ ...e, [key]: {} }));
    };
    const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

    const swap = () => { setFrom(to); setTo(from); clearErr('to'); };

    const units = lines.reduce((n, l) => n + (parseQty(l.qty) || 0), 0);

    const validate = () => {
        const e: Record<string, string> = {};
        const le: LineErrors = {};
        if (!from) e.from = 'Choose where the goods leave from';
        if (!to) e.to = 'Choose where the goods go';
        if (from && to && from === to) e.to = 'From and To must be different warehouses';
        if (!day) e.day = 'Choose the transfer date';
        else if (day > today) e.day = 'The date can’t be in the future';
        if (!lines.length) e.items = 'Add at least one item';
        lines.forEach((l) => {
            const x: { name?: string; qty?: string } = {};
            if (!l.product && !l.name.trim()) x.name = 'Type the item name';
            if (parseQty(l.qty) === null) x.qty = 'Whole number, 1 or more';
            if (x.name || x.qty) le[l.key] = x;
        });
        if (note.trim().length > 500) e.note = 'Note is too long (max 500 characters)';
        setErrors(e);
        setLineErrors(le);
        return !Object.keys(e).length && !Object.keys(le).length;
    };

    const submit = async () => {
        if (!validate()) {
            toast.error('Check the highlighted fields');
            return;
        }
        const body: TransferInput = {
            from,
            to,
            items: lines.map((l) => (l.product
                ? { product: l.product._id, name: l.product.name, qty: parseQty(l.qty) as number }
                : { product: null, name: l.name.trim(), qty: parseQty(l.qty) as number })),
            transferredAt: day,
            note: note.trim(),
        };
        const route = `${warehouses.find((w) => w._id === from)?.name || 'From'} → ${warehouses.find((w) => w._id === to)?.name || 'To'}`;
        try {
            if (transfer) {
                await updateTransfer({ id: transfer._id, ...body }).unwrap();
                toast.success(`${transfer.reference} updated`);
            } else {
                const created = await createTransfer(body).unwrap();
                toast.success(`${created?.reference || 'Transfer'} recorded — ${route}, ${plural(units, 'unit')}`);
                if (created) onCreated?.(created);
            }
            onClose();
        } catch (err) {
            toast.error(errMsg(err, 'Could not save the transfer'), { duration: 6000 });
        }
    };

    const notEnough = !editing && !whLoading && !whError && activeCount < 2;

    return (
        <Modal
            open
            onClose={onClose}
            title={editing ? `Edit ${transfer?.reference}` : 'New transfer'}
            subtitle={editing ? 'Route, date and items can change while the goods are in transit.' : 'Record goods sent from one warehouse to another.'}
            width="max-w-2xl"
            footer={notEnough ? <Btn onClick={onClose}>Close</Btn> : <>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" onClick={submit} disabled={saving || whLoading}>
                    {saving ? 'Saving…' : editing ? 'Save changes' : 'Record transfer'}
                </Btn>
            </>}
        >
            {whError ? (
                <div className="py-8 text-center text-sm text-gray-500">
                    Couldn&apos;t load the warehouses.
                    <div className="mt-3"><Btn onClick={() => whRefetch()}>Retry</Btn></div>
                </div>
            ) : notEnough ? (
                <div className="py-6 text-center">
                    <LuWarehouse size={30} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-900">You need at least two active warehouses</p>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
                        {activeCount === 0 ? 'You have none yet.' : 'You have one.'} Add the godowns you move goods between, then come back here.
                    </p>
                    <div className="mt-4"><Btn variant="primary" href="/dashboard/admin/warehouses" icon={<LuPlus size={15} />}>Go to Warehouses</Btn></div>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* ─── Route ─── */}
                    <div className="grid items-start gap-3 sm:grid-cols-[1fr_auto_1fr]">
                        <Field label="From" required error={errors.from}>
                            <select className={INPUT} value={from} disabled={whLoading}
                                onChange={(e) => { setFrom(e.target.value); clearErr('from'); clearErr('to'); }}>
                                <option value="">{whLoading ? 'Loading…' : 'Choose a warehouse…'}</option>
                                {options.map((w) => <option key={w._id} value={w._id} disabled={w._id === to}>{whLabel(w)}</option>)}
                            </select>
                        </Field>
                        <button
                            type="button"
                            onClick={swap}
                            aria-label="Swap From and To"
                            title="Swap"
                            className="mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 sm:mt-7"
                        >
                            <LuArrowLeftRight size={15} className="rotate-90 sm:rotate-0" />
                        </button>
                        <Field label="To" required error={errors.to}>
                            <select className={INPUT} value={to} disabled={whLoading}
                                onChange={(e) => { setTo(e.target.value); clearErr('to'); }}>
                                <option value="">{whLoading ? 'Loading…' : 'Choose a warehouse…'}</option>
                                {options.map((w) => <option key={w._id} value={w._id} disabled={w._id === from}>{whLabel(w)}</option>)}
                            </select>
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Transfer date" required error={errors.day} hint="The day the goods left">
                            <input type="date" className={INPUT} value={day} max={today}
                                onChange={(e) => { setDay(e.target.value); clearErr('day'); }} />
                        </Field>
                    </div>

                    {/* ─── Items ─── */}
                    <div>
                        <div className="mb-1.5 flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium text-gray-700">Items<span className="text-red-500"> *</span></span>
                            {lines.length > 0 && <span className="text-xs text-gray-500">{plural(lines.length, 'line')} · {plural(units, 'unit')}</span>}
                        </div>

                        {lines.length > 0 && (
                            <ul className="mb-3 divide-y divide-gray-100 rounded-xl border border-gray-200">
                                {lines.map((l) => {
                                    const le = lineErrors[l.key] || {};
                                    return (
                                        <li key={l.key} className="flex flex-wrap items-start gap-3 px-3 py-2.5">
                                            <Thumb src={l.product?.thumbnail} size={36} />
                                            <div className="min-w-0 flex-1 basis-[160px]">
                                                {l.product ? (
                                                    <>
                                                        <p className="line-clamp-2 text-sm font-medium text-gray-900 [overflow-wrap:anywhere]">{l.product.name}</p>
                                                        <p className="mt-0.5 text-xs text-gray-400">
                                                            {l.product.sku || 'No SKU'}
                                                            {typeof l.product.stock === 'number' && <> · {qty(l.product.stock)} {unitShort(l.product.unit) || 'PC'} in stock (all locations)</>}
                                                        </p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <input
                                                            aria-label="Item name"
                                                            className={cx(INPUT, 'h-9', le.name && 'border-red-300')}
                                                            placeholder="Item name, e.g. Carton boxes"
                                                            maxLength={200}
                                                            value={l.name}
                                                            autoFocus={focusKey === l.key}
                                                            onChange={(e) => patchLine(l.key, { name: e.target.value })}
                                                        />
                                                        {le.name ? <p className="mt-1 text-xs text-red-600">{le.name}</p>
                                                            : <p className="mt-1 text-xs text-gray-400">Not in the catalogue</p>}
                                                    </>
                                                )}
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <div className="w-24">
                                                    <input
                                                        aria-label="Quantity"
                                                        className={cx(INPUT, 'h-9 text-right tabular-nums', le.qty && 'border-red-300')}
                                                        type="number"
                                                        inputMode="numeric"
                                                        min={1}
                                                        step={1}
                                                        value={l.qty}
                                                        autoFocus={!!l.product && focusKey === l.key}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => patchLine(l.key, { qty: e.target.value })}
                                                    />
                                                    {le.qty && <p className="mt-1 text-xs text-red-600">{le.qty}</p>}
                                                </div>
                                                <span className="mt-2.5 w-9 text-xs text-gray-400">{l.product ? unitShort(l.product.unit) || 'PC' : ''}</span>
                                                <button
                                                    type="button"
                                                    aria-label="Remove line"
                                                    onClick={() => removeLine(l.key)}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                                                >
                                                    <LuTrash2 size={15} />
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {/* Not <Field>: that is a <label>, and the result buttons can't live inside one. */}
                        <div className="relative">
                            <LuSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                aria-label="Search products to add"
                                className={cx(INPUT, 'pl-9', errors.items && 'border-red-300')}
                                placeholder={lines.length ? 'Add another product…' : 'Search a product by name…'}
                                value={search}
                                autoFocus={!editing && lines.length === 0 && !!from}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (results[0]) addProduct(results[0]);
                                    }
                                }}
                            />
                        </div>
                        {q.length >= 2 && (
                            <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200">
                                {searching && !results.length ? (
                                    <p className="px-3 py-3 text-sm text-gray-500">Searching…</p>
                                ) : searchError ? (
                                    <p className="px-3 py-3 text-sm text-red-600">Search failed. Check your connection and type again.</p>
                                ) : results.length ? results.map((p) => {
                                    const onList = lines.some((l) => l.product?._id === p._id);
                                    return (
                                        <button
                                            key={p._id}
                                            type="button"
                                            onClick={() => addProduct(p)}
                                            className="flex w-full items-center gap-3 border-t border-gray-100 px-3 py-2 text-left transition first:border-t-0 hover:bg-gray-50"
                                        >
                                            <Thumb src={p.thumbnail} />
                                            <span className="min-w-0 flex-1">
                                                <span className="line-clamp-1 text-sm font-medium text-gray-900">{p.name}</span>
                                                <span className="block text-xs text-gray-400">{p.sku || 'No SKU'}</span>
                                            </span>
                                            {p.status === 'draft' && <Badge tone="gray">Draft</Badge>}
                                            {onList && <Badge tone="blue">On the list</Badge>}
                                            {typeof p.stock === 'number' && (
                                                <span className="whitespace-nowrap text-xs text-gray-500">{qty(p.stock)} {unitShort(p.unit) || 'PC'}</span>
                                            )}
                                        </button>
                                    );
                                }) : (
                                    <div className="px-3 py-3 text-sm text-gray-500">
                                        No product matches “{q}”.{' '}
                                        <button type="button" onClick={() => addFreeText(q)} className="font-medium text-[var(--color-primary)] hover:underline">
                                            Add “{q}” as a free-text item
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {errors.items && <p className="mt-1 text-xs text-red-600">{errors.items}</p>}
                        <button
                            type="button"
                            onClick={() => addFreeText()}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
                        >
                            <LuPlus size={13} /> Add an item that isn&apos;t in the catalogue
                        </button>
                    </div>

                    <Field label="Note" error={errors.note} hint="Vehicle, driver, challan number…">
                        <textarea className={TEXTAREA} rows={2} maxLength={500} value={note}
                            onChange={(e) => { setNote(e.target.value); clearErr('note'); }} />
                    </Field>

                    <div className="flex gap-2.5 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
                        <LuInfo size={15} className="mt-px shrink-0 text-gray-400" />
                        <p>A transfer is a record only. Product stock and the inventory ledger don&apos;t change — stock stays one total per product.</p>
                    </div>
                </div>
            )}
        </Modal>
    );
}
