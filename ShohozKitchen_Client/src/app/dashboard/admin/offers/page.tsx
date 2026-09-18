"use client";

import React, { useState, useEffect } from 'react';
import {
    FiPlus,
    FiSearch,
    FiEdit2,
    FiTrash2,
    FiRefreshCw,
    FiZap,
    FiCalendar,
    FiX,
    FiPackage,
    FiTag,
    FiImage,
} from 'react-icons/fi';
import {
    useGetOffersQuery,
    useCreateOfferMutation,
    useUpdateOfferMutation,
    useDeleteOfferMutation,
} from '@/redux/api/offerApi';
import { useGetProductsQuery } from '@/redux/api/productApi';
import toast from 'react-hot-toast';

/* eslint-disable @typescript-eslint/no-explicit-any */

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in LOCAL time.
const toLocalInput = (date: string | Date): string => {
    const d = new Date(date);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

const displayDateTime = (date: string | Date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
};

const TYPE_META: Record<string, { label: string; color: string; icon: any }> = {
    'flash-sale': { label: 'Flash Sale', color: 'text-red-600 bg-red-50', icon: FiZap },
    deal: { label: 'Deal', color: 'text-amber-600 bg-amber-50', icon: FiTag },
    banner: { label: 'Banner', color: 'text-purple-600 bg-purple-50', icon: FiImage },
};

// Product multi-select box
const ProductPicker = ({
    items, selectedIds, onToggle, isLoading,
}: {
    items: any[]; selectedIds: string[]; onToggle: (id: string) => void; isLoading: boolean;
}) => {
    const [search, setSearch] = useState('');
    const filtered = items.filter((it) => (it.name || '').toLowerCase().includes(search.toLowerCase()));
    return (
        <div className="space-y-2 border border-gray-100 rounded-md p-3 bg-gray-50/30">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-500 uppercase">Products in this offer</label>
                <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-lightest)] px-2 py-0.5 rounded-full">
                    {selectedIds.length} Selected
                </span>
            </div>
            <div className="relative">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {isLoading ? (
                    <p className="text-[10px] text-gray-400 animate-pulse">Loading products...</p>
                ) : filtered.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">No products found</p>
                ) : (
                    filtered.map((it) => (
                        <label key={it._id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(it._id)}
                                onChange={() => onToggle(it._id)}
                                className="w-3.5 h-3.5 text-[var(--color-primary)] border-gray-300 rounded focus:ring-0"
                            />
                            {(it.thumbnail || it.images?.[0]) && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={it.thumbnail || it.images[0]} alt="" className="w-6 h-6 rounded object-cover" />
                            )}
                            <span className="text-xs text-gray-700 truncate flex-1">{it.name}</span>
                            <span className="text-[10px] font-semibold" style={{ color: 'var(--color-sale)' }}>৳{it.price}</span>
                        </label>
                    ))
                )}
            </div>
        </div>
    );
};

const emptyForm = () => ({
    title: 'Flash',
    subtitle: 'UP TO 70% OFF',
    type: 'flash-sale',
    products: [] as string[],
    bannerImage: '',
    link: '/products?sort=-discount',
    startTime: toLocalInput(new Date()),
    endTime: toLocalInput(new Date(Date.now() + 8 * 60 * 60 * 1000)),
    isActive: true,
    sortOrder: 0,
});

const OfferModal = ({
    isOpen, onClose, onSubmit, editing,
}: {
    isOpen: boolean; onClose: () => void; onSubmit: (data: any) => void; editing?: any;
}) => {
    const [form, setForm] = useState(emptyForm());
    const { data: productsData, isLoading: loadingProducts } = useGetProductsQuery({ limit: 1000 });

    useEffect(() => {
        if (editing) {
            setForm({
                title: editing.title || '',
                subtitle: editing.subtitle || '',
                type: editing.type || 'flash-sale',
                products: (editing.products || []).map((p: any) => (typeof p === 'string' ? p : p._id)),
                bannerImage: editing.bannerImage || '',
                link: editing.link || '',
                startTime: editing.startTime ? toLocalInput(editing.startTime) : toLocalInput(new Date()),
                endTime: editing.endTime ? toLocalInput(editing.endTime) : toLocalInput(new Date(Date.now() + 8 * 3600 * 1000)),
                isActive: editing.isActive ?? true,
                sortOrder: editing.sortOrder || 0,
            });
        } else {
            setForm(emptyForm());
        }
    }, [editing, isOpen]);

    if (!isOpen) return null;

    const change = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked
                : type === 'number' ? Number(value) : value,
        }));
    };

    const toggleProduct = (id: string) =>
        setForm((prev) => ({
            ...prev,
            products: prev.products.includes(id) ? prev.products.filter((p) => p !== id) : [...prev.products, id],
        }));

    const submit = () => {
        if (!form.title.trim()) return toast.error('Title is required');
        if (!form.endTime) return toast.error('End time is required');
        onSubmit({
            ...form,
            startTime: new Date(form.startTime).toISOString(),
            endTime: new Date(form.endTime).toISOString(),
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-md w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-lg">{editing ? 'Edit' : 'Create'} Offer</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><FiX size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Title</label>
                            <input name="title" type="text" value={form.title} onChange={change}
                                placeholder="Flash" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Subtitle</label>
                            <input name="subtitle" type="text" value={form.subtitle} onChange={change}
                                placeholder="UP TO 70% OFF" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Type</label>
                        <div className="grid grid-cols-3 gap-3">
                            {Object.entries(TYPE_META).map(([key, meta]) => (
                                <button key={key} type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, type: key }))}
                                    className={`flex flex-col items-center justify-center p-3 rounded-md border transition-all gap-2 ${form.type === key
                                        ? 'bg-[var(--color-primary-lightest)] border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                                    <meta.icon size={18} />
                                    <span className="text-[10px] font-bold uppercase">{meta.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {form.type === 'banner' ? (
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Banner Image URL</label>
                            <input name="bannerImage" type="text" value={form.bannerImage} onChange={change}
                                placeholder="https://..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium" />
                        </div>
                    ) : (
                        <ProductPicker
                            items={productsData?.data || []}
                            selectedIds={form.products}
                            onToggle={toggleProduct}
                            isLoading={loadingProducts}
                        />
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Start Time</label>
                            <input name="startTime" type="datetime-local" value={form.startTime} onChange={change}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">End Time (countdown)</label>
                            <input name="endTime" type="datetime-local" value={form.endTime} onChange={change}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">CTA Link</label>
                            <input name="link" type="text" value={form.link} onChange={change}
                                placeholder="/products?sort=-discount" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Sort Order</label>
                            <input name="sortOrder" type="number" value={form.sortOrder} onChange={change}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input name="isActive" type="checkbox" id="offerActive" checked={form.isActive}
                            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                            className="w-4 h-4 text-[var(--color-primary)] rounded focus:ring-0" />
                        <label htmlFor="offerActive" className="text-sm font-semibold text-gray-700">Offer is Active</label>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                    <button onClick={submit}
                        className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold shadow-md hover:bg-[var(--color-primary-dark)] transition-all">
                        {editing ? 'Update Offer' : 'Create Offer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function OffersPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [search, setSearch] = useState('');

    const { data: offersData, isLoading, refetch } = useGetOffersQuery(undefined);
    const [createOffer] = useCreateOfferMutation();
    const [updateOffer] = useUpdateOfferMutation();
    const [deleteOffer] = useDeleteOfferMutation();

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this offer?')) return;
        try {
            await deleteOffer(id).unwrap();
            toast.success('Offer deleted');
        } catch (err: any) {
            toast.error(err.data?.message || 'Delete failed');
        }
    };

    const handleSubmit = async (data: any) => {
        try {
            if (editing) {
                await updateOffer({ id: editing._id, ...data }).unwrap();
                toast.success('Offer updated');
            } else {
                await createOffer(data).unwrap();
                toast.success('Offer created');
            }
            setIsModalOpen(false);
        } catch (err: any) {
            toast.error(err.data?.message || 'Action failed');
        }
    };

    const offers = offersData?.data || [];
    const filtered = offers.filter((o: any) => (o.title || '').toLowerCase().includes(search.toLowerCase()));

    const isLive = (o: any) => o.isActive && new Date(o.startTime) <= new Date() && new Date(o.endTime) > new Date();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Offers & Flash Sales</h1>
                    <p className="text-gray-500 mt-1">Manage storefront flash sales, deals & promo banners</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => refetch()}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm">
                        <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    <button onClick={() => { setEditing(null); setIsModalOpen(true); }}
                        className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-md text-sm font-semibold hover:bg-[var(--color-primary-dark)] flex items-center gap-2 transition-all shadow-sm">
                        <FiPlus size={16} /> Add Offer
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm flex gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search by title..." value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none" />
                </div>
            </div>

            <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Offer</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Products</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Window</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                [...Array(4)].map((_, i) => (
                                    <tr key={i} className="animate-pulse"><td colSpan={6} className="px-6 py-4"><div className="h-12 bg-gray-100 rounded w-full" /></td></tr>
                                ))
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No offers yet. Click “Add Offer” to create a flash sale.</td></tr>
                            ) : (
                                filtered.map((o: any) => {
                                    const meta = TYPE_META[o.type] || TYPE_META['flash-sale'];
                                    return (
                                        <tr key={o._id} className="hover:bg-gray-50/50">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-md flex items-center justify-center ${meta.color}`}><meta.icon size={18} /></div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800">{o.title} {o.subtitle && <span className="text-gray-400 font-normal">· {o.subtitle}</span>}</p>
                                                        <p className="text-xs text-gray-400">{o.link}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${meta.color}`}>{meta.label}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-gray-600 flex items-center gap-1.5"><FiPackage size={12} className="text-gray-400" /> {o.products?.length || 0}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-xs text-gray-600 gap-0.5">
                                                    <span className="flex items-center gap-1.5"><FiCalendar size={11} className="text-gray-400" /> {displayDateTime(o.startTime)}</span>
                                                    <span className="flex items-center gap-1.5 text-gray-400">→ {displayDateTime(o.endTime)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${isLive(o) ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {isLive(o) ? 'Live' : o.isActive ? 'Scheduled/Ended' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button onClick={() => { setEditing(o); setIsModalOpen(true); }}
                                                        className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-md border border-gray-100 transition-colors"><FiEdit2 size={16} /></button>
                                                    <button onClick={() => handleDelete(o._id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md border border-gray-100 transition-colors"><FiTrash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <OfferModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSubmit} editing={editing} />

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
            `}</style>
        </div>
    );
}
