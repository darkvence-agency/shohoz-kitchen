"use client";

import React, { useState } from 'react';
import {
    FiCreditCard, FiDollarSign, FiSearch,
    FiCheckCircle, FiClock, FiXCircle,
    FiTrendingUp, FiArrowUp,
} from 'react-icons/fi';
import { useGetAdminOrdersQuery } from '@/redux/api/orderApi';
import { useGetDashboardSummaryQuery } from '@/redux/api/dashboardApi';

export default function PaymentsPage() {
    const [page, setPage] = useState(1);
    const [paymentFilter, setPaymentFilter] = useState('');
    const [search, setSearch] = useState('');

    const { data: ordersData, isLoading } = useGetAdminOrdersQuery({
        page,
        limit: 15,
        paymentStatus: paymentFilter || undefined,
        searchTerm: search || undefined,
    });

    const { data: summaryData } = useGetDashboardSummaryQuery(undefined);

    const orders = ordersData?.data || [];
    const meta = ordersData?.meta || { total: 0, totalPages: 1 };
    const stats = summaryData?.data || {};

    const formatCurrency = (n: number) => `৳${(n || 0).toLocaleString()}`;

    const paymentStatusConfig: Record<string, { bg: string; text: string; icon: any }> = {
        paid: { bg: 'bg-green-50', text: 'text-green-700', icon: FiCheckCircle },
        pending: { bg: 'bg-amber-50', text: 'text-amber-700', icon: FiClock },
        failed: { bg: 'bg-red-50', text: 'text-red-700', icon: FiXCircle },
        refunded: { bg: 'bg-purple-50', text: 'text-purple-700', icon: FiArrowUp },
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Payments</h1>
                    <p className="text-gray-500 mt-1">Track all payment transactions and revenue</p>
                </div>
            </div>

            {/* Revenue Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue || 0), icon: FiDollarSign, color: 'var(--color-primary)', bg: 'bg-green-50' },
                    { label: "Today's Revenue", value: formatCurrency(stats.todayRevenue || 0), icon: FiTrendingUp, color: '#3B82F6', bg: 'bg-blue-50' },
                    { label: 'Paid Orders', value: (stats.paidOrders || 0).toLocaleString(), icon: FiCheckCircle, color: 'var(--color-primary)', bg: 'bg-emerald-50' },
                    { label: 'Pending Payments', value: (stats.pendingPayments || 0).toLocaleString(), icon: FiClock, color: '#D97706', bg: 'bg-amber-50' },
                ].map((item, i) => (
                    <div key={i} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-lg ${item.bg} flex items-center justify-center`}>
                                <item.icon size={20} style={{ color: item.color }} />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{item.value}</p>
                        <p className="text-xs text-gray-500 font-medium mt-1">{item.label}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by order number, customer name..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] outline-none text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {['', 'paid', 'pending', 'failed', 'refunded'].map((status) => (
                        <button
                            key={status}
                            onClick={() => { setPaymentFilter(status); setPage(1); }}
                            className={`px-3 py-2 rounded-md text-xs font-bold uppercase transition-all border ${
                                paymentFilter === status
                                    ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-md'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {status || 'All'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Method</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                [...Array(8)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4"><div className="h-10 bg-gray-100 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center">
                                        <FiCreditCard size={36} className="text-gray-200 mx-auto mb-3" />
                                        <p className="text-gray-400 font-medium">No payment records found</p>
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order: any) => {
                                    const ps = paymentStatusConfig[order.paymentStatus] || paymentStatusConfig.pending;
                                    return (
                                        <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-gray-800">{order.orderId}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{order.items?.length || 0} items</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-gray-700">
                                                    {order.user?.firstName ? `${order.user.firstName} ${order.user.lastName || ''}` : order.shippingAddress?.fullName || 'Guest'}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {order.user?.email || ''}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 border border-gray-100 rounded text-xs font-bold text-gray-600 uppercase">
                                                    <FiCreditCard size={12} />
                                                    {order.paymentMethod || 'COD'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-[var(--color-primary)]">{formatCurrency(order.total)}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold capitalize ${ps.bg} ${ps.text}`}>
                                                    <ps.icon size={12} />
                                                    {order.paymentStatus}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs text-gray-500 font-medium">
                                                    {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {meta.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <p className="text-xs text-gray-500">
                            Showing page {page} of {meta.totalPages} ({meta.total} total)
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm disabled:opacity-40 hover:bg-gray-50"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                                disabled={page === meta.totalPages}
                                className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm disabled:opacity-40 hover:bg-gray-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
