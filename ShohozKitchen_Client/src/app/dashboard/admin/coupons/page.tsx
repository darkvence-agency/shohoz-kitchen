/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/purity */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from 'react';
import {
    FiPlus,
    FiSearch,
    FiEdit2,
    FiTrash2,
    FiRefreshCw,
    FiTag,
    FiPercent,
    FiCalendar,
    FiX,
    FiLayers,
    FiPackage,
    FiTruck,
} from 'react-icons/fi';
import {
    useGetCouponsQuery,
    useCreateCouponMutation,
    useUpdateCouponMutation,
    useDeleteCouponMutation,
} from '@/redux/api/couponApi';
import { useGetProductsQuery } from '@/redux/api/productApi';
import { useGetCategoriesQuery } from '@/redux/api/categoryApi';
import toast from 'react-hot-toast';

const formatDate = (date: string | Date) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
};

const displayDate = (date: string | Date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

// Multi-select like component for products/categories
const SelectionBox = ({
    label,
    items,
    selectedIds,
    onToggle,
    isLoading
}: {
    label: string,
    items: any[],
    selectedIds: string[],
    onToggle: (id: string) => void,
    isLoading: boolean
}) => {
    const [search, setSearch] = useState('');
    const filteredItems = items.filter(item =>
        (item.name || item.title || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-2 border border-gray-100 rounded-md p-3 bg-gray-50/30">
            <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
                <span className="text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-lightest)] px-2 py-0.5 rounded-full">
                    {selectedIds.length} Selected
                </span>
            </div>
            <div className="relative">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                <input
                    type="text"
                    placeholder={`Search ${label.toLowerCase()}...`}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {isLoading ? (
                    <p className="text-[10px] text-gray-400 animate-pulse">Loading items...</p>
                ) : filteredItems.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">No items found</p>
                ) : (
                    filteredItems.map(item => (
                        <label key={item._id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition-colors">
                            <input
                                type="checkbox"
                                checked={selectedIds.includes(item._id)}
                                onChange={() => onToggle(item._id)}
                                className="w-3.5 h-3.5 text-[var(--color-primary)] border-gray-300 rounded focus:ring-0"
                            />
                            <span className="text-xs text-gray-700 truncate">{item.name || item.title}</span>
                        </label>
                    ))
                )}
            </div>
        </div>
    );
};

// Modal Component for Create/Edit
const CouponModal = ({
    isOpen,
    onClose,
    onSubmit,
    editingCoupon
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    editingCoupon?: any;
}) => {
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        maxDiscount: '',
        minPurchase: '',
        startDate: formatDate(new Date()),
        endDate: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        usageLimit: '',
        usagePerUser: '1',
        applicableTo: 'all',
        specificProducts: [] as string[],
        specificCategories: [] as string[],
        isActive: true,
    });

    const { data: productsData, isLoading: isLoadingProducts } = useGetProductsQuery({ limit: 1000 });
    const { data: categoriesData, isLoading: isLoadingCategories } = useGetCategoriesQuery({ limit: 1000 });

    useEffect(() => {
        if (editingCoupon) {
            setFormData({
                code: editingCoupon.code || '',
                name: editingCoupon.name || '',
                description: editingCoupon.description || '',
                discountType: editingCoupon.discountType || 'percentage',
                discountValue: editingCoupon.discountValue !== undefined && editingCoupon.discountValue !== null ? String(editingCoupon.discountValue) : '',
                maxDiscount: editingCoupon.maxDiscount ? String(editingCoupon.maxDiscount) : '',
                minPurchase: (editingCoupon.minOrderAmount ?? editingCoupon.minPurchase) ? String(editingCoupon.minOrderAmount ?? editingCoupon.minPurchase) : '',
                startDate: editingCoupon.startDate ? formatDate(editingCoupon.startDate) : formatDate(new Date()),
                endDate: editingCoupon.expiresAt ? formatDate(editingCoupon.expiresAt) : (editingCoupon.endDate ? formatDate(editingCoupon.endDate) : formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))),
                usageLimit: editingCoupon.usageLimit ? String(editingCoupon.usageLimit) : '',
                usagePerUser: editingCoupon.usagePerUser ? String(editingCoupon.usagePerUser) : '1',
                applicableTo: editingCoupon.applicableTo || 'all',
                specificProducts: editingCoupon.specificProducts || [],
                specificCategories: editingCoupon.specificCategories || [],
                isActive: editingCoupon.isActive ?? true,
            });
        } else {
            setFormData({
                code: '',
                name: '',
                description: '',
                discountType: 'percentage',
                discountValue: '',
                maxDiscount: '',
                minPurchase: '',
                startDate: formatDate(new Date()),
                endDate: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                usageLimit: '',
                usagePerUser: '1',
                applicableTo: 'all',
                specificProducts: [],
                specificCategories: [],
                isActive: true,
            });
        }
    }, [editingCoupon, isOpen]);

    if (!isOpen) return null;

    const numericFields = ['discountValue', 'minPurchase', 'maxDiscount', 'usageLimit', 'usagePerUser'];

    const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key) ||
            e.ctrlKey || e.metaKey) {
            return;
        }
        if (!/^[0-9]$/.test(e.key)) {
            e.preventDefault();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let finalValue = value;
        if (numericFields.includes(name)) {
            finalValue = value.replace(/[^0-9]/g, '');
            if (name === 'discountValue' && formData.discountType === 'percentage' && Number(finalValue) > 100) {
                finalValue = '100';
            }
        }
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : finalValue
        }));
    };

    const toggleItem = (listName: 'specificProducts' | 'specificCategories', id: string) => {
        setFormData(prev => ({
            ...prev,
            [listName]: prev[listName].includes(id)
                ? prev[listName].filter(i => i !== id)
                : [...prev[listName], id]
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-md w-full max-w-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-bold text-gray-800 text-lg">{editingCoupon ? 'Edit' : 'Create'} Coupon</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors"><FiX size={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Coupon Code</label>
                            <input
                                name="code"
                                type="text"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-bold uppercase"
                                placeholder="MEGA2024"
                                value={formData.code}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Display Name</label>
                            <input
                                name="name"
                                type="text"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                                placeholder="Summer Sale"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Description</label>
                        <textarea
                            name="description"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium h-20 resize-none"
                            placeholder="Get 20% off on all items..."
                            value={formData.description}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Applicability Selection */}
                    <div className="space-y-4 pt-2 border-t border-gray-100">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Apply Coupon To</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'all', label: 'Full Store', icon: FiPackage },
                                    { id: 'specific_products', label: 'Specific Products', icon: FiTag },
                                    { id: 'specific_categories', label: 'Specific Categories', icon: FiLayers },
                                ].map((option) => (
                                    <button
                                        key={option.id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, applicableTo: option.id }))}
                                        className={`flex flex-col items-center justify-center p-3 rounded-md border transition-all gap-2 ${formData.applicableTo === option.id
                                                ? 'bg-[var(--color-primary-lightest)] border-[var(--color-primary)] text-[var(--color-primary)] shadow-sm'
                                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                            }`}
                                    >
                                        <option.icon size={18} />
                                        <span className="text-[10px] font-bold uppercase">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {formData.applicableTo === 'specific_products' && (
                            <SelectionBox
                                label="Products"
                                items={productsData?.data || []}
                                selectedIds={formData.specificProducts}
                                onToggle={(id) => toggleItem('specificProducts', id)}
                                isLoading={isLoadingProducts}
                            />
                        )}

                        {formData.applicableTo === 'specific_categories' && (
                            <SelectionBox
                                label="Categories"
                                items={categoriesData?.data || []}
                                selectedIds={formData.specificCategories}
                                onToggle={(id) => toggleItem('specificCategories', id)}
                                isLoading={isLoadingCategories}
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Discount Type</label>
                            <select
                                name="discountType"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                                value={formData.discountType}
                                onChange={handleChange}
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (৳)</option>
                                <option value="free_shipping">Free Shipping</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Discount Value</label>
                            <input
                                name="discountValue"
                                type="text"
                                inputMode="numeric"
                                placeholder={formData.discountType === 'percentage' ? 'e.g. 20 (for 20%)' : 'e.g. 100'}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium disabled:bg-gray-100 disabled:text-gray-400"
                                disabled={formData.discountType === 'free_shipping'}
                                value={formData.discountType === 'free_shipping' ? '' : formData.discountValue}
                                onChange={handleChange}
                                onKeyDown={handleNumericKeyDown}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Min Purchase (৳)</label>
                            <input
                                name="minPurchase"
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g. 500 (optional)"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                                value={formData.minPurchase}
                                onChange={handleChange}
                                onKeyDown={handleNumericKeyDown}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Max Discount (৳ - Percentage only)</label>
                            <input
                                name="maxDiscount"
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g. 200 (optional)"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium disabled:bg-gray-100 disabled:text-gray-400"
                                disabled={formData.discountType !== 'percentage'}
                                value={formData.maxDiscount}
                                onChange={handleChange}
                                onKeyDown={handleNumericKeyDown}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Start Date</label>
                            <input
                                name="startDate"
                                type="date"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                                value={formData.startDate}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">End Date</label>
                            <input
                                name="endDate"
                                type="date"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                                value={formData.endDate}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Total Usage Limit</label>
                            <input
                                name="usageLimit"
                                type="text"
                                inputMode="numeric"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                                placeholder="Leave empty for unlimited"
                                value={formData.usageLimit}
                                onChange={handleChange}
                                onKeyDown={handleNumericKeyDown}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Limit Per User</label>
                            <input
                                name="usagePerUser"
                                type="text"
                                inputMode="numeric"
                                placeholder="e.g. 1"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none font-medium"
                                value={formData.usagePerUser}
                                onChange={handleChange}
                                onKeyDown={handleNumericKeyDown}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            name="isActive"
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                            className="w-4 h-4 text-[var(--color-primary)] rounded focus:ring-0"
                        />
                        <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">Coupon is Active</label>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
                    <button
                        onClick={() => onSubmit(formData)}
                        className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold shadow-md hover:bg-[var(--color-primary-dark)] transition-all"
                    >
                        {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function CouponsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<any>(null);
    const [search, setSearch] = useState('');

    const { data: couponsData, isLoading, refetch } = useGetCouponsQuery(undefined);
    const [createCoupon] = useCreateCouponMutation();
    const [updateCoupon] = useUpdateCouponMutation();
    const [deleteCoupon] = useDeleteCouponMutation();

    const handleCreate = () => {
        setEditingCoupon(null);
        setIsModalOpen(true);
    };

    const handleEdit = (coupon: any) => {
        setEditingCoupon(coupon);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this coupon?')) return;
        try {
            await deleteCoupon(id).unwrap();
            toast.success('Coupon deleted');
        } catch (err: any) {
            toast.error(err.data?.message || 'Delete failed');
        }
    };

    const handleSubmit = async (data: any) => {
        // Map the form to the coupon model's actual fields.
        const payload: any = {
            code: data.code,
            description: data.description || data.name || '',
            discountType: data.discountType,
            discountValue: data.discountType === 'free_shipping' ? 0 : Number(data.discountValue) || 0,
            maxDiscount: data.discountType === 'percentage' ? (Number(data.maxDiscount) || null) : null,
            minOrderAmount: Number(data.minPurchase) || 0,
            expiresAt: data.endDate,
            isActive: data.isActive,
            // Applicability + per-user + start date (now honored server-side).
            applicableTo: data.applicableTo || 'all',
            specificProducts: data.applicableTo === 'specific_products' ? (data.specificProducts || []) : [],
            specificCategories: data.applicableTo === 'specific_categories' ? (data.specificCategories || []) : [],
            usagePerUser: Number(data.usagePerUser) || 1,
            startDate: data.startDate || null,
        };
        if (data.usageLimit) payload.usageLimit = Number(data.usageLimit);
        try {
            if (editingCoupon) {
                await updateCoupon({ id: editingCoupon._id, ...payload }).unwrap();
                toast.success('Coupon updated');
            } else {
                await createCoupon(payload).unwrap();
                toast.success('Coupon created');
            }
            setIsModalOpen(false);
        } catch (err: any) {
            toast.error(err.data?.message || 'Action failed');
        }
    };

    const coupons = couponsData?.data || [];
    const filteredCoupons = coupons.filter((c: any) =>
        (c.code || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.description || c.name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Coupons & Discounts</h1>
                    <p className="text-gray-500 mt-1">Manage promotional codes and special offers</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => refetch()}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm"
                    >
                        <FiRefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-md text-sm font-semibold hover:bg-[var(--color-primary-dark)] flex items-center gap-2 transition-all shadow-sm"
                    >
                        <FiPlus size={16} />
                        Add Coupon
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by code or name..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Coupons List */}
            <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Coupon Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Discount</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Applicable To</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Validity</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4"><div className="h-12 bg-gray-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No coupons found.</td>
                                </tr>
                            ) : (
                                filteredCoupons.map((coupon: any) => (
                                    <tr key={coupon._id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-md bg-[var(--color-primary-lightest)] flex items-center justify-center text-[var(--color-primary)]">
                                                    <FiTag size={20} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">{coupon.code}</p>
                                                    <p className="text-xs text-gray-500">{coupon.description || coupon.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                                                    {coupon.discountType === 'percentage' ? <><FiPercent size={14} /> {coupon.discountValue}%</>
                                                        : coupon.discountType === 'free_shipping' ? <><FiTruck size={14} /> Free Shipping</>
                                                        : <>৳{coupon.discountValue}</>}
                                                </span>
                                                <span className="text-[10px] text-gray-400 mt-0.5">Min. Order: ৳{coupon.minOrderAmount ?? coupon.minPurchase ?? 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {coupon.applicableTo === 'specific_products' ? (
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                                                        <FiTag className="text-purple-500" size={12} /> {coupon.specificProducts?.length || 0} Product{(coupon.specificProducts?.length || 0) !== 1 ? 's' : ''}
                                                    </span>
                                                ) : coupon.applicableTo === 'specific_categories' ? (
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                                                        <FiLayers className="text-amber-500" size={12} /> {coupon.specificCategories?.length || 0} {(coupon.specificCategories?.length || 0) !== 1 ? 'Categories' : 'Category'}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5">
                                                        <FiPackage className="text-blue-500" size={12} /> All Products
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-xs text-gray-600 gap-1">
                                                <p className="flex items-center gap-1.5 font-medium leading-none"><FiCalendar size={12} className="text-gray-400" /> {displayDate(coupon.expiresAt)}</p>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase w-fit mt-1 ${coupon.isActive && new Date(coupon.expiresAt) > new Date()
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-red-50 text-red-700'
                                                    }`}>
                                                    {coupon.isActive && new Date(coupon.expiresAt) > new Date() ? 'Active' : 'Expired'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(coupon)}
                                                    className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 rounded-md border border-gray-100 transition-colors"
                                                >
                                                    <FiEdit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(coupon._id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md border border-gray-100 transition-colors"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CouponModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                editingCoupon={editingCoupon}
            />

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(0,0,0,0.1);
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
