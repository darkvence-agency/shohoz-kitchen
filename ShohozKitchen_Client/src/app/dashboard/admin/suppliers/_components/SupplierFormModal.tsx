"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Modal, Btn, Field, Toggle, INPUT, TEXTAREA } from '@/components/admin/ui';
import {
    useCreateSupplierMutation, useUpdateSupplierMutation, type Supplier, type SupplierInput,
} from '@/redux/api/supplierApi';
import { errorMessage } from '@/app/dashboard/admin/inventory/shared';

const COUNTRIES = ['China', 'Bangladesh', 'India', 'Thailand', 'Vietnam', 'Malaysia', 'Indonesia', 'Turkey', 'Japan', 'South Korea', 'United States'];

type Form = Required<Omit<SupplierInput, 'isActive'>> & { isActive: boolean };

const fromSupplier = (s?: Supplier | null, name = ''): Form => ({
    name: s?.name ?? name,
    contactPerson: s?.contactPerson ?? '',
    phone: s?.phone ?? '',
    email: s?.email ?? '',
    country: s?.country ?? 'China',
    address: s?.address ?? '',
    note: s?.note ?? '',
    isActive: s?.isActive ?? true,
});

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RX = /^[0-9+()\-.\s/]*$/;

/**
 * Add or edit a supplier. The parent mounts it only while open (with a fresh `key`),
 * so the form always starts from the right values. `onSaved` receives the saved
 * supplier — the purchase form uses it to select a supplier it just quick-added.
 */
export default function SupplierFormModal({ supplier, initialName, onClose, onSaved }: {
    supplier?: Supplier | null;
    initialName?: string;
    onClose: () => void;
    onSaved?: (s: Supplier) => void;
}) {
    const editing = !!supplier;
    const [form, setForm] = useState<Form>(() => fromSupplier(supplier, initialName));
    const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
    const [create, { isLoading: creating }] = useCreateSupplierMutation();
    const [update, { isLoading: updating }] = useUpdateSupplierMutation();
    const busy = creating || updating;

    const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value }));

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const errs: typeof errors = {};
        if (form.name.trim().length < 2) errs.name = 'Enter the supplier’s name';
        if (form.email.trim() && !EMAIL_RX.test(form.email.trim())) errs.email = 'Enter a valid email address';
        if (!PHONE_RX.test(form.phone)) errs.phone = 'Digits, spaces and + ( ) - / only';
        setErrors(errs);
        if (Object.keys(errs).length) return;

        const body: SupplierInput = {
            name: form.name.trim(),
            contactPerson: form.contactPerson.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            country: form.country.trim(),
            address: form.address.trim(),
            note: form.note.trim(),
            isActive: form.isActive,
        };
        try {
            const saved = editing
                ? await update({ id: supplier!._id, ...body }).unwrap()
                : await create(body).unwrap();
            toast.success(editing ? 'Supplier updated' : `“${body.name}” added`);
            onSaved?.(saved);
            onClose();
        } catch (err) {
            const msg = errorMessage(err, 'Could not save the supplier');
            if (/already exists/i.test(msg)) setErrors({ name: msg });
            toast.error(msg);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={editing ? 'Edit supplier' : 'Add supplier'}
            subtitle={editing ? supplier!.name : 'A company you buy stock from. Only admins see suppliers.'}
            width="max-w-2xl"
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" onClick={() => submit()} disabled={busy}>
                    {busy ? 'Saving…' : editing ? 'Save changes' : 'Add supplier'}
                </Btn>
            </>}
        >
            <form onSubmit={submit} className="space-y-4" noValidate>
                <Field label="Supplier name" required error={errors.name}>
                    <input className={INPUT} value={form.name} onChange={set('name')} maxLength={120} autoFocus
                        placeholder="e.g. Guangzhou Yibai Technology Co., Ltd." />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Contact person">
                        <input className={INPUT} value={form.contactPerson} onChange={set('contactPerson')} maxLength={80} placeholder="Who you deal with" />
                    </Field>
                    <Field label="Country">
                        <input className={INPUT} value={form.country} onChange={set('country')} maxLength={60} list="supplier-countries" />
                        <datalist id="supplier-countries">
                            {COUNTRIES.map((c) => <option key={c} value={c} />)}
                        </datalist>
                    </Field>
                    <Field label="Phone / WhatsApp" error={errors.phone}>
                        <input className={INPUT} value={form.phone} onChange={set('phone')} maxLength={40} inputMode="tel" placeholder="+86 …" />
                    </Field>
                    <Field label="Email" error={errors.email}>
                        <input className={INPUT} value={form.email} onChange={set('email')} maxLength={120} type="email" inputMode="email" />
                    </Field>
                </div>
                <Field label="Address">
                    <textarea className={TEXTAREA} rows={2} value={form.address} onChange={set('address')} maxLength={300} />
                </Field>
                <Field label="Note" hint="Payment terms, bank details, what they are good for…">
                    <textarea className={TEXTAREA} rows={2} value={form.note} onChange={set('note')} maxLength={1000} />
                </Field>
                <div className="border-t border-gray-100 pt-3">
                    <Toggle
                        label="Active (can be chosen on new purchases)"
                        checked={form.isActive}
                        onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                    />
                </div>
                {/* Enter in a field submits. */}
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
            </form>
        </Modal>
    );
}
