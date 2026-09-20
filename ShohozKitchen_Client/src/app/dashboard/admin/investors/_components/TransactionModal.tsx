"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuArrowDownLeft, LuArrowUpRight } from 'react-icons/lu';
import { Modal, Btn, Field, Segmented, INPUT, TEXTAREA, taka, cx } from '@/components/admin/ui';
import {
    useCreateInvestorTransactionMutation,
    useUpdateInvestorTransactionMutation,
    useGetInvestorLedgerQuery,
    type IInvestorTx,
    type InvestorMethod,
    type InvestorTxType,
} from '@/redux/api/investorApi';
import { PAID_BY_OPTIONS } from '@/redux/api/expenseApi';
import { dhakaToday, parseAmount, round2, takaInWords, errMsg, fieldErrors } from '../../expenses/_components/shared';

type Form = { type: InvestorTxType; amount: string; date: string; method: InvestorMethod; reference: string; note: string };
type Errors = Partial<Record<keyof Form, string>>;

const money = (n: number) => taka(n, n % 1 ? 2 : 0);

/**
 * Money in / money out for one investor, or edit an existing transaction.
 * Today's balance comes from the investor's ledger (shared cache with the ledger modal);
 * the server also checks that no earlier day goes below zero.
 */
export default function TransactionModal({ investor, type, tx, onClose }: {
    investor: { _id: string; name: string };
    type: InvestorTxType;
    tx?: IInvestorTx | null;
    onClose: () => void;
}) {
    const editing = !!tx;
    const [today] = useState(dhakaToday);
    const [form, setForm] = useState<Form>(() => ({
        type: tx?.type || type,
        amount: tx ? String(tx.amount) : '',
        date: tx?.day || today,
        method: tx?.method || 'bank',
        reference: tx?.reference || '',
        note: tx?.note || '',
    }));
    const [tried, setTried] = useState(false);
    const [serverErrors, setServerErrors] = useState<Errors>({});
    const set = <K extends keyof Form>(k: K, v: Form[K]) => {
        setForm((f) => ({ ...f, [k]: v }));
        if (serverErrors[k]) setServerErrors((s) => ({ ...s, [k]: undefined }));
    };

    const { currentData: ledger } = useGetInvestorLedgerQuery(investor._id);
    const balance = ledger?.balance ?? 0;
    const known = !!ledger;

    // Balance without this transaction (when editing), so the preview is right either way.
    const base = round2(balance - (tx ? (tx.type === 'in' ? tx.amount : -tx.amount) : 0));
    const amt = parseAmount(form.amount);
    const valid = amt !== null && !Number.isNaN(amt) && amt > 0;
    const after = valid ? round2(base + (form.type === 'in' ? amt : -amt)) : base;

    const validate = (): Errors => {
        const e: Errors = {};
        if (amt === null) e.amount = 'Enter the amount';
        else if (Number.isNaN(amt)) e.amount = 'Use a number with up to 2 decimals, like 50000';
        else if (!(amt > 0)) e.amount = 'The amount must be more than 0';
        else if (known && form.type === 'out' && after < 0) e.amount = `${investor.name} has only ${money(Math.max(0, base))} in the business`;
        if (!form.date) e.date = 'Pick the date';
        else if (form.date > today) e.date = 'The date cannot be in the future';
        if (form.reference.length > 80) e.reference = 'Keep it under 80 characters';
        if (form.note.length > 500) e.note = 'Keep the note under 500 characters';
        return e;
    };
    const errors: Errors = tried ? { ...validate(), ...serverErrors } : serverErrors;

    const [createTx, { isLoading: creating }] = useCreateInvestorTransactionMutation();
    const [updateTx, { isLoading: updating }] = useUpdateInvestorTransactionMutation();
    const busy = creating || updating;

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setTried(true);
        const v = validate();
        if (Object.keys(v).length) { toast.error(Object.values(v)[0] as string); return; }
        const body = {
            type: form.type,
            amount: amt as number,
            date: form.date,
            method: form.method,
            reference: form.reference.trim(),
            note: form.note.trim(),
        };
        try {
            if (editing && tx) {
                await updateTx({ investorId: investor._id, txId: tx._id, ...body }).unwrap();
                toast.success('Transaction updated');
            } else {
                await createTx({ investorId: investor._id, ...body }).unwrap();
                toast.success(form.type === 'in'
                    ? `${money(body.amount)} put in by ${investor.name}`
                    : `${money(body.amount)} paid back to ${investor.name}`);
            }
            onClose();
        } catch (err) {
            setServerErrors(fieldErrors(err) as Errors);
            toast.error(errMsg(err, 'Could not save the transaction'), { duration: 7000 });
        }
    };

    const isIn = form.type === 'in';

    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-lg"
            title={editing ? 'Edit transaction' : isIn ? 'Add money in' : 'Record money out'}
            subtitle={<>{investor.name} · balance now <span className="font-medium text-gray-700">{known ? money(balance) : '…'}</span></>}
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" onClick={() => submit()} disabled={busy}>
                    {busy ? 'Saving…' : editing ? 'Save changes' : isIn ? 'Add money in' : 'Record money out'}
                </Btn>
            </>}
        >
            <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <Segmented
                        value={form.type}
                        onChange={(v) => set('type', v)}
                        options={[
                            { value: 'in', label: <span className="inline-flex items-center gap-1.5"><LuArrowDownLeft size={14} /> Money in</span> },
                            { value: 'out', label: <span className="inline-flex items-center gap-1.5"><LuArrowUpRight size={14} /> Money out</span> },
                        ]}
                    />
                    <p className="mt-2 text-xs text-gray-500">
                        {isIn ? 'Capital they put into the business.' : 'Capital paid back to them. It can never be more than they have in the business.'}
                    </p>
                </div>
                <Field label="Amount (৳)" required error={errors.amount} hint={valid ? takaInWords(amt as number) : undefined}>
                    <input
                        className={cx(INPUT, 'tabular-nums', errors.amount && 'border-red-300')}
                        inputMode="decimal"
                        placeholder="0"
                        autoFocus
                        value={form.amount}
                        onChange={(e) => set('amount', e.target.value)}
                    />
                </Field>
                <Field label="Date" required error={errors.date}>
                    <input className={cx(INPUT, errors.date && 'border-red-300')} type="date" max={today} value={form.date} onChange={(e) => set('date', e.target.value)} />
                </Field>
                <Field label={isIn ? 'How it came' : 'How it was paid'}>
                    <select className={cx(INPUT, 'cursor-pointer')} value={form.method} onChange={(e) => set('method', e.target.value as InvestorMethod)}>
                        {PAID_BY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>
                <Field label="Reference" error={errors.reference}>
                    <input className={INPUT} placeholder="Cheque / transfer no." maxLength={80} value={form.reference} onChange={(e) => set('reference', e.target.value)} />
                </Field>
                <Field label="Note" error={errors.note} className="sm:col-span-2">
                    <textarea className={TEXTAREA} rows={2} maxLength={500} placeholder="Optional" value={form.note} onChange={(e) => set('note', e.target.value)} />
                </Field>

                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5 text-sm sm:col-span-2">
                    <span className="text-gray-500">Balance after this</span>
                    <span className={cx('font-semibold tabular-nums', after < 0 ? 'text-red-600' : 'text-gray-900')}>{money(after)}</span>
                </div>
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
            </form>
        </Modal>
    );
}
