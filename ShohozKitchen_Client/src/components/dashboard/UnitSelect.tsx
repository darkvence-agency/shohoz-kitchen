/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useGetUnitsQuery, useCreateUnitMutation, unitOptions } from '@/redux/api/unitApi';

const ADD_NEW = '__add_new_unit__';

/**
 * The product's unit, picked from Units. "+ Add new unit…" creates the unit right here
 * (it then shows on the Units page too) and selects it — the same two-way link Attributes has.
 */
export default function UnitSelect({ value, onChange, className, inputClassName }: {
    value: string;
    onChange: (value: string) => void;
    /** Class for the <select>. */
    className?: string;
    /** Class for the two inputs of the add-new row (defaults to the select's class). */
    inputClassName?: string;
}) {
    const { data: units, isLoading } = useGetUnitsQuery({ scope: 'all' });
    const [createUnit, { isLoading: saving }] = useCreateUnitMutation();
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState({ name: '', shortName: '' });

    const add = async () => {
        const name = draft.name.trim();
        const shortName = draft.shortName.trim();
        if (!name || !shortName) { toast.error('Enter the unit name and its short name'); return; }
        try {
            await createUnit({ name, shortName, isActive: true }).unwrap();
            onChange(name.toLowerCase()); // what the Units list uses as the stored key
            toast.success(`Unit “${name}” added — it is on the Units page too`);
            setAdding(false);
            setDraft({ name: '', shortName: '' });
        } catch (err: any) {
            toast.error(err?.data?.errorMessages?.[0]?.message || err?.data?.message || 'Could not add the unit');
        }
    };

    const field = inputClassName || className;

    return (
        <div className="space-y-2">
            <select
                className={className}
                value={adding ? ADD_NEW : value}
                onChange={(e) => {
                    if (e.target.value === ADD_NEW) { setAdding(true); return; }
                    setAdding(false);
                    onChange(e.target.value);
                }}
            >
                {isLoading && !value && <option value="">Loading…</option>}
                {unitOptions(units, value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                <option value={ADD_NEW}>+ Add new unit…</option>
            </select>

            {adding && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-2.5">
                    <div className="grid grid-cols-[1fr_6rem] gap-2">
                        <input className={field} placeholder="Name, e.g. Kilogram" value={draft.name} autoFocus maxLength={40}
                            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
                        <input className={field} placeholder="Short, e.g. KG" value={draft.shortName} maxLength={10}
                            onChange={(e) => setDraft({ ...draft, shortName: e.target.value })}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                        <Link href="/dashboard/admin/units" target="_blank" className="text-xs text-gray-500 hover:text-[var(--color-primary)]">
                            Manage units ↗
                        </Link>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => { setAdding(false); setDraft({ name: '', shortName: '' }); }}
                                className="rounded-md px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-200">
                                Cancel
                            </button>
                            <button type="button" onClick={add} disabled={saving}
                                className="rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
                                {saving ? 'Adding…' : 'Add unit'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
