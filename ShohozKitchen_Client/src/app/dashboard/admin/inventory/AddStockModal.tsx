"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { LuInfo, LuPackagePlus, LuSearch } from 'react-icons/lu';
import {
    Modal, Btn, Field, Segmented, Badge, INPUT, TEXTAREA, taka, cx,
} from '@/components/admin/ui';
import { useGetCategoriesQuery } from '@/redux/api/categoryApi';
import UnitSelect from '@/components/dashboard/UnitSelect';
import {
    useGetInventoryStockQuery, useStockInMutation, useQuickAddProductMutation, type StockRow,
} from '@/redux/api/inventoryApi';
import {
    unitShort, qty, PRODUCT_STATUS, editProductHref, errorMessage, useDebounced, parseWhole, parseMoney, Thumb,
} from './shared';

export type AddStockInit = {
    product?: StockRow;
    variantId?: string;
    mode?: 'existing' | 'new';
    name?: string;
};

type Cat = { _id: string; name: string; parent?: { _id: string } | string | null; order?: number };

/** Categories as an indented list: Kitchen, — Cookware, — — Pans … */
function categoryOptions(cats: Cat[]) {
    const pid = (c: Cat) => (c.parent ? String(typeof c.parent === 'object' ? c.parent._id : c.parent) : '');
    const byParent = new Map<string, Cat[]>();
    cats.forEach((c) => byParent.set(pid(c), [...(byParent.get(pid(c)) || []), c]));
    const out: { value: string; label: string }[] = [];
    const walk = (parent: string, depth: number) => {
        [...(byParent.get(parent) || [])]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
            .forEach((c) => {
                out.push({ value: String(c._id), label: `${'— '.repeat(depth)}${c.name}` });
                if (depth < 3) walk(String(c._id), depth + 1);
            });
    };
    walk('', 0);
    // A child whose parent is hidden/inactive still has to be pickable.
    const seen = new Set(out.map((o) => o.value));
    cats.filter((c) => !seen.has(String(c._id))).forEach((c) => out.push({ value: String(c._id), label: c.name }));
    return out;
}

/** The moving-average cost the server will compute (inventory.service stockIn). */
function nextAvgCost(p: StockRow, n: number, unitCost: number | undefined) {
    if (unitCost === undefined) return p.costPrice;
    const onHand = Math.max(0, p.stock);
    if (onHand <= 0 || p.costPrice <= 0) return unitCost;
    return Math.round(((onHand * p.costPrice + n * unitCost) / (onHand + n)) * 100) / 100;
}

export default function AddStockModal({ init, onClose }: { init: AddStockInit; onClose: () => void }) {
    const [mode, setMode] = useState<'existing' | 'new'>(init.mode || 'existing');

    /* ─── Existing product ─── */
    const [product, setProduct] = useState<StockRow | null>(init.product || null);
    const [variantId, setVariantId] = useState(init.variantId || '');
    const [search, setSearch] = useState('');
    const q = useDebounced(search.trim());
    const { data: found, isFetching: searching } = useGetInventoryStockQuery(
        { search: q, sort: 'name', limit: 8 },
        { skip: mode !== 'existing' || !!product || q.length < 2 },
    );
    const results = q.length >= 2 ? found?.data || [] : [];

    const [amount, setAmount] = useState('');
    const [cost, setCost] = useState('');
    const [note, setNote] = useState('');

    /* ─── New product (saved as a draft) ─── */
    const [np, setNp] = useState({ name: init.name || '', category: '', unit: 'piece', sku: '', price: '' });
    const { data: catData, isLoading: catsLoading } = useGetCategoriesQuery({}, { skip: mode !== 'new' });
    const cats = useMemo(() => categoryOptions((catData?.data || []) as Cat[]), [catData]);

    const [stockIn, { isLoading: savingIn }] = useStockInMutation();
    const [quickAdd, { isLoading: savingNew }] = useQuickAddProductMutation();
    const saving = savingIn || savingNew;

    const [errors, setErrors] = useState<Record<string, string>>({});

    const n = parseWhole(amount, mode === 'existing' ? 1 : 0);
    const unitCost = parseMoney(cost);
    const hasVariants = (product?.variants.length || 0) > 0;
    const variant = product?.variants.find((v) => v._id === variantId);

    const pick = (p: StockRow) => {
        setProduct(p);
        setVariantId(p.variants.length === 1 ? p.variants[0]._id : '');
        setSearch('');
        setErrors({});
    };

    const switchToNew = (name?: string) => {
        setMode('new');
        if (name) setNp((s) => ({ ...s, name }));
        setErrors({});
    };

    const submitExisting = async () => {
        const e: Record<string, string> = {};
        if (!product) e.product = 'Choose a product';
        if (product && hasVariants && !variantId) e.variant = 'Choose which variant you received';
        if (n === null) e.amount = 'Enter a whole number of at least 1';
        if (unitCost === null) e.cost = 'Enter a valid cost';
        setErrors(e);
        if (Object.keys(e).length || !product || n === null) return;
        try {
            const res = await stockIn({
                productId: product._id,
                ...(variantId ? { variantId } : {}),
                quantity: n,
                ...(typeof unitCost === 'number' ? { unitCost } : {}),
                ...(note.trim() ? { note: note.trim() } : {}),
            }).unwrap();
            const what = variant ? `${product.name} (${variant.label})` : product.name;
            toast.success(res?.reactivated
                ? `Added ${qty(n)} ${unitShort(product.unit)} to “${what}” — it is on sale again`
                : `Added ${qty(n)} ${unitShort(product.unit)} to “${what}”`);
            onClose();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not add stock'));
        }
    };

    const submitNew = async () => {
        const e: Record<string, string> = {};
        const price = parseMoney(np.price);
        if (np.name.trim().length < 2) e.name = 'Product name is required';
        if (!np.category) e.category = 'Choose a category';
        if (n === null) e.amount = 'Enter a whole number (0 or more)';
        if (unitCost === null) e.cost = 'Enter a valid cost';
        if (price === null) e.price = 'Enter a valid price';
        setErrors(e);
        if (Object.keys(e).length || n === null) return;
        try {
            const created = await quickAdd({
                name: np.name.trim(),
                category: np.category,
                unit: np.unit,
                quantity: n,
                ...(np.sku.trim() ? { sku: np.sku.trim() } : {}),
                ...(typeof unitCost === 'number' ? { unitCost } : {}),
                ...(typeof price === 'number' ? { price } : {}),
            }).unwrap();
            toast.success((t) => (
                <span>
                    “{created?.name || np.name.trim()}” saved as a draft with {qty(n)} {unitShort(np.unit)}.{' '}
                    {created?._id && (
                        <Link href={editProductHref(created._id)} onClick={() => toast.dismiss(t.id)} className="font-semibold underline">
                            Finish product
                        </Link>
                    )}
                </span>
            ), { duration: 6000 });
            onClose();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not create the product'));
        }
    };

    const footer = (
        <>
            <Btn onClick={onClose}>Cancel</Btn>
            {mode === 'existing' ? (
                <Btn variant="primary" onClick={submitExisting} disabled={saving}>
                    {savingIn ? 'Saving…' : 'Add stock'}
                </Btn>
            ) : (
                <Btn variant="primary" onClick={submitNew} disabled={saving} icon={<LuPackagePlus size={15} />}>
                    {savingNew ? 'Saving…' : 'Create draft & add stock'}
                </Btn>
            )}
        </>
    );

    return (
        <Modal
            open
            onClose={onClose}
            title="Add stock"
            subtitle="Record goods you received. The average cost updates automatically."
            footer={footer}
            width="max-w-xl"
        >
            <div className="mb-5">
                <Segmented
                    value={mode}
                    onChange={(v) => { setMode(v); setErrors({}); }}
                    options={[{ value: 'existing', label: 'Existing product' }, { value: 'new', label: 'New product' }]}
                />
            </div>

            {mode === 'existing' ? (
                <div className="space-y-4">
                    {product ? (
                        <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                            <Thumb src={product.thumbnail} size={44} />
                            <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 font-medium text-gray-900">{product.name}</p>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    {product.sku || 'No SKU'} · On hand {qty(product.stock)} {unitShort(product.unit)}
                                    {product.costPrice > 0 && <> · Avg cost {taka(product.costPrice, 2)}</>}
                                </p>
                            </div>
                            {product.status === 'draft' && <Badge tone="gray">Draft</Badge>}
                            <Btn variant="ghost" onClick={() => { setProduct(null); setVariantId(''); }}>Change</Btn>
                        </div>
                    ) : (
                        // Not <Field>: that is a <label>, and the result buttons can't live inside one.
                        <div>
                            <span className="mb-1.5 block text-sm font-medium text-gray-700">
                                Product<span className="text-red-500"> *</span>
                            </span>
                            <div className="relative">
                                <LuSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    aria-label="Search products"
                                    className={cx(INPUT, 'pl-9')}
                                    placeholder="Search by product name or SKU…"
                                    value={search}
                                    autoFocus
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            {q.length >= 2 && (
                                <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-gray-200">
                                    {searching && !results.length ? (
                                        <p className="px-3 py-3 text-sm text-gray-500">Searching…</p>
                                    ) : results.length ? results.map((p) => (
                                        <button
                                            key={p._id}
                                            type="button"
                                            onClick={() => pick(p)}
                                            className="flex w-full items-center gap-3 border-t border-gray-100 px-3 py-2 text-left transition first:border-t-0 hover:bg-gray-50"
                                        >
                                            <Thumb src={p.thumbnail} />
                                            <span className="min-w-0 flex-1">
                                                <span className="line-clamp-1 text-sm font-medium text-gray-900">{p.name}</span>
                                                <span className="block text-xs text-gray-400">
                                                    {p.sku || 'No SKU'}
                                                    {p.variants.length > 0 && <> · {p.variants.length} variants</>}
                                                </span>
                                            </span>
                                            {p.status !== 'active' && (
                                                <Badge tone={PRODUCT_STATUS[p.status]?.tone || 'gray'}>{PRODUCT_STATUS[p.status]?.label || p.status}</Badge>
                                            )}
                                            <span className="whitespace-nowrap text-sm text-gray-600">{qty(p.stock)} {unitShort(p.unit)}</span>
                                        </button>
                                    )) : (
                                        <div className="px-3 py-3 text-sm text-gray-500">
                                            No product matches “{q}”.{' '}
                                            <button type="button" onClick={() => switchToNew(q)} className="font-medium text-[var(--color-primary)] hover:underline">
                                                Create “{q}” as a new product
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                            {errors.product && <span className="mt-1 block text-xs text-red-600">{errors.product}</span>}
                            <span className="mt-2 block text-xs text-gray-400">
                                A new item that isn&apos;t in the catalogue yet?{' '}
                                <button type="button" onClick={() => switchToNew(search.trim() || undefined)} className="font-medium text-[var(--color-primary)] hover:underline">
                                    Add it as a new product
                                </button>
                            </span>
                        </div>
                    )}

                    {product && hasVariants && (
                        <Field label="Variant" required error={errors.variant}>
                            <select className={INPUT} value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                                <option value="">Choose a variant…</option>
                                {product.variants.map((v) => (
                                    <option key={v._id} value={v._id}>{v.label} — {qty(v.stock)} in stock</option>
                                ))}
                            </select>
                        </Field>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={`Quantity received${product ? ` (${unitShort(product.unit)})` : ''}`} required error={errors.amount}>
                            <input className={INPUT} type="number" inputMode="numeric" min={1} step={1} placeholder="0"
                                value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </Field>
                        <Field
                            label="Unit cost (৳)"
                            error={errors.cost}
                            hint={product?.costPrice ? `Current average ${taka(product.costPrice, 2)} — leave empty to keep it` : 'What you paid per unit'}
                        >
                            <input className={INPUT} type="number" inputMode="decimal" min={0} step="0.01" placeholder="Optional"
                                value={cost} onChange={(e) => setCost(e.target.value)} />
                        </Field>
                    </div>

                    <Field label="Note" hint="Supplier, invoice or challan number…">
                        <textarea className={TEXTAREA} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
                    </Field>

                    {product && n !== null && unitCost !== null && (
                        <div className="rounded-xl bg-[var(--color-primary-lightest)] px-4 py-3 text-sm text-gray-700">
                            After this:{' '}
                            <strong className="font-semibold text-gray-900">{qty(product.stock + n)} {unitShort(product.unit)}</strong> on hand
                            {variant && <> ({variant.label}: {qty(variant.stock + n)})</>}
                            {nextAvgCost(product, n, unitCost) > 0 && (
                                <> · avg cost <strong className="font-semibold text-gray-900">{taka(nextAvgCost(product, n, unitCost), 2)}</strong></>
                            )}
                            {product.status === 'out-of-stock' && <span className="mt-1 block text-xs text-gray-500">The product is marked Out of stock — adding stock puts it back on sale.</span>}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <LuInfo size={17} className="mt-0.5 shrink-0" />
                        <p>
                            The product is created as a <strong className="font-semibold">Draft</strong> with a placeholder photo — shoppers
                            can&apos;t see it yet. Finish it on the Products page (photos, description, price) and publish it when ready.
                        </p>
                    </div>

                    <Field label="Product name" required error={errors.name}>
                        <input className={INPUT} maxLength={200} value={np.name} autoFocus
                            onChange={(e) => setNp({ ...np, name: e.target.value })} placeholder="e.g. Non-stick Fry Pan 28 cm" />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Category" required error={errors.category}>
                            <select className={INPUT} value={np.category} onChange={(e) => setNp({ ...np, category: e.target.value })}>
                                <option value="">{catsLoading ? 'Loading…' : 'Choose a category…'}</option>
                                {cats.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </Field>
                        <Field label="Unit">
                            {/* Same list as the product form; "+ Add new unit…" adds one to Units. */}
                            <UnitSelect className={INPUT} value={np.unit} onChange={(unit) => setNp((prev) => ({ ...prev, unit }))} />
                        </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label={`Quantity (${unitShort(np.unit)})`} required error={errors.amount}>
                            <input className={INPUT} type="number" inputMode="numeric" min={0} step={1} placeholder="0"
                                value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </Field>
                        <Field label="Unit cost (৳)" error={errors.cost}>
                            <input className={INPUT} type="number" inputMode="decimal" min={0} step="0.01" placeholder="Optional"
                                value={cost} onChange={(e) => setCost(e.target.value)} />
                        </Field>
                        <Field label="Selling price (৳)" error={errors.price}>
                            <input className={INPUT} type="number" inputMode="decimal" min={0} step="0.01" placeholder="Optional"
                                value={np.price} onChange={(e) => setNp({ ...np, price: e.target.value })} />
                        </Field>
                    </div>

                    <Field label="SKU" hint="Leave empty to generate one">
                        <input className={INPUT} maxLength={60} value={np.sku} onChange={(e) => setNp({ ...np, sku: e.target.value })} />
                    </Field>
                </div>
            )}
        </Modal>
    );
}
