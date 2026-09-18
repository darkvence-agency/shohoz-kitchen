"use client";

import React from 'react';
import Link from 'next/link';
import {
    FiCreditCard,
    FiCheckCircle,
    FiClock,
    FiXCircle,
    FiSlash,
    FiRefreshCw,
    FiChevronRight,
    FiExternalLink,
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { useGetMyPaymentsQuery, useRetryPaymentMutation } from '@/redux/api/paymentApi';

const statusConfig: Record<string, { bg: string; text: string; icon: React.ElementType; label: string }> = {
    success: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: FiCheckCircle, label: 'Paid' },
    pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: FiClock, label: 'Pending' },
    initiated: { bg: 'bg-blue-50', text: 'text-blue-700', icon: FiClock, label: 'Initiated' },
    failed: { bg: 'bg-red-50', text: 'text-red-700', icon: FiXCircle, label: 'Failed' },
    cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', icon: FiSlash, label: 'Cancelled' },
};

const methodLabel = (m: string) =>
    ({ bkash: 'bKash', sslcommerz: 'SSLCommerz', cod: 'Cash on Delivery' } as Record<string, string>)[m] || (m || '—').toUpperCase();

const StatusBadge = ({ status }: { status: string }) => {
    const cfg = statusConfig[status] || statusConfig.pending;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.bg} ${cfg.text}`}>
            <Icon size={12} />
            {cfg.label}
        </span>
    );
};

const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

const orderRef = (order: any) =>
    typeof order === 'object' && order !== null ? order._id : order;

const orderLabel = (order: any) => {
    if (typeof order === 'object' && order !== null) {
        return order.orderId || order.orderNumber || (order._id ? `#${String(order._id).slice(-8).toUpperCase()}` : '—');
    }
    return order ? `#${String(order).slice(-8).toUpperCase()}` : '—';
};

export default function MyPaymentsPage() {
    const { data, isLoading } = useGetMyPaymentsQuery({});
    const [retryPayment, { isLoading: isRetrying }] = useRetryPaymentMutation();

    const payments: any[] = data?.data || [];

    const handleRetry = async (transactionId: string) => {
        try {
            const res = await retryPayment(transactionId).unwrap();
            const redirectUrl = res?.data?.redirectUrl;
            if (redirectUrl) {
                window.location.href = redirectUrl;
                return;
            }
            toast.error('Could not restart payment. Please try again.');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Could not restart payment. Please try again.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Payments</h1>
                        <p className="text-sm text-gray-400 mt-1">Your payment & transaction history</p>
                    </div>
                    <Link
                        href="/dashboard/user/orders"
                        className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all flex items-center gap-2"
                    >
                        View Orders
                        <FiChevronRight size={16} />
                    </Link>
                </div>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
                            <div className="flex justify-between mb-3">
                                <div className="h-5 bg-gray-200 rounded w-28" />
                                <div className="h-6 bg-gray-200 rounded w-16" />
                            </div>
                            <div className="h-4 bg-gray-100 rounded w-40" />
                        </div>
                    ))}
                </div>
            ) : payments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center">
                    <FiCreditCard size={48} className="mx-auto text-gray-200 mb-4" />
                    <h3 className="text-lg font-bold text-gray-600 mb-1">No payments yet</h3>
                    <p className="text-sm text-gray-400 mb-6">Your online payment transactions will show up here.</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm hover:brightness-95 transition-all"
                    >
                        Start Shopping
                    </Link>
                </div>
            ) : (
                <>
                    {/* ── Desktop table ── */}
                    <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50/70 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                    <th className="px-5 py-3.5">Date</th>
                                    <th className="px-5 py-3.5">Order</th>
                                    <th className="px-5 py-3.5">Method</th>
                                    <th className="px-5 py-3.5 text-right">Amount</th>
                                    <th className="px-5 py-3.5 text-center">Status</th>
                                    <th className="px-5 py-3.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {payments.map((p) => {
                                    const canRetry = p.status === 'failed' || p.status === 'cancelled';
                                    const oid = orderRef(p.order);
                                    return (
                                        <tr key={p._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                                            <td className="px-5 py-4">
                                                {oid ? (
                                                    <Link
                                                        href={`/dashboard/user/orders/${oid}`}
                                                        className="inline-flex items-center gap-1 font-semibold text-gray-700 hover:text-[var(--color-primary)] transition-colors"
                                                    >
                                                        {orderLabel(p.order)}
                                                        <FiExternalLink size={12} />
                                                    </Link>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-gray-600">{methodLabel(p.method)}</td>
                                            <td className="px-5 py-4 text-right font-bold text-gray-900">৳{Number(p.amount || 0).toLocaleString()}</td>
                                            <td className="px-5 py-4 text-center"><StatusBadge status={p.status} /></td>
                                            <td className="px-5 py-4 text-right">
                                                {canRetry ? (
                                                    <button
                                                        onClick={() => handleRetry(p._id)}
                                                        disabled={isRetrying}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold hover:brightness-95 transition-all disabled:opacity-60"
                                                    >
                                                        <FiRefreshCw size={12} />
                                                        Retry
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-300">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Mobile cards ── */}
                    <div className="md:hidden space-y-3">
                        {payments.map((p) => {
                            const canRetry = p.status === 'failed' || p.status === 'cancelled';
                            const oid = orderRef(p.order);
                            return (
                                <div key={p._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <p className="text-base font-bold text-gray-900">৳{Number(p.amount || 0).toLocaleString()}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(p.createdAt)}</p>
                                        </div>
                                        <StatusBadge status={p.status} />
                                    </div>
                                    <div className="flex items-center justify-between text-xs border-t border-gray-50 pt-3">
                                        <span className="text-gray-500 font-semibold">{methodLabel(p.method)}</span>
                                        {oid ? (
                                            <Link
                                                href={`/dashboard/user/orders/${oid}`}
                                                className="inline-flex items-center gap-1 font-semibold text-gray-600 hover:text-[var(--color-primary)]"
                                            >
                                                {orderLabel(p.order)}
                                                <FiExternalLink size={11} />
                                            </Link>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </div>
                                    {canRetry && (
                                        <button
                                            onClick={() => handleRetry(p._id)}
                                            disabled={isRetrying}
                                            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:brightness-95 transition-all disabled:opacity-60"
                                        >
                                            <FiRefreshCw size={13} />
                                            Retry Payment
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
