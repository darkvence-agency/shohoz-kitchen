"use client";

import React, { useState } from 'react';
import {
    FiMapPin,
    FiPlus,
    FiEdit2,
    FiTrash2,
    FiX,
    FiUser,
    FiPhone,
    FiHome,
    FiCheck,
} from 'react-icons/fi';
import { useGetMyAddressesQuery, useAddAddressMutation, useUpdateAddressMutation, useDeleteAddressMutation } from '@/redux/api/userApi';

interface Address {
    _id: string;
    fullName: string;
    phone: string;
    address: string;
    city: string;
    area: string;
    zipCode?: string;
    postalCode?: string;   // backend stores the zip as `postalCode`
    isDefault?: boolean;
    label?: string;
}

const emptyAddress = {
    fullName: '', phone: '', address: '', city: '', area: '', zipCode: '', label: 'Home',
};

export default function AddressesPage() {
    const { data, isLoading } = useGetMyAddressesQuery({});
    const [addAddress, { isLoading: adding }] = useAddAddressMutation();
    const [updateAddress, { isLoading: updating }] = useUpdateAddressMutation();
    const [deleteAddress] = useDeleteAddressMutation();

    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState(emptyAddress);

    const addresses: Address[] = data?.data || [];

    const openAdd = () => {
        setEditingId(null);
        setForm(emptyAddress);
        setShowModal(true);
    };

    const openEdit = (addr: Address) => {
        setEditingId(addr._id);
        setForm({
            fullName: addr.fullName,
            phone: addr.phone,
            address: addr.address,
            city: addr.city,
            area: addr.area,
            zipCode: addr.postalCode || addr.zipCode || '',
            label: addr.label || 'Home',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                await updateAddress({ id: editingId, ...form }).unwrap();
            } else {
                await addAddress(form).unwrap();
            }
            setShowModal(false);
            setForm(emptyAddress);
        } catch (err) {
            console.error('Failed to save address', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this address?')) {
            try {
                await deleteAddress(id).unwrap();
            } catch (err) {
                console.error('Failed to delete address', err);
            }
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await updateAddress({ id, isDefault: true }).unwrap();
        } catch (err) {
            console.error('Failed to set default address', err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">My Addresses</h1>
                        <p className="text-sm text-gray-400 mt-1">Manage your shipping addresses</p>
                    </div>
                    <button
                        onClick={openAdd}
                        className="w-full sm:w-auto px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] transition-all shadow-md shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2 flex-shrink-0"
                    >
                        <FiPlus size={16} />
                        Add New
                    </button>
                </div>
            </div>

            {/* Addresses Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
                            <div className="h-4 bg-gray-100 rounded w-48 mb-2"></div>
                            <div className="h-4 bg-gray-100 rounded w-36"></div>
                        </div>
                    ))}
                </div>
            ) : addresses.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center shadow-sm">
                    <FiMapPin size={48} className="mx-auto text-gray-200 mb-4" />
                    <h3 className="text-lg font-bold text-gray-600 mb-1">No addresses yet</h3>
                    <p className="text-sm text-gray-400 mb-4">Add your first shipping address</p>
                    <button
                        onClick={openAdd}
                        className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] transition-all shadow-md"
                    >
                        Add Address
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                        <div key={addr._id} className={`bg-white rounded-2xl border p-5 shadow-sm relative group transition-all ${
                            addr.isDefault ? 'border-[var(--color-primary)]/30 ring-1 ring-[var(--color-primary)]/10' : 'border-gray-100 hover:border-gray-200'
                        }`}>
                            {/* Label Badge */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-md uppercase">
                                        {addr.label || 'Home'}
                                    </span>
                                    {addr.isDefault && (
                                        <span className="px-2.5 py-0.5 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-bold rounded-md flex items-center gap-1">
                                            <FiCheck size={10} /> Default
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => openEdit(addr)}
                                        className="p-2 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                                    >
                                        <FiEdit2 size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(addr._id)}
                                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-all"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm font-bold text-gray-800 mb-1">{addr.fullName}</p>
                            <p className="text-sm text-gray-500">{addr.address}</p>
                            <p className="text-sm text-gray-500">{addr.city}, {addr.area}</p>
                            <p className="text-sm text-gray-500">Zip: {addr.postalCode || addr.zipCode || '—'}</p>
                            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-50">
                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                    <FiPhone size={12} />
                                    <span>{addr.phone}</span>
                                </div>
                                {!addr.isDefault && (
                                    <button
                                        onClick={() => handleSetDefault(addr._id)}
                                        disabled={updating}
                                        className="text-xs font-semibold text-[var(--color-primary)] hover:underline disabled:opacity-50 flex items-center gap-1"
                                    >
                                        <FiCheck size={12} /> Set as Default
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800">
                                {editingId ? 'Edit Address' : 'Add New Address'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
                                <FiX size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            {/* Label Selector */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Label</label>
                                <div className="flex gap-2">
                                    {['Home', 'Office', 'Other'].map((label) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => setForm({ ...form, label })}
                                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                                                form.label === label
                                                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">Full Name</label>
                                    <input type="text" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary)] outline-none text-sm transition-all" placeholder="John Doe" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">Phone</label>
                                    <input type="tel" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary)] outline-none text-sm transition-all" placeholder="+880 XXXX" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">Address</label>
                                <textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary)] outline-none text-sm transition-all resize-none h-20" placeholder="House, Road, Area..." />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">City</label>
                                    <input type="text" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary)] outline-none text-sm transition-all" placeholder="Dhaka" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">Area</label>
                                    <input type="text" required value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary)] outline-none text-sm transition-all" placeholder="Mirpur" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">Zip Code</label>
                                    <input type="text" required value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-primary)] outline-none text-sm transition-all" placeholder="1200" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-3">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-all">
                                    Cancel
                                </button>
                                <button type="submit" disabled={adding || updating}
                                    className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl text-sm font-semibold hover:bg-[var(--color-primary-dark)] transition-all shadow-md disabled:opacity-50">
                                    {adding || updating ? 'Saving...' : editingId ? 'Update' : 'Add Address'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
