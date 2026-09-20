"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuPlus, LuPencil, LuTrash2, LuCheck, LuX, LuTags } from 'react-icons/lu';
import { Modal, Btn, Badge, INPUT, taka, cx } from '@/components/admin/ui';
import {
    useGetExpenseCategoryListQuery,
    useCreateExpenseCategoryMutation,
    useUpdateExpenseCategoryMutation,
    useDeleteExpenseCategoryMutation,
    type IExpenseCategory,
} from '@/redux/api/expenseApi';
import { errMsg } from './shared';

const nameError = (name: string, cats: IExpenseCategory[], exceptId?: string) => {
    const n = name.trim().replace(/\s+/g, ' ');
    if (!n) return 'Enter a name';
    if (n.length > 40) return 'Keep it under 40 characters';
    if (cats.some((c) => c._id !== exceptId && c.name.toLowerCase() === n.toLowerCase())) return 'That category already exists';
    return '';
};

/** Add, rename, switch off or delete the heads of spending. */
export default function CategoriesModal({ onClose }: { onClose: () => void }) {
    const { data: cats = [], isLoading, isError, refetch } = useGetExpenseCategoryListQuery();
    const [createCat, { isLoading: creating }] = useCreateExpenseCategoryMutation();
    const [updateCat] = useUpdateExpenseCategoryMutation();
    const [deleteCat] = useDeleteExpenseCategoryMutation();

    const [name, setName] = useState('');
    const [addTried, setAddTried] = useState(false);
    const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const addErr = addTried ? nameError(name, cats) : '';

    const add = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setAddTried(true);
        if (nameError(name, cats)) return;
        try {
            const c = await createCat({ name: name.trim() }).unwrap();
            toast.success(`"${c.name}" added`);
            setName('');
            setAddTried(false);
        } catch (err) {
            toast.error(errMsg(err, 'Could not add the category'));
        }
    };

    const saveRename = async () => {
        if (!editing) return;
        const cat = cats.find((c) => c._id === editing.id);
        const err = nameError(editing.name, cats, editing.id);
        if (err) { toast.error(err); return; }
        if (cat && cat.name === editing.name.trim()) { setEditing(null); return; }
        setBusyId(editing.id);
        try {
            await updateCat({ id: editing.id, name: editing.name.trim() }).unwrap();
            toast.success('Category renamed');
            setEditing(null);
        } catch (e) {
            toast.error(errMsg(e, 'Could not rename the category'));
        } finally {
            setBusyId(null);
        }
    };

    const toggle = async (c: IExpenseCategory) => {
        setBusyId(c._id);
        try {
            await updateCat({ id: c._id, isActive: !c.isActive }).unwrap();
            toast.success(c.isActive ? `"${c.name}" switched off. Old expenses keep it.` : `"${c.name}" switched on`);
        } catch (e) {
            toast.error(errMsg(e, 'Could not update the category'));
        } finally {
            setBusyId(null);
        }
    };

    const remove = async (c: IExpenseCategory) => {
        if (c.expenseCount > 0) {
            toast.error(`${c.expenseCount} expense${c.expenseCount === 1 ? ' is' : 's are'} filed under "${c.name}". Switch it off instead.`);
            return;
        }
        if (!window.confirm(`Delete the category "${c.name}"?`)) return;
        setBusyId(c._id);
        try {
            await deleteCat(c._id).unwrap();
            toast.success('Category deleted');
        } catch (e) {
            toast.error(errMsg(e, 'Could not delete the category'));
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-xl"
            title="Expense categories"
            subtitle="The heads you file spending under. A category in use can't be deleted, but you can switch it off so it stops showing for new expenses."
            footer={<Btn onClick={onClose}>Done</Btn>}
        >
            <form onSubmit={add} className="mb-4">
                <div className="flex gap-2">
                    <input
                        className={cx(INPUT, addErr && 'border-red-300')}
                        placeholder="New category, e.g. Photography"
                        value={name}
                        maxLength={40}
                        onChange={(e) => setName(e.target.value)}
                        aria-label="New category name"
                    />
                    <Btn type="submit" variant="primary" icon={<LuPlus size={15} />} disabled={creating}>{creating ? 'Adding…' : 'Add'}</Btn>
                </div>
                {addErr && <p className="mt-1 text-xs text-red-600">{addErr}</p>}
            </form>

            {isLoading ? (
                <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />)}
                </div>
            ) : isError ? (
                <div className="py-8 text-center text-sm text-gray-500">
                    Couldn&apos;t load the categories.
                    <div className="mt-3"><Btn onClick={() => refetch()}>Try again</Btn></div>
                </div>
            ) : cats.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                    <LuTags size={26} className="mx-auto mb-2 text-gray-300" />
                    No categories yet. Add the first one above.
                </div>
            ) : (
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                    {cats.map((c) => {
                        const isEditing = editing?.id === c._id;
                        const busy = busyId === c._id;
                        return (
                            <li key={c._id} className={cx('flex items-center gap-3 px-3 py-2.5', busy && 'opacity-60')}>
                                <div className="min-w-0 flex-1">
                                    {isEditing ? (
                                        <input
                                            autoFocus
                                            className={cx(INPUT, 'h-9')}
                                            value={editing.name}
                                            maxLength={40}
                                            aria-label="Category name"
                                            onChange={(e) => setEditing({ id: c._id, name: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') { e.preventDefault(); saveRename(); }
                                                if (e.key === 'Escape') { e.stopPropagation(); setEditing(null); }
                                            }}
                                        />
                                    ) : (
                                        <>
                                            <p className="flex items-center gap-2 truncate text-sm font-medium text-gray-900">
                                                {c.name}
                                                {!c.isActive && <Badge tone="gray">Off</Badge>}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {c.expenseCount
                                                    ? `${c.expenseCount.toLocaleString('en-IN')} expense${c.expenseCount === 1 ? '' : 's'} · ${taka(c.total)}`
                                                    : 'Not used yet'}
                                            </p>
                                        </>
                                    )}
                                </div>
                                {isEditing ? (
                                    <div className="flex shrink-0 gap-1">
                                        <button type="button" onClick={saveRename} disabled={busy} aria-label="Save name" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-emerald-600 hover:bg-emerald-50"><LuCheck size={16} /></button>
                                        <button type="button" onClick={() => setEditing(null)} aria-label="Cancel rename" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><LuX size={16} /></button>
                                    </div>
                                ) : (
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={c.isActive}
                                            aria-label={c.isActive ? `Switch off ${c.name}` : `Switch on ${c.name}`}
                                            title={c.isActive ? 'On: shows for new expenses' : 'Off: hidden for new expenses'}
                                            disabled={busy}
                                            onClick={() => toggle(c)}
                                            className={cx('relative mr-1 h-5 w-9 shrink-0 rounded-full transition', c.isActive ? 'bg-[var(--color-primary)]' : 'bg-gray-300')}
                                        >
                                            <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', c.isActive ? 'left-[18px]' : 'left-0.5')} />
                                        </button>
                                        <button type="button" onClick={() => setEditing({ id: c._id, name: c.name })} aria-label={`Rename ${c.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"><LuPencil size={15} /></button>
                                        <button
                                            type="button"
                                            onClick={() => remove(c)}
                                            aria-label={`Delete ${c.name}`}
                                            title={c.expenseCount ? 'In use: switch it off instead' : 'Delete'}
                                            className={cx('inline-flex h-8 w-8 items-center justify-center rounded-full transition', c.expenseCount ? 'text-gray-300 hover:bg-gray-50' : 'text-red-500 hover:bg-red-50')}
                                        >
                                            <LuTrash2 size={15} />
                                        </button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </Modal>
    );
}
