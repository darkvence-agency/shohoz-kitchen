"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Modal, Btn, Field, Toggle, INPUT, TEXTAREA, taka, cx } from '@/components/admin/ui';
import {
    useCreateInvestorMutation,
    useUpdateInvestorMutation,
    type IInvestor,
    type InvestorMethod,
} from '@/redux/api/investorApi';
import { PAID_BY_OPTIONS } from '@/redux/api/expenseApi';
import { dhakaToday, parseAmount, takaInWords, errMsg, fieldErrors } from '../../expenses/_components/shared';

type Form = {
    name: string;
    phone: string;
    email: string;
    note: string;
    isActive: boolean;
    amount: string;
    date: string;
    method: InvestorMethod;
    reference: string;
};
type Errors = Partial<Record<keyof Form, string>>;

/** Same rule as the server: a Bangladeshi mobile, or any 6–15 digit number. */
export const phoneOk = (raw: string) => {
    const s = raw.trim();
    if (!s) return true;
    const digits = s.replace(/\D/g, '');
    return /^(?:88)?01[3-9]\d{8}$/.test(digits) || /^\d{6,15}$/.test(digits);
};

function validate(f: Form, creating: boolean, today: string): Errors {
    const e: Errors = {};
    if (!f.name.trim()) e.name = 'Enter the investor’s name';
    else if (f.name.trim().length > 80) e.name = 'Keep the name under 80 characters';
    if (!phoneOk(f.phone)) e.phone = 'Enter a valid phone number, like 01712345678';
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email address';
    if (f.note.length > 500) e.note = 'Keep the note under 500 characters';
    if (creating && f.amount.trim()) {
        const a = parseAmount(f.amount);
        if (a === null || Number.isNaN(a)) e.amount = 'Use a number with up to 2 decimals';
        else if (!(a > 0)) e.amount = 'The amount must be more than 0';
        if (!f.date) e.date = 'Pick the date the money came in';
        else if (f.date > today) e.date = 'The date cannot be in the future';
    }
    return e;
}

/** Add an investor (optionally with their first money in), or edit one. Remounted per open. */
export default function InvestorFormModal({ investor, onClose }: { investor?: IInvestor | null; onClose: () => void }) {
    const editing = !!investor;
    const [today] = useState(dhakaToday);
    const [form, setForm] = useState<Form>(() => ({
        name: investor?.name || '',
        phone: investor?.phone || '',
        email: investor?.email || '',
        note: investor?.note || '',
        isActive: investor?.isActive ?? true,
        amount: '',
        date: today,
        method: 'bank',
        reference: '',
    }));
    const [tried, setTried] = useState(false);
    const [serverErrors, setServerErrors] = useState<Errors>({});
    const errors: Errors = tried ? { ...validate(form, !editing, today), ...serverErrors } : serverErrors;
    const set = <K extends keyof Form>(k: K, v: Form[K]) => {
        setForm((f) => ({ ...f, [k]: v }));
        if (serverErrors[k]) setServerErrors((s) => ({ ...s, [k]: undefined }));
    };

    const [createInvestor, { isLoading: creating }] = useCreateInvestorMutation();
    const [updateInvestor, { isLoading: updating }] = useUpdateInvestorMutation();
    const busy = creating || updating;
    const amt = parseAmount(form.amount);

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setTried(true);
        const v = validate(form, !editing, today);
        if (Object.keys(v).length) { toast.error(Object.values(v)[0] as string); return; }
        const base = {
            name: form.name.trim().replace(/\s+/g, ' '),
            phone: form.phone.trim(),
            email: form.email.trim(),
            note: form.note.trim(),
            isActive: form.isActive,
        };
        try {
            if (editing && investor) {
                await updateInvestor({ id: investor._id, ...base }).unwrap();
                toast.success('Investor updated');
            } else {
                const withMoney = amt !== null && amt > 0;
                await createInvestor({
                    ...base,
                    ...(withMoney ? { initialInvestment: { amount: amt as number, date: form.date, method: form.method, reference: form.reference.trim() } } : {}),
                }).unwrap();
                toast.success(withMoney ? `${base.name} added with ${taka(amt, amt % 1 ? 2 : 0)} put in` : `${base.name} added`);
            }
            onClose();
        } catch (err) {
            const fe = fieldErrors(err) as Errors;
            setServerErrors(fe);
            toast.error(errMsg(err, editing ? 'Could not update the investor' : 'Could not add the investor'));
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-xl"
            title={editing ? `Edit ${investor?.name}` : 'Add investor'}
            subtitle={editing ? 'Their money in and out is kept in the ledger.' : 'Someone who has put money into the business.'}
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" onClick={() => submit()} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add investor'}</Btn>
            </>}
        >
            <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
                <Field label="Name" required error={errors.name} className="sm:col-span-2">
                    <input className={cx(INPUT, errors.name && 'border-red-300')} autoFocus placeholder="e.g. Md Ahasan Rabbi" maxLength={80} value={form.name} onChange={(e) => set('name', e.target.value)} />
                </Field>
                <Field label="Phone" error={errors.phone}>
                    <input className={cx(INPUT, errors.phone && 'border-red-300')} type="tel" inputMode="tel" placeholder="01XXXXXXXXX" maxLength={20} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
                </Field>
                <Field label="Email" error={errors.email}>
                    <input className={cx(INPUT, errors.email && 'border-red-300')} type="email" placeholder="name@example.com" maxLength={120} value={form.email} onChange={(e) => set('email', e.target.value)} />
                </Field>
                <Field label="Note" error={errors.note} className="sm:col-span-2">
                    <textarea className={TEXTAREA} rows={2} maxLength={500} placeholder="Terms agreed, share, anything to remember" value={form.note} onChange={(e) => set('note', e.target.value)} />
                </Field>
                {editing && (
                    <div className="sm:col-span-2">
                        <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Active investor" />
                    </div>
                )}

                {!editing && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 sm:col-span-2">
                        <p className="text-sm font-medium text-gray-800">First money in <span className="font-normal text-gray-400">(optional)</span></p>
                        <p className="mb-3 text-xs text-gray-500">Record what they have put in so far. You can add more later from the ledger.</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Amount (৳)" error={errors.amount} hint={amt && amt > 0 ? takaInWords(amt) : undefined}>
                                <input className={cx(INPUT, 'tabular-nums', errors.amount && 'border-red-300')} inputMode="decimal" placeholder="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} />
                            </Field>
                            <Field label="Date" error={errors.date}>
                                <input className={cx(INPUT, errors.date && 'border-red-300')} type="date" max={today} value={form.date} onChange={(e) => set('date', e.target.value)} />
                            </Field>
                            <Field label="How it came">
                                <select className={cx(INPUT, 'cursor-pointer')} value={form.method} onChange={(e) => set('method', e.target.value as InvestorMethod)}>
                                    {PAID_BY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </Field>
                            <Field label="Reference">
                                <input className={INPUT} placeholder="Cheque / transfer no." maxLength={80} value={form.reference} onChange={(e) => set('reference', e.target.value)} />
                            </Field>
                        </div>
                    </div>
                )}
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
            </form>
        </Modal>
    );
}
