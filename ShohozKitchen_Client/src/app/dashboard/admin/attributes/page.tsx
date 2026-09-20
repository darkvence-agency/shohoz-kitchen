/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    LuPlus, LuPencil, LuTrash2, LuX, LuEye, LuEyeOff, LuLink2, LuRotateCcw, LuTags, LuTriangleAlert,
} from 'react-icons/lu';
import {
    useGetAttributesQuery, useCreateAttributeMutation, useUpdateAttributeMutation, useDeleteAttributeMutation,
    type Attribute, type AttributeValueInfo,
} from '@/redux/api/attributeApi';
import { namedColorHex } from '@/components/dashboard/AttributeValuePicker';
import { PageHeader, Btn, Badge, RowMenu, Modal, Field, INPUT, cx } from '@/components/admin/ui';

const keyOf = (s: string) => (s || '').trim().toLowerCase();
/** "Red, Blue ,Green" → ['Red', 'Blue', 'Green'] (trimmed, de-duplicated case-insensitively) */
const splitValues = (s: string) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of s.split(',')) {
        const v = raw.trim();
        if (!v || seen.has(keyOf(v))) continue;
        seen.add(keyOf(v));
        out.push(v);
    }
    return out;
};
const errMsg = (err: any, fallback: string) =>
    err?.data?.errorMessages?.[0]?.message || err?.data?.message || fallback;
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;
const NOUN: Record<string, string> = { color: 'colour', size: 'size' };

export default function AttributesPage() {
    // Refetch on every visit: the list call also merges in colours/sizes saved on products.
    const { data, isLoading, isError, refetch, isFetching } = useGetAttributesQuery(undefined, { refetchOnMountOrArgChange: true });
    const [createAttribute, { isLoading: isCreating }] = useCreateAttributeMutation();
    const [updateAttribute] = useUpdateAttributeMutation();
    const [deleteAttribute, { isLoading: isDeleting }] = useDeleteAttributeMutation();
    const attributes = data?.data || [];

    const [addOpen, setAddOpen] = useState(false);
    const [newAttr, setNewAttr] = useState({ name: '', values: '' });
    const [renaming, setRenaming] = useState<Attribute | null>(null);
    const [renameTo, setRenameTo] = useState('');
    const [removing, setRemoving] = useState<{ attr: Attribute; info: AttributeValueInfo } | null>(null);
    const [deleting, setDeleting] = useState<Attribute | null>(null);
    const [busy, setBusy] = useState(false);

    /* ─── Actions ─── */

    const handleCreate = async () => {
        const name = newAttr.name.trim();
        if (!name) return toast.error('Give the attribute a name');
        try {
            await createAttribute({ name, values: splitValues(newAttr.values) }).unwrap();
            toast.success(`"${name}" added`);
            setAddOpen(false);
            setNewAttr({ name: '', values: '' });
        } catch (err) {
            toast.error(errMsg(err, 'Could not add the attribute'));
        }
    };

    const handleRename = async () => {
        if (!renaming) return;
        const name = renameTo.trim();
        if (!name) return toast.error('Name cannot be empty');
        if (name === renaming.name) return setRenaming(null);
        try {
            await updateAttribute({ id: renaming._id, name }).unwrap();
            toast.success('Renamed');
            setRenaming(null);
        } catch (err) {
            toast.error(errMsg(err, 'Could not rename'));
        }
    };

    /** Returns true when the values were saved. */
    const addValues = async (attr: Attribute, raw: string) => {
        const list = splitValues(raw);
        if (!list.length) return false;
        const have = new Set(attr.values.map(keyOf));
        const fresh = list.filter((v) => !have.has(keyOf(v)));
        if (!fresh.length) {
            toast.error(list.length === 1 ? `"${list[0]}" is already in ${attr.name}` : `Those values are already in ${attr.name}`);
            return false;
        }
        try {
            await updateAttribute({ id: attr._id, addValues: fresh }).unwrap();
            if (fresh.length < list.length) toast.success(`Added ${plural(fresh.length, 'value')} — the rest were already there`);
            return true;
        } catch (err) {
            toast.error(errMsg(err, 'Could not add the value'));
            return false;
        }
    };

    const removeValue = async (attr: Attribute, value: string) => {
        setBusy(true);
        try {
            await updateAttribute({ id: attr._id, removeValue: value }).unwrap();
            setRemoving(null);
            toast((t) => (
                <span className="flex items-center gap-3 text-sm">
                    Removed &ldquo;{value}&rdquo; from {attr.name}
                    <button
                        type="button"
                        className="font-semibold text-[var(--color-primary)] hover:underline"
                        onClick={() => {
                            toast.dismiss(t.id);
                            updateAttribute({ id: attr._id, addValues: [value] }).unwrap()
                                .then(() => toast.success(`Restored "${value}"`))
                                .catch((err) => toast.error(errMsg(err, 'Could not restore')));
                        }}
                    >
                        Undo
                    </button>
                </span>
            ), { duration: 6000 });
        } catch (err) {
            toast.error(errMsg(err, 'Could not remove the value'));
        } finally {
            setBusy(false);
        }
    };

    /** Values still on products get a warning first; unused ones go straight away (with Undo). */
    const askRemove = (attr: Attribute, info: AttributeValueInfo) => {
        if ((info.products || 0) > 0) setRemoving({ attr, info });
        else removeValue(attr, info.value);
    };

    const restoreValue = async (attr: Attribute, value: string) => {
        try {
            await updateAttribute({ id: attr._id, addValues: [value] }).unwrap();
            toast.success(`"${value}" is back in ${attr.name}`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not restore'));
        }
    };

    const toggleActive = async (attr: Attribute) => {
        try {
            await updateAttribute({ id: attr._id, isActive: !attr.isActive }).unwrap();
            toast.success(attr.isActive ? `${attr.name} hidden from the product form` : `${attr.name} shown in the product form`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not update'));
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        try {
            await deleteAttribute(deleting._id).unwrap();
            toast.success(`"${deleting.name}" deleted`);
            setDeleting(null);
        } catch (err) {
            toast.error(errMsg(err, 'Could not delete'));
        }
    };

    /* ─── Render ─── */

    return (
        <div>
            <PageHeader
                title="Attributes"
                subtitle="Global variant attributes. Color and Size feed the product form's dropdowns; other attributes are reusable reference lists."
                actions={<Btn variant="primary" icon={<LuPlus size={16} />} onClick={() => setAddOpen(true)}>Add attribute</Btn>}
            />

            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="h-5 w-24 animate-pulse rounded bg-gray-100" />
                            <div className="mt-4 flex gap-2">
                                {[0, 1, 2].map((j) => <div key={j} className="h-6 w-14 animate-pulse rounded-full bg-gray-100" />)}
                            </div>
                            <div className="mt-4 h-9 animate-pulse rounded-full bg-gray-100" />
                        </div>
                    ))}
                </div>
            ) : isError ? (
                <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
                    <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
                    <p className="text-sm text-gray-600">Couldn&rsquo;t load attributes.</p>
                    <Btn className="mt-4" onClick={() => refetch()}>Try again</Btn>
                </div>
            ) : attributes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
                    <LuTags size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">No attributes yet.</p>
                    <Btn variant="primary" className="mt-4" icon={<LuPlus size={16} />} onClick={() => setAddOpen(true)}>Add attribute</Btn>
                </div>
            ) : (
                <div className={cx('grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3', isFetching && 'opacity-80')}>
                    {attributes.map((a) => (
                        <AttributeCard
                            key={a._id}
                            attr={a}
                            onAdd={(raw) => addValues(a, raw)}
                            onRemove={(info) => askRemove(a, info)}
                            onRestore={(v) => restoreValue(a, v)}
                            onRename={() => { setRenaming(a); setRenameTo(a.name); }}
                            onToggle={() => toggleActive(a)}
                            onDelete={() => setDeleting(a)}
                        />
                    ))}
                </div>
            )}

            {/* ═══ Add attribute ═══ */}
            <Modal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                title="Add attribute"
                subtitle="A reusable list of values, e.g. Material or Capacity. For reference only; the product form offers Color and Size."
                width="max-w-md"
                footer={<>
                    <Btn onClick={() => setAddOpen(false)}>Cancel</Btn>
                    <Btn variant="primary" onClick={handleCreate} disabled={isCreating}>{isCreating ? 'Adding…' : 'Add attribute'}</Btn>
                </>}
            >
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
                    <Field label="Name" required>
                        <input className={INPUT} autoFocus maxLength={60} placeholder="e.g. Material" value={newAttr.name}
                            onChange={(e) => setNewAttr({ ...newAttr, name: e.target.value })} />
                    </Field>
                    <Field label="Values" hint="Optional. Separate with commas — you can add more later.">
                        <input className={INPUT} placeholder="e.g. Stainless steel, Cast iron, Non-stick" value={newAttr.values}
                            onChange={(e) => setNewAttr({ ...newAttr, values: e.target.value })} />
                    </Field>
                    <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
                </form>
            </Modal>

            {/* ═══ Rename ═══ */}
            <Modal
                open={!!renaming}
                onClose={() => setRenaming(null)}
                title="Rename attribute"
                subtitle={renaming?.linkedTo ? `Still linked to product ${NOUN[renaming.linkedTo]}s after renaming.` : undefined}
                width="max-w-md"
                footer={<>
                    <Btn onClick={() => setRenaming(null)}>Cancel</Btn>
                    <Btn variant="primary" onClick={handleRename}>Save</Btn>
                </>}
            >
                <form onSubmit={(e) => { e.preventDefault(); handleRename(); }}>
                    <Field label="Name" required>
                        <input className={INPUT} autoFocus maxLength={60} value={renameTo} onChange={(e) => setRenameTo(e.target.value)} />
                    </Field>
                </form>
            </Modal>

            {/* ═══ Remove a value still used on products ═══ */}
            <Modal
                open={!!removing}
                onClose={() => setRemoving(null)}
                title={removing ? `Remove “${removing.info.value}” from ${removing.attr.name}?` : ''}
                width="max-w-md"
                footer={<>
                    <Btn onClick={() => setRemoving(null)}>Cancel</Btn>
                    <Btn variant="danger" disabled={busy} onClick={() => removing && removeValue(removing.attr, removing.info.value)}>
                        {busy ? 'Removing…' : 'Remove'}
                    </Btn>
                </>}
            >
                {removing && (
                    <div className="space-y-3 text-sm text-gray-600">
                        <div className="flex gap-3 rounded-xl bg-amber-50 p-3 text-amber-800">
                            <LuTriangleAlert size={18} className="mt-0.5 shrink-0" />
                            <p>
                                <strong>{plural(removing.info.products || 0, 'product')}</strong> still use{removing.info.products === 1 ? 's' : ''} this {NOUN[removing.attr.linkedTo || ''] || 'value'}.
                            </p>
                        </div>
                        <p>
                            Those products keep it — nothing on them changes. It just won&rsquo;t be offered in the product form any more.
                            You can restore it from this card later.
                        </p>
                    </div>
                )}
            </Modal>

            {/* ═══ Delete attribute ═══ */}
            <Modal
                open={!!deleting}
                onClose={() => setDeleting(null)}
                title={deleting ? `Delete “${deleting.name}”?` : ''}
                width="max-w-md"
                footer={<>
                    <Btn onClick={() => setDeleting(null)}>Cancel</Btn>
                    <Btn variant="danger" disabled={isDeleting} onClick={handleDelete}>{isDeleting ? 'Deleting…' : 'Delete'}</Btn>
                </>}
            >
                {deleting && (
                    <p className="text-sm text-gray-600">
                        {deleting.values.length ? `Its ${plural(deleting.values.length, 'value')} will be deleted too. ` : ''}
                        Products are not affected. This can&rsquo;t be undone.
                    </p>
                )}
            </Modal>
        </div>
    );
}

/* ─── One attribute card ─────────────────────────────────── */

function AttributeCard({ attr, onAdd, onRemove, onRestore, onRename, onToggle, onDelete }: {
    attr: Attribute;
    onAdd: (raw: string) => Promise<boolean>;
    onRemove: (info: AttributeValueInfo) => void;
    onRestore: (value: string) => void;
    onRename: () => void;
    onToggle: () => void;
    onDelete: () => void;
}) {
    const [draft, setDraft] = useState('');
    const [saving, setSaving] = useState(false);
    const isColor = attr.linkedTo === 'color';
    const noun = attr.linkedTo ? NOUN[attr.linkedTo] : 'value';
    // Only the linked attributes (Color, Size) reach the product form, so only they can be hidden from it.
    const hidden = !!attr.linkedTo && !attr.isActive;
    const values = attr.valueInfo?.length ? attr.valueInfo : attr.values.map((v) => ({ value: v, products: null, hex: null }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim() || saving) return;
        setSaving(true);
        const ok = await onAdd(draft);
        setSaving(false);
        if (ok) setDraft('');
    };

    return (
        <section className={cx('rounded-2xl border border-gray-200 bg-white p-4 transition', hidden && 'bg-gray-50/60')}>
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 pt-1">
                    <h2 className={cx('truncate text-[15px] font-semibold', hidden ? 'text-gray-500' : 'text-gray-900')}>{attr.name}</h2>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {attr.linkedTo ? (
                            <span title={`Values typed on a product appear here, and values here are offered in the product form's ${noun} dropdown.`}>
                                <Badge tone="blue" className="gap-1"><LuLink2 size={12} /> Synced with product {noun}s</Badge>
                            </span>
                        ) : (
                            <span title="Not offered in the product form — a list kept for reference.">
                                <Badge tone="gray">Reference list</Badge>
                            </span>
                        )}
                        {hidden && <Badge tone="gray" className="gap-1"><LuEyeOff size={12} /> Hidden from product form</Badge>}
                    </div>
                </div>
                <RowMenu
                    label={`${attr.name} actions`}
                    items={[
                        { label: 'Rename', icon: <LuPencil size={15} />, onClick: onRename },
                        attr.isActive
                            ? { label: 'Hide from product form', icon: <LuEyeOff size={15} />, onClick: onToggle, hidden: !attr.linkedTo }
                            : { label: 'Show in product form', icon: <LuEye size={15} />, onClick: onToggle, hidden: !attr.linkedTo },
                        { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: onDelete, danger: true, hidden: !!attr.linkedTo },
                    ]}
                />
            </div>

            {/* Values */}
            <div className="mt-3 flex flex-wrap gap-1.5">
                {values.length === 0 && <p className="text-sm text-gray-400">No values yet — add the first one below.</p>}
                {values.map((v) => {
                    const sw = isColor ? v.hex || namedColorHex(v.value) : null;
                    const used = v.products || 0;
                    return (
                        <span key={v.value} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-gray-100 py-0.5 pl-2.5 pr-1 text-xs font-medium text-gray-700">
                            {isColor && (
                                <span className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                                    style={{ background: sw || 'repeating-linear-gradient(45deg,#e5e7eb 0 2px,#fff 2px 4px)' }} />
                            )}
                            <span className="truncate">{v.value}</span>
                            {used > 0 && <span className="text-gray-400" title={`Used on ${plural(used, 'product')}`}>{used}</span>}
                            <button
                                type="button"
                                aria-label={`Remove ${v.value}`}
                                title={used > 0 ? `Remove (still on ${plural(used, 'product')})` : 'Remove'}
                                onClick={() => onRemove(v)}
                                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
                            >
                                <LuX size={11} />
                            </button>
                        </span>
                    );
                })}
            </div>

            {/* Removed here, but still on products */}
            {attr.hiddenValues?.length > 0 && (
                <div className="mt-3 rounded-xl border border-dashed border-gray-200 px-3 py-2">
                    <p className="text-xs text-gray-500">Removed, but still on products:</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {attr.hiddenValues.map((h) => (
                            <button
                                key={h.value}
                                type="button"
                                onClick={() => onRestore(h.value)}
                                title={`On ${plural(h.products || 0, 'product')} — click to restore`}
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-500 transition hover:border-[var(--color-primary-border)] hover:text-gray-800"
                            >
                                <LuRotateCcw size={11} /> {h.value}
                                <span className="text-gray-400">{h.products}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Add value */}
            <form onSubmit={submit} className="mt-3 flex items-center gap-2">
                <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Add value…"
                    aria-label={`Add a value to ${attr.name}`}
                    title="Tip: add several at once, separated by commas"
                    maxLength={300}
                    className="h-9 min-w-0 flex-1 rounded-full border border-transparent bg-gray-100 px-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[var(--color-primary-border)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]"
                />
                <button
                    type="submit"
                    disabled={!draft.trim() || saving}
                    className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <LuPlus size={14} /> {saving ? 'Adding…' : 'Add'}
                </button>
            </form>

            {attr.linkedTo && (
                <p className="mt-3 text-xs text-gray-400">
                    {plural(attr.values.length, noun)} · used on {plural(attr.productCount || 0, 'product')}
                </p>
            )}
        </section>
    );
}
