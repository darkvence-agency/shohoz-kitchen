/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useMemo } from 'react';
import { LuPlus, LuPencil, LuTrash2, LuEye, LuEyeOff, LuLayoutGrid } from 'react-icons/lu';
import {
    useGetAdminCategoriesQuery,
    useDeleteCategoryMutation,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
} from '@/redux/api/categoryApi';
import { SingleImageUploader } from '@/components/ui/ImageUploader';
import { toast } from 'react-hot-toast';
import {
    PageHeader, Btn, SearchInput, Segmented, FilterBar, Badge, TableCard, TH, TD, TR, EmptyRow, SkeletonRows,
    RowMenu, Modal, Field, Toggle, INPUT, TEXTAREA, fmtDateTime, cx,
} from '@/components/admin/ui';

/* parent may be a populated object {_id,name} or a raw id string or null */
const parentId = (cat: any): string => (cat?.parent && typeof cat.parent === 'object' ? cat.parent._id : cat?.parent) || '';
const parentName = (cat: any): string => (cat?.parent && typeof cat.parent === 'object' ? cat.parent.name : '') || '';
const isImg = (s?: string) => !!s && (s.startsWith('http') || s.startsWith('/'));

/* ─── 20 Default Icons ─── */
const ICON_OPTIONS = [
    { emoji: '👗', label: 'Fashion' },
    { emoji: '👔', label: 'Men Clothing' },
    { emoji: '📱', label: 'Mobile' },
    { emoji: '💻', label: 'Electronics' },
    { emoji: '🏠', label: 'Home' },
    { emoji: '🌾', label: 'Agriculture' },
    { emoji: '🚗', label: 'Automotive' },
    { emoji: '🔧', label: 'Industrial' },
    { emoji: '🏗️', label: 'Construction' },
    { emoji: '⚡', label: 'Electrical' },
    { emoji: '👶', label: 'Kids & Baby' },
    { emoji: '💊', label: 'Healthcare' },
    { emoji: '🎁', label: 'Gifts' },
    { emoji: '👜', label: 'Bags' },
    { emoji: '💄', label: 'Beauty' },
    { emoji: '⚽', label: 'Sports' },
    { emoji: '🌍', label: 'Global' },
    { emoji: '📦', label: 'Wholesale' },
    { emoji: '🍎', label: 'Food' },
    { emoji: '💎', label: 'Jewelry' },
];

const EMPTY_FORM = {
    name: '',
    icon: '',
    image: '',
    description: '',
    parent: '',
    isActive: true,
    showInMenu: true,
    showInHome: true,
};

function CategoryIcon({ cat, size = 36 }: { cat: any; size?: number }) {
    const src = cat.image || (isImg(cat.icon) ? cat.icon : '');
    return (
        <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50 text-lg" style={{ width: size, height: size }}>
            {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : cat.icon || <LuLayoutGrid className="text-gray-300" />}
        </div>
    );
}

export default function CategoriesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [scope, setScope] = useState<'active' | 'all'>('active');
    // Admin list must include INACTIVE categories too (so they stay manageable/re-activatable).
    const { data: categoriesData, isLoading } = useGetAdminCategoriesQuery(undefined);
    const [deleteCategory] = useDeleteCategoryMutation();
    const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
    const [updateCategory, { isLoading: isUpdating }] = useUpdateCategoryMutation();

    /* ─── Modal State ─── */
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [iconTab, setIconTab] = useState<'emoji' | 'upload'>('upload');
    const [form, setForm] = useState(EMPTY_FORM);
    /* per-field inline errors (mirrors backend errorMessages[].path → message) */
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const categories: any[] = useMemo(() => categoriesData?.data || [], [categoriesData]);
    const isSaving = isCreating || isUpdating;

    const openCreate = () => {
        setEditingId(null);
        setIconTab('upload');
        setForm(EMPTY_FORM);
        setFieldErrors({});
        setModalOpen(true);
    };

    const openEdit = (cat: any) => {
        setEditingId(cat._id);
        const imgSrc = cat.image || (isImg(cat.icon) ? cat.icon : '');
        setIconTab(imgSrc ? 'upload' : 'emoji');
        setForm({
            name: cat.name || '',
            icon: cat.icon || '',
            image: imgSrc,
            description: cat.description || '',
            parent: parentId(cat),
            isActive: cat.isActive !== false,
            showInMenu: cat.showInMenu !== false,
            showInHome: cat.showInHome !== false,
        });
        setFieldErrors({});
        setModalOpen(true);
    };

    const closeModal = () => { setModalOpen(false); setEditingId(null); setFieldErrors({}); };

    /* Client-side mirror of the backend zod rules → returns per-field error map */
    const validate = (): Record<string, string> => {
        const errs: Record<string, string> = {};
        if (!form.name.trim()) errs.name = 'Category name is required';
        if (!form.icon && !form.image) errs.icon = 'Please select an icon or upload an image';
        return errs;
    };

    const handleSave = async () => {
        const errs = validate();
        if (Object.keys(errs).length > 0) {
            setFieldErrors(errs);
            toast.error('Please fix the highlighted fields');
            return;
        }
        setFieldErrors({});

        const payload: any = {
            name: form.name.trim(),
            icon: form.icon || form.image,
            image: form.image || '',
            description: form.description,
            isActive: form.isActive,
            showInMenu: form.showInMenu,
            showInHome: form.showInHome,
            parent: form.parent || null,
        };

        try {
            if (editingId) {
                await updateCategory({ id: editingId, data: payload }).unwrap();
                toast.success('Category updated');
            } else {
                await createCategory(payload).unwrap();
                toast.success('Category created');
            }
            closeModal();
        } catch (error: any) {
            // Map backend 400 errorMessages[].path → matching field, render inline
            const errorMessages = error?.data?.errorMessages;
            if (Array.isArray(errorMessages) && errorMessages.length > 0) {
                const mapped: Record<string, string> = {};
                errorMessages.forEach((em: any) => { if (em?.path) mapped[em.path] = em.message; });
                setFieldErrors(mapped);
                toast.error(errorMessages[0]?.message || 'Please fix the highlighted fields');
            } else {
                toast.error(error?.data?.message || 'Something went wrong');
            }
        }
    };

    const handleToggleActive = async (cat: any) => {
        try {
            await updateCategory({ id: cat._id, data: { isActive: !cat.isActive } }).unwrap();
            toast.success(cat.isActive ? 'Category hidden' : 'Category activated');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to update');
        }
    };

    const handleDelete = async (cat: any) => {
        if (!window.confirm(`Delete the category "${cat.name}"?`)) return;
        try {
            await deleteCategory(cat._id).unwrap();
            toast.success('Category deleted');
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to delete');
        }
    };

    // Descendants of the category being edited — it cannot become its own ancestor.
    const descendantIdsOfEditing = useMemo(() => {
        if (!editingId) return new Set<string>();
        const set = new Set<string>([editingId]);
        let added = true;
        while (added) {
            added = false;
            categories.forEach((c: any) => {
                const p = parentId(c);
                if (p && set.has(p) && !set.has(c._id)) {
                    set.add(c._id);
                    added = true;
                }
            });
        }
        return set;
    }, [editingId, categories]);

    // Parent options formatted with hierarchical tree indentation
    const parentOptions = useMemo(() => {
        const available = categories.filter((c: any) => !descendantIdsOfEditing.has(c._id));
        const map: Record<string, any[]> = {};
        available.forEach((c: any) => { (map[parentId(c)] ||= []).push(c); });

        const out: { _id: string; label: string }[] = [];
        const traverse = (pId: string, depth = 0) => {
            (map[pId] || []).forEach((item: any) => {
                const prefix = depth === 0 ? '' : depth === 1 ? '   └ ' : '      └── ';
                out.push({ _id: item._id, label: `${prefix}${item.icon && !isImg(item.icon) ? item.icon + ' ' : ''}${item.name}` });
                traverse(String(item._id), depth + 1);
            });
        };
        traverse('');
        return out;
    }, [categories, descendantIdsOfEditing]);

    // Each parent followed by its sub-categories (indented); a flat list while searching.
    const orderedList = useMemo(() => {
        const inScope = (c: any) => scope === 'all' || c.isActive !== false;
        const q = searchTerm.trim().toLowerCase();
        if (q) {
            return categories
                .filter((c: any) => inScope(c) && c.name.toLowerCase().includes(q))
                .map((c: any) => ({ cat: c, depth: 0 }));
        }
        const map: Record<string, any[]> = {};
        categories.forEach((c: any) => { (map[parentId(c)] ||= []).push(c); });

        const out: { cat: any; depth: number }[] = [];
        const seen = new Set<string>();
        const traverse = (pId: string, depth = 0) => {
            (map[pId] || []).forEach((item: any) => {
                if (seen.has(item._id)) return;
                seen.add(item._id);
                if (inScope(item)) out.push({ cat: item, depth });
                traverse(String(item._id), depth + 1);
            });
        };
        traverse('');
        // Orphans (parent missing) still get listed.
        categories.forEach((c: any) => {
            if (!seen.has(c._id) && inScope(c)) out.push({ cat: c, depth: parentId(c) ? 1 : 0 });
        });
        return out;
    }, [categories, scope, searchTerm]);

    return (
        <div>
            <PageHeader
                title="Categories"
                subtitle="Hierarchical product categories - a category can sit inside another."
                actions={<>
                    <Segmented value={scope} onChange={setScope} options={[{ value: 'active', label: 'Active' }, { value: 'all', label: 'All' }]} />
                    <Btn variant="primary" icon={<LuPlus size={16} />} onClick={openCreate}>Add category</Btn>
                </>}
            />

            <FilterBar>
                <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search categories…" />
            </FilterBar>

            <TableCard footer={<p className="mt-4 text-sm text-gray-500">{orderedList.length} {orderedList.length === 1 ? 'category' : 'categories'}</p>}>
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className={`${TH} w-12`}>#</th>
                            <th className={TH}>Name</th>
                            <th className={TH}>Slug</th>
                            <th className={`${TH} text-right`}>Products</th>
                            <th className={TH}>Status</th>
                            <th className={TH}>Created</th>
                            <th className={`${TH} w-12`} />
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={7} rows={4} /> : orderedList.length === 0 ? (
                            <EmptyRow colSpan={7}>
                                {searchTerm ? 'No categories match your search.' : scope === 'active' ? 'No active categories.' : 'No categories yet.'}
                            </EmptyRow>
                        ) : orderedList.map(({ cat, depth }, i) => (
                            <tr key={cat._id} className={TR}>
                                <td className={`${TD} text-gray-400`}>{i + 1}</td>
                                <td className={TD}>
                                    <div className="flex min-w-[220px] items-center gap-3" style={{ paddingLeft: depth * 22 }}>
                                        {depth > 0 && <span className="-mr-1 font-mono text-gray-300">└</span>}
                                        <CategoryIcon cat={cat} size={32} />
                                        <div className="min-w-0">
                                            <button type="button" onClick={() => openEdit(cat)} className="text-left font-medium text-gray-900 hover:text-[var(--color-primary)]">
                                                {cat.name}
                                            </button>
                                            {depth > 0 && parentName(cat) && <p className="text-xs text-gray-400">in {parentName(cat)}</p>}
                                        </div>
                                    </div>
                                </td>
                                <td className={`${TD} font-mono text-[13px] text-gray-500`}>{cat.slug}</td>
                                <td className={`${TD} text-right`}>{cat.productCount || 0}</td>
                                <td className={TD}>
                                    <Badge tone={cat.isActive ? 'green' : 'gray'}>{cat.isActive ? 'Active' : 'Hidden'}</Badge>
                                </td>
                                <td className={`${TD} whitespace-nowrap text-gray-500`}>{fmtDateTime(cat.createdAt)}</td>
                                <td className={`${TD} text-right`}>
                                    <RowMenu items={[
                                        { label: 'Edit', icon: <LuPencil size={15} />, onClick: () => openEdit(cat) },
                                        cat.isActive
                                            ? { label: 'Hide from store', icon: <LuEyeOff size={15} />, onClick: () => handleToggleActive(cat) }
                                            : { label: 'Activate', icon: <LuEye size={15} />, onClick: () => handleToggleActive(cat) },
                                        { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: () => handleDelete(cat), danger: true },
                                    ]} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableCard>

            {/* ═══ Add / edit ═══ */}
            <Modal
                open={modalOpen}
                onClose={closeModal}
                title={editingId ? 'Edit category' : 'Add category'}
                footer={<>
                    <Btn onClick={closeModal}>Cancel</Btn>
                    <Btn variant="primary" onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving…' : editingId ? 'Save changes' : 'Create category'}
                    </Btn>
                </>}
            >
                <div className="space-y-4">
                    <Field label="Name" required error={fieldErrors.name}>
                        <input
                            className={cx(INPUT, fieldErrors.name && 'border-red-300')}
                            placeholder="e.g. Cookware, Kitchen Appliances"
                            value={form.name}
                            autoFocus
                            onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: '' })); }}
                        />
                    </Field>

                    <Field label="Parent category" hint="Leave empty for a top-level category." error={fieldErrors.parent}>
                        <select
                            className={cx(INPUT, 'cursor-pointer')}
                            value={form.parent}
                            onChange={(e) => { setForm((p) => ({ ...p, parent: e.target.value })); if (fieldErrors.parent) setFieldErrors((p) => ({ ...p, parent: '' })); }}
                        >
                            <option value="">— None (top level) —</option>
                            {parentOptions.map((opt) => <option key={opt._id} value={opt._id}>{opt.label}</option>)}
                        </select>
                    </Field>

                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Icon or image <span className="text-red-500">*</span></span>
                            <Segmented
                                value={iconTab}
                                onChange={setIconTab}
                                options={[{ value: 'emoji', label: 'Icon' }, { value: 'upload', label: 'Image' }]}
                            />
                        </div>

                        {(form.image || form.icon) && (
                            <div className="mb-2.5 flex items-center gap-3 rounded-xl border border-[var(--color-primary-border)] bg-[var(--color-primary-lightest)] px-3 py-2">
                                {form.image
                                    ? <img src={form.image} alt="" className="h-9 w-9 rounded-lg border border-gray-200 object-cover" />
                                    : <span className="text-3xl leading-none">{form.icon}</span>}
                                <p className="flex-1 text-sm text-gray-700">
                                    {form.image ? 'Uploaded image' : (ICON_OPTIONS.find((i) => i.emoji === form.icon)?.label || 'Custom icon')}
                                </p>
                                <button type="button" onClick={() => setForm((p) => ({ ...p, icon: '', image: '' }))} className="text-sm text-gray-500 hover:text-gray-800">
                                    Clear
                                </button>
                            </div>
                        )}

                        {iconTab === 'emoji' ? (
                            <div className={cx('grid max-h-56 grid-cols-5 gap-1.5 overflow-y-auto rounded-xl border bg-gray-50 p-2.5', fieldErrors.icon ? 'border-red-300' : 'border-gray-200')}>
                                {ICON_OPTIONS.map((opt) => {
                                    const on = form.icon === opt.emoji && !form.image;
                                    return (
                                        <button
                                            key={opt.emoji}
                                            type="button"
                                            title={opt.label}
                                            onClick={() => { setForm((p) => ({ ...p, icon: opt.emoji, image: '' })); if (fieldErrors.icon) setFieldErrors((p) => ({ ...p, icon: '' })); }}
                                            className={cx(
                                                'flex flex-col items-center gap-1 rounded-lg border bg-white px-1 py-2 transition',
                                                on ? 'border-[var(--color-primary)] shadow-[0_0_0_2px_rgba(var(--color-primary-rgb),0.15)]' : 'border-transparent hover:bg-gray-100',
                                            )}
                                        >
                                            <span className="text-2xl leading-none">{opt.emoji}</span>
                                            <span className="text-center text-[10px] leading-tight text-gray-500">{opt.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className={cx('rounded-xl border bg-gray-50 p-3', fieldErrors.icon ? 'border-red-300' : 'border-gray-200')}>
                                <SingleImageUploader
                                    label="Category image"
                                    value={form.image}
                                    onChange={(url) => {
                                        setForm((p) => ({ ...p, image: url, icon: url ? url : p.icon }));
                                        if (url && fieldErrors.icon) setFieldErrors((p) => ({ ...p, icon: '' }));
                                    }}
                                    hint="PNG, JPG, SVG or WebP"
                                />
                            </div>
                        )}
                        {fieldErrors.icon && !form.icon && !form.image && <p className="mt-1 text-xs text-red-600">{fieldErrors.icon}</p>}
                    </div>

                    <Field label="Description" hint="Optional.">
                        <textarea
                            className={TEXTAREA}
                            rows={2}
                            placeholder="Short description…"
                            value={form.description}
                            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                        />
                    </Field>

                    <div className="space-y-1 border-t border-gray-100 pt-3">
                        <Toggle label="Active" checked={form.isActive} onChange={(v) => setForm((p) => ({ ...p, isActive: v }))} />
                        <Toggle label="Show in menu" checked={form.showInMenu} onChange={(v) => setForm((p) => ({ ...p, showInMenu: v }))} />
                        <Toggle label="Show on homepage" checked={form.showInHome} onChange={(v) => setForm((p) => ({ ...p, showInHome: v }))} />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
