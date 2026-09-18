/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from 'react';
import {
    FiMail, FiTrash2, FiSearch, FiCheckCircle, FiClock,
    FiX, FiMessageSquare, FiPackage, FiPhone
} from 'react-icons/fi';
import {
    useGetInquiriesQuery,
    useUpdateInquiryStatusMutation,
    useDeleteInquiryMutation
} from '@/redux/api/inquiryApi';
import { toast } from 'react-hot-toast';

const InquiriesPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
    const [page, setPage] = useState(1);

    const { data, isLoading, refetch } = useGetInquiriesQuery({
        searchTerm: searchTerm || undefined,
        status: statusFilter || undefined,
        page,
        limit: 15,
    });

    const [updateStatus] = useUpdateInquiryStatusMutation();
    const [deleteInquiry] = useDeleteInquiryMutation();

    const inquiries = data?.data || [];
    const meta = data?.meta || {};

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await updateStatus({ id, data: { status } }).unwrap();
            toast.success(`Marked as ${status}`);
            refetch();
            if (selectedInquiry?._id === id) {
                setSelectedInquiry((prev: any) => ({ ...prev, status }));
            }
        } catch {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Delete this inquiry?')) return;
        try {
            await deleteInquiry(id).unwrap();
            toast.success('Inquiry deleted');
            refetch();
            if (selectedInquiry?._id === id) setSelectedInquiry(null);
        } catch {
            toast.error('Failed to delete');
        }
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-700',
            read: 'bg-blue-100 text-blue-700',
            resolved: 'bg-green-100 text-green-700',
        };
        return map[status] || 'bg-gray-100 text-gray-600';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-md border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Inquiries</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage customer product inquiries</p>
                </div>
                <div className="flex gap-3">
                    <div className="px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm font-bold text-yellow-700">
                        {inquiries.filter((i: any) => i.status === 'pending').length} Pending
                    </div>
                    <button onClick={() => refetch()} className="px-4 py-2 border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 transition-all bg-white">
                        Refresh
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Total', value: meta.total || inquiries.length, color: 'blue', icon: FiMessageSquare },
                    { label: 'Pending', value: inquiries.filter((i: any) => i.status === 'pending').length, color: 'yellow', icon: FiClock },
                    { label: 'Resolved', value: inquiries.filter((i: any) => i.status === 'resolved').length, color: 'green', icon: FiCheckCircle },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600`}>
                            <stat.icon size={22} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-medium">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                <div className="relative flex-1">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, product or message..."
                        className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)] transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-[var(--color-primary)] cursor-pointer"
                >
                    <option value="">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="read">Read</option>
                    <option value="resolved">Resolved</option>
                </select>
            </div>

            <div className="flex gap-6">
                {/* Inquiry List */}
                <div className="flex-1 bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-20 text-center">
                            <div className="animate-spin w-10 h-10 border-4 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-gray-500">Loading inquiries...</p>
                        </div>
                    ) : inquiries.length === 0 ? (
                        <div className="p-20 text-center">
                            <FiMail size={40} className="text-gray-200 mx-auto mb-4" />
                            <h3 className="font-bold text-gray-700">No inquiries found</h3>
                            <p className="text-sm text-gray-400 mt-1">Customer inquiries will appear here</p>
                        </div>
                    ) : (
                        <div>
                            {inquiries.map((inq: any) => (
                                <div
                                    key={inq._id}
                                    onClick={() => { setSelectedInquiry(inq); if (inq.status === 'pending') handleStatusUpdate(inq._id, 'read'); }}
                                    className={`flex items-start gap-4 px-5 py-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-all ${selectedInquiry?._id === inq._id ? 'bg-[var(--color-primary)]/5 border-l-4 border-l-[var(--color-primary)]' : ''}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${inq.status === 'pending' ? 'bg-yellow-500' : inq.status === 'resolved' ? 'bg-green-600' : 'bg-blue-500'}`}>
                                        {(inq.name || inq.customerName || 'U')[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm font-bold truncate ${inq.status === 'pending' ? 'text-gray-900' : 'text-gray-600'}`}>
                                                {inq.name || inq.customerName || 'Anonymous'}
                                            </p>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase flex-shrink-0 ${statusBadge(inq.status)}`}>
                                                {inq.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--color-primary)] font-medium truncate mt-0.5 flex items-center gap-1">
                                            {inq.product ? <FiPackage size={11} /> : <FiMessageSquare size={11} />}
                                            <span>{inq.product?.name || inq.subject || inq.productName || 'General Inquiry'}</span>
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1 truncate">{inq.message}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 flex-shrink-0">
                                        {new Date(inq.createdAt).toLocaleDateString('en-BD', { day: '2-digit', month: 'short' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {meta.pages > 1 && (
                        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50 text-sm">
                            <span className="text-gray-500">Page {page} of {meta.pages}</span>
                            <div className="flex gap-2">
                                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border border-gray-200 rounded-md bg-white disabled:opacity-40 hover:bg-gray-50">Prev</button>
                                <button disabled={page === meta.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border border-gray-200 rounded-md bg-white disabled:opacity-40 hover:bg-gray-50">Next</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detail Panel */}
                {selectedInquiry && (
                    <div className="w-[380px] flex-shrink-0 bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden self-start sticky top-4">
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                            <h3 className="font-bold text-gray-800">Inquiry Detail</h3>
                            <button onClick={() => setSelectedInquiry(null)} className="p-1.5 hover:bg-gray-100 rounded-md transition-all text-gray-400">
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* Customer Info */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-gray-400 uppercase">Customer</h4>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                                    <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-bold">
                                        {(selectedInquiry.name || selectedInquiry.customerName || 'U')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{selectedInquiry.name || selectedInquiry.customerName || 'Anonymous'}</p>
                                        {selectedInquiry.email && <p className="text-xs text-gray-500 flex items-center gap-1"><FiMail size={10} /> {selectedInquiry.email}</p>}
                                        {selectedInquiry.phone && <p className="text-xs text-gray-500 flex items-center gap-1"><FiPhone size={10} /> {selectedInquiry.phone}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Subject / Category */}
                            {selectedInquiry.subject && (
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase">Subject</h4>
                                    <div className="p-3 bg-gray-50 rounded-md border border-gray-100 flex items-center gap-2">
                                        <FiMessageSquare size={14} className="text-[var(--color-primary)] shrink-0" />
                                        <span className="text-sm font-semibold text-gray-800">{selectedInquiry.subject}</span>
                                    </div>
                                </div>
                            )}

                            {/* Product (if product-specific) */}
                            {(selectedInquiry.product || selectedInquiry.productName) && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase">Product</h4>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                                        {selectedInquiry.product?.thumbnail && (
                                            <img src={selectedInquiry.product.thumbnail} className="w-10 h-10 rounded-md object-cover border border-gray-200" alt="" />
                                        )}
                                        <p className="text-sm font-semibold text-[var(--color-primary)]">{selectedInquiry.product?.name || selectedInquiry.productName}</p>
                                    </div>
                                </div>
                            )}

                            {/* Message */}
                            <div className="space-y-2">
                                <h4 className="text-xs font-bold text-gray-400 uppercase">Message</h4>
                                <div className="p-4 bg-gray-50 rounded-md border border-gray-100">
                                    <p className="text-sm text-gray-700 leading-relaxed">{selectedInquiry.message}</p>
                                </div>
                            </div>

                            {/* Date */}
                            <p className="text-xs text-gray-400">
                                Received: {new Date(selectedInquiry.createdAt).toLocaleString('en-BD')}
                            </p>

                            {/* Actions */}
                            <div className="space-y-2 pt-2">
                                <h4 className="text-xs font-bold text-gray-400 uppercase">Actions</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {selectedInquiry.status !== 'resolved' && (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedInquiry._id, 'resolved')}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-[var(--color-primary)] text-white rounded-md text-sm font-bold hover:bg-[var(--color-primary-dark)] transition-all"
                                        >
                                            <FiCheckCircle size={15} /> Resolve
                                        </button>
                                    )}
                                    {selectedInquiry.status === 'resolved' && (
                                        <button
                                            onClick={() => handleStatusUpdate(selectedInquiry._id, 'pending')}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-yellow-500 text-white rounded-md text-sm font-bold hover:bg-yellow-600 transition-all"
                                        >
                                            <FiClock size={15} /> Reopen
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(selectedInquiry._id)}
                                        className="flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-md text-sm font-bold hover:bg-red-100 transition-all"
                                    >
                                        <FiTrash2 size={15} /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InquiriesPage;
