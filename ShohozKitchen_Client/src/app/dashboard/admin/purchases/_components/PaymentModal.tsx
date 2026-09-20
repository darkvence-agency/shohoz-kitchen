"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Modal, Btn, Field, INPUT, TEXTAREA, taka } from '@/components/admin/ui';
import { useAddPurchasePaymentMutation, type PaymentMethod } from '@/redux/api/purchaseApi';
import { errorMessage } from '@/app/dashboard/admin/inventory/shared';
import { PAYMENT_METHODS, dhakaDay, round2 } from './shared';

type Target = { _id: string; reference: string; grandTotal: number; paid: number; due: number };

/** Record money paid to the supplier. It can never take the paid total past the grand total. */
export default function PaymentModal({ purchase, onClose }: { purchase: Target; onClose: () => void }) {
    const [today] = useState(() => dhakaDay());
    const [amount, setAmount] = useState(() => (purchase.due > 0 ? String(purchase.due) : ''));
    const [date, setDate] = useState(today);
    const [method, setMethod] = useState<PaymentMethod>('bank');
    const [reference, setReference] = useState('');
    const [note, setNote] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [addPayment, { isLoading }] = useAddPurchasePaymentMutation();

    const n = Number(amount);
    const after = amount.trim() !== '' && Number.isFinite(n) && n > 0 ? round2(purchase.due - n) : null;

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const errs: Record<string, string> = {};
        if (!(amount.trim() !== '' && Number.isFinite(n) && n > 0)) errs.amount = 'Enter an amount of more than 0';
        else if (round2(n) > round2(purchase.due)) errs.amount = `Only ${taka(purchase.due, 2)} is due — a payment cannot be more than that`;
        if (!date) errs.date = 'Pick the payment date';
        else if (date > today) errs.date = 'The date cannot be in the future';
        setErrors(errs);
        if (Object.keys(errs).length) return;
        try {
            await addPayment({
                id: purchase._id,
                amount: round2(n),
                date,
                method,
                ...(reference.trim() ? { reference: reference.trim() } : {}),
                ...(note.trim() ? { note: note.trim() } : {}),
            }).unwrap();
            toast.success(after !== null && after <= 0
                ? `${purchase.reference} is fully paid`
                : `${taka(n, 2)} recorded on ${purchase.reference}`);
            onClose();
        } catch (err) {
            toast.error(errorMessage(err, 'Could not record the payment'));
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Record payment"
            subtitle={`${purchase.reference} · grand total ${taka(purchase.grandTotal, 2)} · paid ${taka(purchase.paid, 2)}`}
            width="max-w-md"
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" onClick={() => submit()} disabled={isLoading || purchase.due <= 0}>
                    {isLoading ? 'Saving…' : 'Record payment'}
                </Btn>
            </>}
        >
            <form onSubmit={submit} className="space-y-4" noValidate>
                <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Due now: <strong className="font-semibold">{taka(purchase.due, 2)}</strong>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Amount (৳)"
                        required
                        error={errors.amount}
                        hint={after !== null && after >= 0 ? (after === 0 ? 'Settles the purchase' : `${taka(after, 2)} left after this`) : undefined}
                    >
                        <input className={INPUT} type="number" inputMode="decimal" min={0} step="0.01" value={amount} autoFocus
                            onChange={(e) => setAmount(e.target.value)} />
                    </Field>
                    <Field label="Date" required error={errors.date}>
                        <input className={INPUT} type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
                    </Field>
                    <Field label="Method">
                        <select className={INPUT} value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
                            {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </Field>
                    <Field label="Reference" hint="TT / cheque / transaction id">
                        <input className={INPUT} value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} />
                    </Field>
                </div>
                <Field label="Note">
                    <textarea className={TEXTAREA} rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
            </form>
        </Modal>
    );
}
