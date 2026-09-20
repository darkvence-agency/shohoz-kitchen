"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Modal, Btn, Field, Toggle, INPUT, TEXTAREA } from '@/components/admin/ui';
import {
    useCreateWarehouseMutation, useUpdateWarehouseMutation, type Warehouse, type WarehouseInput,
} from '@/redux/api/warehouseApi';
import { errMsg, errStatus, plural } from '../transfers/shared';

type Form = { name: string; location: string; contactPerson: string; phone: string; note: string; isActive: boolean };

const fromWarehouse = (w: Warehouse | null): Form => ({
    name: w?.name || '',
    location: w?.location || '',
    contactPerson: w?.contactPerson || '',
    phone: w?.phone || '',
    note: w?.note || '',
    isActive: w ? w.isActive : true,
});

const PHONE = /^\+?[\d\s-]{6,20}$/;

/** Field errors, the same rules the server applies. */
export function validateWarehouse(f: Form): Record<string, string> {
    const e: Record<string, string> = {};
    const name = f.name.trim();
    if (!name) e.name = 'Warehouse name is required';
    else if (name.length > 80) e.name = 'Name is too long (max 80 characters)';
    if (f.location.trim().length > 200) e.location = 'Location is too long (max 200 characters)';
    if (f.contactPerson.trim().length > 80) e.contactPerson = 'Contact name is too long';
    if (f.phone.trim() && !PHONE.test(f.phone.trim())) e.phone = 'Enter a valid phone number';
    if (f.note.trim().length > 500) e.note = 'Note is too long (max 500 characters)';
    return e;
}

export default function WarehouseFormModal({ warehouse, onClose }: { warehouse: Warehouse | null; onClose: () => void }) {
    const [form, setForm] = useState<Form>(() => fromWarehouse(warehouse));
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [createWarehouse, { isLoading: creating }] = useCreateWarehouseMutation();
    const [updateWarehouse, { isLoading: updating }] = useUpdateWarehouseMutation();
    const saving = creating || updating;

    const set = <K extends keyof Form>(k: K, v: Form[K]) => {
        setForm((f) => ({ ...f, [k]: v }));
        if (errors[k]) setErrors((e) => ({ ...e, [k]: '' }));
    };

    const inTransit = (warehouse?.inTransitIn || 0) + (warehouse?.inTransitOut || 0);

    const save = async (e?: React.FormEvent) => {
        e?.preventDefault();
        const errs = validateWarehouse(form);
        setErrors(errs);
        if (Object.values(errs).some(Boolean)) return;

        const body: WarehouseInput = {
            name: form.name.trim().replace(/\s+/g, ' '),
            location: form.location.trim(),
            contactPerson: form.contactPerson.trim(),
            phone: form.phone.trim(),
            note: form.note.trim(),
            isActive: form.isActive,
        };
        try {
            if (warehouse) {
                await updateWarehouse({ id: warehouse._id, ...body }).unwrap();
                toast.success('Warehouse updated');
            } else {
                await createWarehouse(body).unwrap();
                toast.success(`“${body.name}” added`);
            }
            onClose();
        } catch (err) {
            const msg = errMsg(err, 'Could not save the warehouse');
            if (errStatus(err) === 409) setErrors((x) => ({ ...x, name: msg }));
            toast.error(msg);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={warehouse ? 'Edit warehouse' : 'Add warehouse'}
            subtitle={warehouse
                ? warehouse.transferCount
                    ? `On ${plural(warehouse.transferCount, 'transfer')} — a new name shows on them too.`
                    : undefined
                : 'A godown, office or shop where goods are kept.'}
            width="max-w-lg"
            footer={<>
                <Btn onClick={onClose}>Cancel</Btn>
                <Btn variant="primary" onClick={() => save()} disabled={saving}>
                    {saving ? 'Saving…' : warehouse ? 'Save changes' : 'Add warehouse'}
                </Btn>
            </>}
        >
            <form onSubmit={save} noValidate className="space-y-4">
                <Field label="Name" required error={errors.name}>
                    <input className={INPUT} placeholder="e.g. Mirpur godown" maxLength={80} value={form.name} autoFocus
                        onChange={(e) => set('name', e.target.value)} />
                </Field>
                <Field label="Location" error={errors.location} hint="Area or full address">
                    <input className={INPUT} placeholder="e.g. Baridhara DOHS, Dhaka" maxLength={200} value={form.location}
                        onChange={(e) => set('location', e.target.value)} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Contact person" error={errors.contactPerson}>
                        <input className={INPUT} placeholder="Optional" maxLength={80} value={form.contactPerson}
                            onChange={(e) => set('contactPerson', e.target.value)} />
                    </Field>
                    <Field label="Phone" error={errors.phone}>
                        <input className={INPUT} type="tel" inputMode="tel" placeholder="e.g. 01712-345678" maxLength={30} value={form.phone}
                            onChange={(e) => set('phone', e.target.value)} />
                    </Field>
                </div>
                <Field label="Note" error={errors.note}>
                    <textarea className={TEXTAREA} rows={2} maxLength={500} placeholder="Opening hours, key holder…" value={form.note}
                        onChange={(e) => set('note', e.target.value)} />
                </Field>
                <div className="border-t border-gray-100 pt-3">
                    <Toggle label="Active (can be picked for new transfers and purchases)" checked={form.isActive} onChange={(v) => set('isActive', v)} />
                    {warehouse?.isActive && !form.isActive && inTransit > 0 && (
                        <p className="mt-1 text-xs text-amber-700">
                            {plural(inTransit, 'transfer')} to or from here {inTransit === 1 ? 'is' : 'are'} still in transit. They stay as they are.
                        </p>
                    )}
                </div>
                {/* Enter in any field submits. */}
                <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
            </form>
        </Modal>
    );
}
