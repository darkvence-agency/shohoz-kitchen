"use client";

import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuPaperclip, LuPlus, LuX, LuCheck, LuImage } from 'react-icons/lu';
import { Modal, Btn, Field, INPUT, TEXTAREA, taka, cx } from '@/components/admin/ui';
import {
    PAID_BY_OPTIONS,
    useCreateExpenseMutation,
    useUpdateExpenseMutation,
    useCreateExpenseCategoryMutation,
    type IExpense,
    type IExpenseCategory,
    type IExpenseInput,
    type PaidBy,
} from '@/redux/api/expenseApi';
import { useUploadImageMutation } from '@/redux/api/uploadApi';
import { dhakaToday, parseAmount, takaInWords, errMsg, fieldErrors, fmtDay } from './shared';

type Form = {
    date: string;
    title: string;
    category: string;
    amount: string;
    paidTo: string;
    reference: string;
    paidBy: PaidBy;
    note: string;
    receiptUrl: string;
};
type Errors = Partial<Record<keyof Form, string>>;

const blank = (today: string, keep?: Partial<Form>): Form => ({
    date: keep?.date || today,
    title: '',
    category: keep?.category || '',
    amount: '',
    paidTo: '',
    reference: '',
    paidBy: keep?.paidBy || 'cash',
    note: '',
    receiptUrl: '',
});

const fromExpense = (e: IExpense): Form => ({
    date: e.day,
    title: e.title,
    category: e.category?._id || '',
    amount: String(e.amount),
    paidTo: e.paidTo || '',
    reference: e.reference || '',
    paidBy: e.paidBy || 'cash',
    note: e.note || '',
    receiptUrl: e.receiptUrl || '',
});

function validate(f: Form, today: string): Errors {
    const e: Errors = {};
    if (!f.date) e.date = 'Pick the date it was paid';
    else if (f.date > today) e.date = 'The date cannot be in the future';
    if (!f.title.trim()) e.title = 'Say what the money was for';
    else if (f.title.trim().length > 120) e.title = 'Keep it under 120 characters';
    if (!f.category) e.category = 'Pick a category';
    const amt = parseAmount(f.amount);
    if (amt === null) e.amount = 'Enter the amount';
    else if (Number.isNaN(amt)) e.amount = 'Use a number with up to 2 decimals, like 1250 or 99.50';
    else if (!(amt > 0)) e.amount = 'The amount must be more than 0';
    else if (amt > 10_000_000_000) e.amount = 'That amount is too large';
    if (f.paidTo.length > 120) e.paidTo = 'Keep it under 120 characters';
    if (f.reference.length > 80) e.reference = 'Keep it under 80 characters';
    if (f.note.length > 500) e.note = 'Keep the note under 500 characters';
    return e;
}

/**
 * Record a new expense or edit one. The parent remounts it (new `key`) each time it opens.
 */
export default function ExpenseFormModal({ expense, categories, payees, onClose, onSaved }: {
    expense?: IExpense | null;
    categories: IExpenseCategory[];
    /** Recent "paid to" names, offered as suggestions */
    payees: string[];
    onClose: () => void;
    onSaved?: (e: IExpense) => void;
}) {
    const editing = !!expense;
    const [today] = useState(dhakaToday);
    const [form, setForm] = useState<Form>(() => (expense ? fromExpense(expense) : blank(today)));
    const [tried, setTried] = useState(false);
    const [serverErrors, setServerErrors] = useState<Errors>({});
    const errors: Errors = tried ? { ...validate(form, today), ...serverErrors } : serverErrors;

    const set = <K extends keyof Form>(k: K, v: Form[K]) => {
        setForm((f) => ({ ...f, [k]: v }));
        if (serverErrors[k]) setServerErrors((s) => ({ ...s, [k]: undefined }));
    };

    const [createExpense, { isLoading: creating }] = useCreateExpenseMutation();
    const [updateExpense, { isLoading: updating }] = useUpdateExpenseMutation();
    const [uploadImage, { isLoading: uploading }] = useUploadImageMutation();
    const [createCategory, { isLoading: addingCat }] = useCreateExpenseCategoryMutation();
    const busy = creating || updating || uploading;

    // Active categories, plus the expense's own one if it has been switched off since.
    const catOptions = useMemo(() => {
        const list = categories.filter((c) => c.isActive || c._id === form.category);
        return list.map((c) => ({ value: c._id, label: c.isActive ? c.name : `${c.name} (off)` }));
    }, [categories, form.category]);

    /* ─── Quick "new category" ─── */
    const [newCat, setNewCat] = useState<string | null>(null);
    const addCategory = async () => {
        const name = (newCat || '').trim();
        if (!name) { toast.error('Enter a name for the category'); return; }
        try {
            const c = await createCategory({ name }).unwrap();
            set('category', c._id);
            setNewCat(null);
            toast.success(`"${c.name}" added`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not add the category'));
        }
    };

    /* ─── Receipt ─── */
    const fileRef = useRef<HTMLInputElement>(null);
    const onFile = async (file?: File) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Attach a photo or scan of the receipt (JPG, PNG, WebP)'); return; }
        if (file.size > 10 * 1024 * 1024) { toast.error('The file must be under 10 MB'); return; }
        const fd = new FormData();
        fd.append('image', file);
        try {
            const res = await uploadImage(fd).unwrap();
            set('receiptUrl', res.data.url);
        } catch (err) {
            toast.error(errMsg(err, 'Upload failed. Try again.'));
        }
    };

    /* ─── Save ─── */
    const submit = async (again = false) => {
        setTried(true);
        const v = validate(form, today);
        if (Object.keys(v).length) {
            toast.error(Object.values(v)[0] as string);
            return;
        }
        const body: IExpenseInput = {
            date: form.date,
            title: form.title.trim(),
            category: form.category,
            amount: parseAmount(form.amount) as number,
            paidTo: form.paidTo.trim(),
            reference: form.reference.trim(),
            paidBy: form.paidBy,
            note: form.note.trim(),
            receiptUrl: form.receiptUrl,
        };
        try {
            const saved = editing && expense
                ? await updateExpense({ id: expense._id, ...body }).unwrap()
                : await createExpense(body).unwrap();
            toast.success(editing ? 'Expense updated' : `${saved.voucherNo}: ${taka(saved.amount, saved.amount % 1 ? 2 : 0)} recorded`);
            onSaved?.(saved);
            if (again) {
                // Keep the date, category and method: entries are usually typed in batches.
                setForm(blank(today, { date: form.date, category: form.category, paidBy: form.paidBy }));
                setTried(false);
                setServerErrors({});
            } else {
                onClose();
            }
        } catch (err) {
            const fe = fieldErrors(err) as Errors;
            setServerErrors(fe);
            toast.error(errMsg(err, editing ? 'Could not update the expense' : 'Could not record the expense'));
        }
    };

    const amt = parseAmount(form.amount);

    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-2xl"
            title={editing ? `Edit ${expense?.voucherNo}` : 'Record expense'}
            subtitle={editing ? `Recorded ${fmtDay(expense?.day)}. Changes update every total straight away.` : 'Money the business has paid out. It shows in the totals as soon as you save.'}
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                {!editing && <Btn onClick={() => submit(true)} disabled={busy} className="hidden sm:inline-flex">Save and add another</Btn>}
                <Btn variant="primary" onClick={() => submit(false)} disabled={busy}>
                    {creating || updating ? 'Saving…' : editing ? 'Save changes' : 'Record expense'}
                </Btn>
            </>}
        >
            <form
                onSubmit={(e) => { e.preventDefault(); submit(false); }}
                className="grid gap-4 sm:grid-cols-2"
                noValidate
            >
                <Field label="Date" required error={errors.date}>
                    <input type="date" className={cx(INPUT, errors.date && 'border-red-300')} value={form.date} max={today} onChange={(e) => set('date', e.target.value)} />
                </Field>
                <Field label="Amount (৳)" required error={errors.amount} hint={amt && amt > 0 ? takaInWords(amt) : undefined}>
                    <input
                        className={cx(INPUT, 'tabular-nums', errors.amount && 'border-red-300')}
                        inputMode="decimal"
                        placeholder="0"
                        autoFocus={!editing}
                        value={form.amount}
                        onChange={(e) => set('amount', e.target.value)}
                    />
                </Field>

                <Field label="What for" required error={errors.title} className="sm:col-span-2">
                    <input className={cx(INPUT, errors.title && 'border-red-300')} placeholder="e.g. Facebook ads for the Eid sale" maxLength={120} value={form.title} onChange={(e) => set('title', e.target.value)} />
                </Field>

                <div className="sm:col-span-2">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-gray-700">Category<span className="text-red-500"> *</span></span>
                        {newCat === null && (
                            <button type="button" onClick={() => setNewCat('')} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]">
                                <LuPlus size={13} /> New category
                            </button>
                        )}
                    </div>
                    {newCat !== null ? (
                        <div className="flex gap-2">
                            <input
                                autoFocus
                                className={INPUT}
                                placeholder="Name of the new category"
                                maxLength={40}
                                value={newCat}
                                onChange={(e) => setNewCat(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory(); } }}
                                aria-label="New category name"
                            />
                            <Btn variant="primary" icon={<LuCheck size={15} />} onClick={addCategory} disabled={addingCat}>{addingCat ? 'Adding…' : 'Add'}</Btn>
                            <Btn variant="ghost" onClick={() => setNewCat(null)} aria-label="Cancel new category"><LuX size={15} /></Btn>
                        </div>
                    ) : (
                        <select
                            aria-label="Category"
                            className={cx(INPUT, 'cursor-pointer', errors.category && 'border-red-300', !form.category && 'text-gray-400')}
                            value={form.category}
                            onChange={(e) => set('category', e.target.value)}
                        >
                            <option value="">Pick a category…</option>
                            {catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    )}
                    {errors.category && <span className="mt-1 block text-xs text-red-600">{errors.category}</span>}
                </div>

                <Field label="Paid to" error={errors.paidTo} hint="Person or company that got the money">
                    <input className={INPUT} list="expense-payees" placeholder="e.g. Steadfast, Harun" maxLength={120} value={form.paidTo} onChange={(e) => set('paidTo', e.target.value)} />
                    <datalist id="expense-payees">
                        {payees.map((p) => <option key={p} value={p} />)}
                    </datalist>
                </Field>
                <Field label="Paid by">
                    <select className={cx(INPUT, 'cursor-pointer')} value={form.paidBy} onChange={(e) => set('paidBy', e.target.value as PaidBy)}>
                        {PAID_BY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </Field>

                <Field label="Reference" error={errors.reference} hint="Bill, memo or transaction number" className="sm:col-span-2">
                    <input className={INPUT} placeholder="e.g. bKash TrxID 9JH2K3L4" maxLength={80} value={form.reference} onChange={(e) => set('reference', e.target.value)} />
                </Field>

                <Field label="Note" error={errors.note} className="sm:col-span-2">
                    <textarea className={TEXTAREA} rows={2} maxLength={500} placeholder="Anything worth remembering about this payment" value={form.note} onChange={(e) => set('note', e.target.value)} />
                </Field>

                <div className="sm:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">Receipt</span>
                    {form.receiptUrl ? (
                        <div className="flex items-center gap-3 rounded-xl border border-gray-200 p-2.5">
                            <a href={form.receiptUrl} target="_blank" rel="noopener noreferrer" className="block h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={form.receiptUrl} alt="Receipt" className="h-full w-full object-cover" />
                            </a>
                            <div className="min-w-0 flex-1 text-sm">
                                <p className="font-medium text-gray-900">Receipt attached</p>
                                <a href={form.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-[var(--color-primary)]">Open full size</a>
                            </div>
                            <Btn variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading…' : 'Replace'}</Btn>
                            <button type="button" onClick={() => set('receiptUrl', '')} className="inline-flex h-9 items-center rounded-full px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50">Remove</button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={uploading}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-4 text-sm text-gray-500 transition hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-surface)] disabled:cursor-wait"
                        >
                            {uploading ? <>Uploading…</> : <><LuPaperclip size={16} /> Attach a photo of the receipt <span className="hidden text-xs text-gray-400 sm:inline">(optional, JPG / PNG, up to 10 MB)</span></>}
                        </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
                </div>

                {editing && expense?.receiptUrl && !form.receiptUrl && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-700 sm:col-span-2">
                        <LuImage size={13} /> The receipt will be removed when you save.
                    </p>
                )}
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
            </form>
        </Modal>
    );
}
