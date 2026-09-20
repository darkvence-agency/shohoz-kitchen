"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuInfo } from 'react-icons/lu';
import { Modal, Btn, Field, INPUT, TEXTAREA, taka, cx } from '@/components/admin/ui';
import {
    useCreateManualPayoutMutation,
    useUpdateCourierPayoutMutation,
    type ICourierPayout,
} from '@/redux/api/payoutApi';

type ApiError = { data?: { message?: string; errorMessages?: { message?: string }[] } };
export const errMsg = (err: unknown, fallback: string) => {
    const e = err as ApiError;
    return e?.data?.errorMessages?.[0]?.message || e?.data?.message || fallback;
};

/** Date → value for <input type="datetime-local"> in the browser's own time zone. */
const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

type Form = { receivedAt: string; amount: string; reference: string; codCollected: string; deliveryBills: string; codFee: string; note: string };

const fromPayout = (p?: ICourierPayout | null): Form => p ? {
    receivedAt: toLocalInput(new Date(p.receivedAt)),
    amount: String(p.amount ?? ''),
    reference: p.reference || '',
    codCollected: p.codCollected ? String(p.codCollected) : '',
    deliveryBills: p.deliveryBills ? String(p.deliveryBills) : '',
    codFee: p.codFee ? String(p.codFee) : '',
    note: p.note || '',
} : { receivedAt: toLocalInput(new Date()), amount: '', reference: '', codCollected: '', deliveryBills: '', codFee: '', note: '' };

const n = (s: string) => (s.trim() === '' ? null : Number(s));

/**
 * Record a payout by hand, or edit any payout. The parent remounts this with a
 * new `key` each time it opens, so the form always starts from the right values.
 * Steadfast statements keep their payment id and their amount is always
 * COD − bills − fee; manual payouts take the amount as typed.
 */
export default function PayoutFormModal({ payout, onClose }: { payout?: ICourierPayout | null; onClose: () => void }) {
    const editing = !!payout;
    const isStatement = payout?.source === 'steadfast';
    const [form, setForm] = useState<Form>(() => fromPayout(payout));
    const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const [createManual, { isLoading: creating }] = useCreateManualPayoutMutation();
    const [updatePayout, { isLoading: updating }] = useUpdateCourierPayoutMutation();
    const busy = creating || updating;

    const cod = n(form.codCollected);
    const bills = n(form.deliveryBills);
    const fee = n(form.codFee);
    const hasBreakdown = cod !== null;
    const computed = Math.round(((cod || 0) - (bills || 0) - (fee || 0)) * 100) / 100;
    const amountNum = n(form.amount);
    const showUseComputed = !isStatement && hasBreakdown && computed > 0 && amountNum !== computed;

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const when = new Date(form.receivedAt);
        if (!form.receivedAt || Number.isNaN(when.getTime())) { toast.error('Pick the date the money arrived'); return; }
        for (const [label, v] of [['COD collected', cod], ['Delivery bills', bills], ['COD fee', fee]] as const) {
            if (v !== null && (!Number.isFinite(v) || v < 0)) { toast.error(`${label} must be 0 or more`); return; }
        }
        if (!isStatement && !(amountNum !== null && Number.isFinite(amountNum) && amountNum > 0)) {
            toast.error('Enter the amount that reached you'); return;
        }
        if (isStatement && computed <= 0 && !window.confirm(`COD − bills − fee comes to ${taka(computed)}. Save anyway?`)) return;

        const body = {
            receivedAt: when.toISOString(),
            reference: form.reference.trim(),
            note: form.note.trim(),
            codCollected: cod ?? 0,
            deliveryBills: bills ?? 0,
            codFee: fee ?? 0,
        };
        try {
            if (editing && payout) {
                await updatePayout({
                    id: payout._id,
                    ...body,
                    ...(isStatement ? { reference: undefined } : { amount: amountNum as number }),
                }).unwrap();
                toast.success('Payout updated');
            } else {
                await createManual({ ...body, amount: amountNum as number, reference: body.reference || undefined }).unwrap();
                toast.success(`Recorded ${taka(amountNum)} received`);
            }
            onClose();
        } catch (err) {
            toast.error(errMsg(err, editing ? 'Failed to update the payout' : 'Failed to record the payout'));
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={editing ? (isStatement ? `Edit ${payout?.reference}` : 'Edit payout') : 'Record a payout'}
            subtitle={isStatement
                ? 'Pulled from Steadfast. Fix a figure here if their statement was read wrongly.'
                : 'Money from the courier that is not on one of their statements.'}
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" onClick={() => submit()} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Record payout'}</Btn>
            </>}
        >
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <Field label="Received on" required>
                    <input className={INPUT} type="datetime-local" value={form.receivedAt} onChange={set('receivedAt')} />
                </Field>
                {isStatement ? (
                    <Field label="Amount received" hint="COD − bills − fee, worked out for you.">
                        <span className={cx(INPUT, 'flex items-center bg-gray-50 font-semibold text-gray-900')}>{taka(computed, 2)}</span>
                    </Field>
                ) : (
                    <Field label="Amount received (৳)" required>
                        <input className={INPUT} type="number" min={0} step="0.01" inputMode="decimal" placeholder="0" autoFocus={!editing} value={form.amount} onChange={set('amount')} />
                    </Field>
                )}

                <Field label="Reference" className="sm:col-span-2" hint={isStatement ? 'The Steadfast payment id stays as pulled.' : 'Optional. A Steadfast payment id (type it as SFC-…) or a bank / transfer reference, so it cannot be recorded twice.'}>
                    <input className={cx(INPUT, isStatement && 'bg-gray-50 text-gray-500')} placeholder="SFC-… or bank reference" value={form.reference} onChange={set('reference')} disabled={isStatement} />
                </Field>

                <div className="sm:col-span-2">
                    <p className="mb-2 text-sm font-medium text-gray-700">
                        Breakdown {!isStatement && <span className="font-normal text-gray-400">(optional, if you know it)</span>}
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                        <Field label={<span className="text-xs text-gray-500">COD collected</span>}>
                            <input className={INPUT} type="number" min={0} step="0.01" inputMode="decimal" placeholder="0" value={form.codCollected} onChange={set('codCollected')} />
                        </Field>
                        <Field label={<span className="text-xs text-gray-500">Delivery bills</span>}>
                            <input className={INPUT} type="number" min={0} step="0.01" inputMode="decimal" placeholder="0" value={form.deliveryBills} onChange={set('deliveryBills')} />
                        </Field>
                        <Field label={<span className="text-xs text-gray-500">COD fee</span>}>
                            <input className={INPUT} type="number" min={0} step="0.01" inputMode="decimal" placeholder="0" value={form.codFee} onChange={set('codFee')} />
                        </Field>
                    </div>
                    {hasBreakdown && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
                            <LuInfo size={13} className="shrink-0 text-gray-400" />
                            <span>{taka(cod, 2)} − {taka(bills, 2)} − {taka(fee, 2)} = <b className="text-gray-900">{taka(computed, 2)}</b></span>
                            {showUseComputed && (
                                <button type="button" onClick={() => setForm((f) => ({ ...f, amount: String(computed) }))} className="font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]">
                                    Use as amount
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <Field label="Note" className="sm:col-span-2">
                    <textarea className={TEXTAREA} rows={2} placeholder="e.g. Paid by bKash after the statement was disputed" value={form.note} onChange={set('note')} />
                </Field>
                {/* lets Enter submit from any field */}
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
            </form>
        </Modal>
    );
}
