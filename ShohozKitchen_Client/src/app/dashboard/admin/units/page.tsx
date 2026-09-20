/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from 'react';
import { LuPlus, LuPencil, LuTrash2, LuEye, LuEyeOff, LuRuler } from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import {
    useGetUnitsQuery, useCreateUnitMutation, useUpdateUnitMutation, useDeleteUnitMutation, type Unit,
} from '@/redux/api/unitApi';
import {
    PageHeader, Btn, Segmented, Badge, TableCard, TH, TD, TR, EmptyRow, SkeletonRows, RowMenu,
    Modal, Field, Toggle, INPUT, fmtDateTime,
} from '@/components/admin/ui';

const errMsg = (err: any, fallback: string) =>
    err?.data?.errorMessages?.[0]?.message || err?.data?.message || fallback;

const EMPTY = { name: '', shortName: '', isActive: true };

export default function UnitsPage() {
    const [scope, setScope] = useState<'active' | 'all'>('active');
    const { data: units = [], isLoading } = useGetUnitsQuery({ scope });
    const [createUnit, { isLoading: isCreating }] = useCreateUnitMutation();
    const [updateUnit, { isLoading: isUpdating }] = useUpdateUnitMutation();
    const [deleteUnit] = useDeleteUnitMutation();

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Unit | null>(null);
    const [form, setForm] = useState(EMPTY);

    const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
    const openEdit = (u: Unit) => { setEditing(u); setForm({ name: u.name, shortName: u.shortName, isActive: u.isActive }); setOpen(true); };

    const save = async () => {
        if (!form.name.trim() || !form.shortName.trim()) { toast.error('Name and short name are required'); return; }
        const body = { name: form.name.trim(), shortName: form.shortName.trim(), isActive: form.isActive };
        try {
            if (editing) {
                await updateUnit({ id: editing._id, ...body }).unwrap();
                const renamed = editing.name !== body.name || editing.shortName !== body.shortName;
                toast.success(renamed && editing.productCount > 0
                    ? `Unit updated — ${editing.productCount} product${editing.productCount === 1 ? '' : 's'} moved to the new name`
                    : 'Unit updated');
            } else {
                await createUnit(body).unwrap();
                toast.success('Unit added — it is now in the product form’s unit list');
            }
            setOpen(false);
        } catch (err: any) {
            toast.error(errMsg(err, 'Could not save the unit'));
        }
    };

    const toggleActive = async (u: Unit) => {
        try {
            await updateUnit({ id: u._id, isActive: !u.isActive }).unwrap();
            toast.success(u.isActive ? 'Unit deactivated' : 'Unit activated');
        } catch (err: any) {
            toast.error(errMsg(err, 'Could not update the unit'));
        }
    };

    const remove = async (u: Unit) => {
        if (u.productCount > 0) {
            toast.error(`${u.productCount} product${u.productCount === 1 ? ' uses' : 's use'} this unit — deactivate it instead`);
            return;
        }
        if (!window.confirm(`Delete the unit "${u.name}"?`)) return;
        try {
            await deleteUnit(u._id).unwrap();
            toast.success('Unit deleted');
        } catch (err: any) {
            toast.error(errMsg(err, 'Could not delete the unit'));
        }
    };

    return (
        <div>
            <PageHeader
                title="Units"
                subtitle="Measurement units products are sold in (pcs, kg, box…). They appear in the product form’s unit list."
                actions={<>
                    <Segmented value={scope} onChange={setScope} options={[{ value: 'active', label: 'Active' }, { value: 'all', label: 'All' }]} />
                    <Btn variant="primary" icon={<LuPlus size={16} />} onClick={openCreate}>Add unit</Btn>
                </>}
            />

            <TableCard footer={<p className="mt-4 text-sm text-gray-500">{units.length} {units.length === 1 ? 'unit' : 'units'}</p>}>
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={`${TH} w-12`}>#</th>
                            <th className={TH}>Name</th>
                            <th className={TH}>Short name</th>
                            <th className={`${TH} text-right`}>Products</th>
                            <th className={TH}>Status</th>
                            <th className={TH}>Created</th>
                            <th className={`${TH} w-12`} />
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={7} rows={6} /> : units.length === 0 ? (
                            <EmptyRow colSpan={7}>
                                <LuRuler size={28} className="mx-auto mb-2 text-gray-300" />
                                {scope === 'active' ? 'No active units.' : 'No units yet.'}
                            </EmptyRow>
                        ) : units.map((u, i) => (
                            <tr key={u._id} className={TR}>
                                <td className={`${TD} text-gray-400`}>{i + 1}</td>
                                <td className={TD}>
                                    <button type="button" onClick={() => openEdit(u)} className="font-medium text-gray-900 hover:text-[var(--color-primary)]">{u.name}</button>
                                </td>
                                <td className={`${TD} text-gray-500`}>{u.shortName}</td>
                                <td className={`${TD} text-right`}>{u.productCount}</td>
                                <td className={TD}><Badge tone={u.isActive ? 'green' : 'gray'}>{u.isActive ? 'Active' : 'Inactive'}</Badge></td>
                                <td className={`${TD} whitespace-nowrap text-gray-500`}>{fmtDateTime(u.createdAt)}</td>
                                <td className={`${TD} text-right`}>
                                    <RowMenu items={[
                                        { label: 'Edit', icon: <LuPencil size={15} />, onClick: () => openEdit(u) },
                                        u.isActive
                                            ? { label: 'Deactivate', icon: <LuEyeOff size={15} />, onClick: () => toggleActive(u) }
                                            : { label: 'Activate', icon: <LuEye size={15} />, onClick: () => toggleActive(u) },
                                        { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: () => remove(u), danger: true },
                                    ]} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableCard>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={editing ? 'Edit unit' : 'Add unit'}
                subtitle={editing && editing.productCount > 0
                    ? `${editing.productCount} product${editing.productCount === 1 ? ' uses' : 's use'} this unit — renaming moves them to the new name.`
                    : undefined}
                width="max-w-md"
                footer={<>
                    <Btn onClick={() => setOpen(false)}>Cancel</Btn>
                    <Btn variant="primary" onClick={save} disabled={isCreating || isUpdating}>
                        {isCreating || isUpdating ? 'Saving…' : editing ? 'Save changes' : 'Add unit'}
                    </Btn>
                </>}
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Name" required>
                        <input className={INPUT} placeholder="e.g. Kilogram" value={form.name} autoFocus
                            onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </Field>
                    <Field label="Short name" required hint="Shown next to stock, e.g. 184 PC.">
                        <input className={INPUT} placeholder="e.g. KG" maxLength={10} value={form.shortName}
                            onChange={(e) => setForm({ ...form, shortName: e.target.value })} />
                    </Field>
                </div>
                <div className="mt-3 border-t border-gray-100 pt-3">
                    <Toggle label="Active (offered in the product form)" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
                </div>
            </Modal>
        </div>
    );
}
