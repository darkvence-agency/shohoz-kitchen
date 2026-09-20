"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Modal, Btn, Field, Segmented, INPUT, TEXTAREA, cx } from '@/components/admin/ui';
import { useAdjustStockMutation, type StockRow } from '@/redux/api/inventoryApi';
import { unitShort, qty, signed, errorMessage, parseWhole, Thumb } from './shared';

type Mode = 'set' | 'remove';

const REASONS: Record<Mode, string[]> = {
    set: ['Stock count', 'Correction', 'Other'],
    remove: ['Damaged', 'Lost or stolen', 'Expired', 'Returned to supplier', 'Used in-house', 'Other'],
};

export default function AdjustStockModal({ row, variantId: initialVariant, onClose }: {
    row: StockRow;
    variantId?: string;
    onClose: () => void;
}) {
    const [variantId, setVariantId] = useState(initialVariant || (row.variants.length === 1 ? row.variants[0]._id : ''));
    const [mode, setMode] = useState<Mode>('set');
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState(REASONS.set[0]);
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [adjust, { isLoading }] = useAdjustStockMutation();

    const hasVariants = row.variants.length > 0;
    const variant = row.variants.find((v) => v._id === variantId);
    const current = hasVariants ? (variant ? variant.stock : null) : row.stock;
    const n = parseWhole(amount, mode === 'remove' ? 1 : 0);
    const next = current === null || n === null ? null : mode === 'set' ? n : current - n;
    // For a product with variants the server sets the sellable total to the sum of the
    // variants after the change (inventory.service adjust) — preview the same.
    const nextTotal = variant && next !== null
        ? row.variants.reduce((s, v) => s + Math.max(0, v._id === variant._id ? next : v.stock), 0)
        : null;
    const unit = unitShort(row.unit);

    const changeMode = (m: Mode) => {
        setMode(m);
        setReason(REASONS[m][0]);
        setErrors({});
    };

    const submit = async () => {
        const e: Record<string, string> = {};
        if (hasVariants && !variantId) e.variant = 'Choose a variant';
        if (n === null) e.amount = mode === 'remove' ? 'Enter a whole number of at least 1' : 'Enter a whole number (0 or more)';
        else if (next !== null && next < 0) e.amount = `Only ${qty(current)} in stock`;
        else if (next !== null && next === current && (nextTotal === null || nextTotal === row.stock)) e.amount = `The count is already ${qty(current)}`;
        if (reason === 'Other' && !note.trim()) e.note = 'Say what happened';
        setErrors(e);
        if (Object.keys(e).length || n === null) return;
        try {
            await adjust({
                productId: row._id,
                ...(variantId ? { variantId } : {}),
                mode,
                quantity: n,
                reason,
                ...(note.trim() ? { note: note.trim() } : {}),
            }).unwrap();
            toast.success(mode === 'set'
                ? `“${row.name}”${variant ? ` (${variant.label})` : ''} set to ${qty(n)} ${unit}`
                : `Removed ${qty(n)} ${unit} from “${row.name}”${variant ? ` (${variant.label})` : ''}`);
            onClose();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not adjust stock'));
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Adjust stock"
            subtitle="Correct the count after a stock-take, or write off damaged or lost units."
            width="max-w-lg"
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant={mode === 'remove' ? 'danger' : 'primary'} onClick={submit} disabled={isLoading}>
                    {isLoading ? 'Saving…' : mode === 'remove' ? 'Remove stock' : 'Save count'}
                </Btn>
            </>}
        >
            <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-3">
                    <Thumb src={row.thumbnail} size={44} />
                    <div className="min-w-0">
                        <p className="line-clamp-1 font-medium text-gray-900">{row.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">{row.sku || 'No SKU'} · On hand {qty(row.stock)} {unit}</p>
                    </div>
                </div>

                {hasVariants && (
                    <Field label="Variant" required error={errors.variant}>
                        <select className={INPUT} value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                            <option value="">Choose a variant…</option>
                            {row.variants.map((v) => <option key={v._id} value={v._id}>{v.label} — {qty(v.stock)} in stock</option>)}
                        </select>
                    </Field>
                )}

                <Segmented
                    value={mode}
                    onChange={changeMode}
                    options={[{ value: 'set', label: 'Set exact count' }, { value: 'remove', label: 'Remove units' }]}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={mode === 'set' ? `Counted quantity (${unit})` : `Quantity to remove (${unit})`} required error={errors.amount}>
                        <input className={INPUT} type="number" inputMode="numeric" min={mode === 'set' ? 0 : 1} step={1} placeholder="0" autoFocus
                            value={amount} onChange={(e) => setAmount(e.target.value)} />
                    </Field>
                    <Field label="Reason" required>
                        <select className={INPUT} value={reason} onChange={(e) => setReason(e.target.value)}>
                            {REASONS[mode].map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </Field>
                </div>

                <Field label="Note" required={reason === 'Other'} error={errors.note}>
                    <textarea className={TEXTAREA} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)}
                        placeholder={mode === 'remove' ? 'e.g. 2 broken in transit' : 'Optional'} />
                </Field>

                {current !== null && next !== null && next >= 0 && (next !== current || (nextTotal !== null && nextTotal !== row.stock)) && (
                    <div className="flex flex-wrap items-center gap-x-2 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        <span>{variant ? variant.label : 'On hand'}:</span>
                        <strong className="font-semibold text-gray-900">{qty(current)}</strong>
                        <span className="text-gray-400">→</span>
                        <strong className="font-semibold text-gray-900">{qty(next)} {unit}</strong>
                        <span className={cx('font-medium', next > current ? 'text-emerald-600' : next < current ? 'text-red-600' : 'text-gray-400')}>({signed(next - current)})</span>
                        {nextTotal !== null && (
                            <span className="basis-full text-xs text-gray-500">
                                Product total {qty(row.stock)} → {qty(nextTotal)} {unit} (the sum of its variants)
                            </span>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}
