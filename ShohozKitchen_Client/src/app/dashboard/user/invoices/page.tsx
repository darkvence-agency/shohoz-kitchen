"use client";

import React from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiFileText, FiDownload, FiChevronRight } from 'react-icons/fi';
import { useGetMyOrdersQuery } from '@/redux/api/orderApi';
import { downloadInvoicePdf } from '@/lib/downloadInvoice';
import { getStatusConfig } from '@/lib/orderStatus';

export default function UserInvoicesPage() {
    // Surface far more than the default page (10) — this list has no pagination of its own.
    const { data: ordersData, isLoading } = useGetMyOrdersQuery({ limit: 100 });
    const orders: any[] = ordersData?.data || ordersData?.orders || [];

    const [downloadingId, setDownloadingId] = React.useState<string | null>(null);

    const handleDownload = async (order: any) => {
        const id = order._id || order.orderId;
        setDownloadingId(id);
        try {
            await downloadInvoicePdf(id);
        } catch (err: any) {
            toast.error(err?.message || 'Failed to download invoice');
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[var(--color-primary-lightest)] flex items-center justify-center text-[var(--color-primary)]">
                        <FiFileText size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">My Invoices</h1>
                        <p className="text-sm text-gray-400 mt-0.5">Download invoices for your orders</p>
                    </div>
                </div>
            </div>

            {/* Loading state */}
            {isLoading ? (
                <div className="space-y-3">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-gray-100 flex-shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-40"></div>
                                <div className="h-3 bg-gray-100 rounded w-24"></div>
                            </div>
                            <div className="h-9 bg-gray-100 rounded-xl w-28"></div>
                        </div>
                    ))}
                </div>
            ) : orders.length === 0 ? (
                /* Empty state */
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                    <FiFileText size={48} className="mx-auto text-gray-200 mb-4" />
                    <h3 className="text-lg font-bold text-gray-600 mb-1">No invoices yet</h3>
                    <p className="text-sm text-gray-400 mb-4">Place an order and your invoices will show up here</p>
                    <Link href="/products" className="inline-block text-[var(--color-primary)] font-bold text-sm hover:underline">
                        Start Shopping
                    </Link>
                </div>
            ) : (
                /* Invoice list */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                    {orders.map((order) => {
                        const id = order._id || order.orderId;
                        const orderRef = order.orderId || order.orderNumber || id;
                        const invoiceNo = 'INV-' + orderRef;
                        const cfg = getStatusConfig(order.status);
                        return (
                            <div key={id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                                <div className="w-11 h-11 rounded-xl bg-[var(--color-primary-lightest)] flex items-center justify-center text-[var(--color-primary)] flex-shrink-0">
                                    <FiFileText size={18} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-gray-800 font-mono">{invoiceNo}</p>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
                                            {cfg.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {order.createdAt
                                            ? new Date(order.createdAt).toLocaleDateString('en-US', {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                            })
                                            : '—'}
                                    </p>
                                </div>

                                <div className="text-left sm:text-right">
                                    <p className="text-base font-bold text-[var(--color-primary)]">৳{order.total?.toLocaleString() || 0}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDownload(order)}
                                        disabled={downloadingId === id}
                                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50 transition-all"
                                    >
                                        <FiDownload size={14} />
                                        {downloadingId === id ? '...' : 'Download'}
                                    </button>
                                    <Link
                                        href={`/dashboard/user/orders/${id}`}
                                        className="hidden sm:inline-flex items-center justify-center w-9 h-9 rounded-xl text-gray-300 hover:text-[var(--color-primary)] hover:bg-gray-100 transition-all"
                                        title="View order"
                                    >
                                        <FiChevronRight size={18} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
