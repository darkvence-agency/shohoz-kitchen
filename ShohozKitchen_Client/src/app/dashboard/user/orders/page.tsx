"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
    FiPackage,
    FiSearch,
    FiChevronRight,
    FiShoppingBag,
    FiMapPin,
    FiCreditCard,
} from 'react-icons/fi';
import { useGetMyOrdersQuery } from '@/redux/api/orderApi';
import { getStatusConfig, paymentMethodLabel } from '@/lib/orderStatus';

const StatusBadge = ({ status }: { status: string }) => {
    const cfg = getStatusConfig(status);
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
            <Icon size={12} />
            {cfg.label}
        </span>
    );
};

function MyOrdersContent() {
    const searchParams = useSearchParams();
    // "My Cancellations" links here with ?status=cancelled — honour any incoming filter.
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);

    // Keep the active tab in sync when the URL's ?status= changes (e.g. sidebar nav)
    useEffect(() => {
        const s = searchParams.get('status') || 'all';
        setStatusFilter(s);
        setPage(1);
    }, [searchParams]);

    // Debounce the order-number search so we don't hit the server on every keystroke.
    useEffect(() => {
        const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [search]);

    const { data, isLoading } = useGetMyOrdersQuery({
        page,
        limit: 10,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        searchTerm: debouncedSearch || undefined,   // QueryBuilder.search() reads `searchTerm`
    });

    const orders = data?.data || [];
    const meta = data?.meta || { total: 0, totalPages: 1 };

    const statusTabs = [
        { id: 'all', label: 'All' },
        { id: 'pending', label: 'Pending' },
        { id: 'processing', label: 'Processing' },
        { id: 'shipped', label: 'Shipped' },
        { id: 'on_the_way', label: 'On The Way' },
        { id: 'out_for_delivery', label: 'Out For Delivery' },
        { id: 'delivered', label: 'Delivered' },
        { id: 'cancelled', label: 'Cancelled' },
        { id: 'returned', label: 'Returned' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
                        <p className="text-sm text-gray-400 mt-1">Track and manage your orders</p>
                    </div>
                    <Link
                        href="/"
                        className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm hover:bg-[var(--color-primary-dark)] transition-all shadow-md shadow-[var(--color-primary)]/20 flex items-center gap-2"
                    >
                        <FiShoppingBag size={16} />
                        Continue Shopping
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                {/* Status Tabs — wrap on mobile so every status stays visible & tappable */}
                <div className="flex flex-wrap gap-2 pb-3 mb-3 border-b border-gray-50">
                    {statusTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setStatusFilter(tab.id); setPage(1); }}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[13px] sm:text-sm font-semibold whitespace-nowrap transition-all ${
                                statusFilter === tab.id
                                    ? 'bg-[var(--color-primary)] text-white shadow-md shadow-[var(--color-primary)]/20'
                                    : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input
                        type="text"
                        placeholder="Search by order number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl text-sm outline-none focus:border-[var(--color-primary)] focus:bg-white transition-all"
                    />
                </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3">
                {isLoading ? (
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm animate-pulse">
                            <div className="flex justify-between mb-4">
                                <div className="h-5 bg-gray-200 rounded w-32"></div>
                                <div className="h-6 bg-gray-200 rounded w-20"></div>
                            </div>
                            <div className="h-4 bg-gray-100 rounded w-48 mb-2"></div>
                            <div className="h-4 bg-gray-100 rounded w-36"></div>
                        </div>
                    ))
                ) : orders.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center">
                        <FiPackage size={48} className="mx-auto text-gray-200 mb-4" />
                        <h3 className="text-lg font-bold text-gray-600 mb-1">No orders found</h3>
                        <p className="text-sm text-gray-400">
                            {statusFilter !== 'all' ? 'Try changing the filter' : 'Start shopping to see your orders here'}
                        </p>
                    </div>
                ) : (
                    orders.map((order: any) => (
                        <Link
                            key={order._id}
                            href={`/dashboard/user/orders/${order._id}`}
                            className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group"
                        >
                            <div className="p-4 sm:p-5">
                                {/* Top Row */}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-gray-800 truncate">
                                            {order.orderId || order.orderNumber || `Order #${order._id?.slice(-8).toUpperCase()}`}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <StatusBadge status={order.status} />
                                </div>

                                {/* Items: thumbnails + product names & quantity */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex -space-x-2 flex-shrink-0">
                                        {order.items?.slice(0, 3).map((item: any, idx: number) => (
                                            <div key={idx} className="w-11 h-11 rounded-lg bg-gray-50 border-2 border-white overflow-hidden shadow-sm">
                                                {item.thumbnail || item.image ? (
                                                    <img src={item.thumbnail || item.image} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <FiPackage size={14} />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {order.items?.length > 3 && (
                                            <div className="w-11 h-11 rounded-lg bg-gray-100 border-2 border-white flex items-center justify-center text-xs font-bold text-gray-500 shadow-sm">
                                                +{order.items.length - 3}
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        {order.items?.slice(0, 2).map((item: any, idx: number) => (
                                            <p key={idx} className="text-[13px] font-medium text-gray-700 truncate leading-snug">
                                                {item.name}
                                                {item.quantity > 1 && <span className="text-gray-400 font-normal"> × {item.quantity}</span>}
                                            </p>
                                        ))}
                                        {order.items?.length > 2 && (
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                +{order.items.length - 2} more item{order.items.length - 2 !== 1 ? 's' : ''}
                                            </p>
                                        )}
                                        {(!order.items || order.items.length === 0) && (
                                            <p className="text-xs text-gray-400">No items</p>
                                        )}
                                    </div>
                                </div>

                                {/* Delivery destination */}
                                {order.shippingAddress && (
                                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                                        <FiMapPin size={13} className="flex-shrink-0" />
                                        <span className="truncate">
                                            {order.shippingAddress.fullName}
                                            {order.shippingAddress.city ? ` · ${order.shippingAddress.city}` : ''}
                                            {order.shippingAddress.phone ? ` · ${order.shippingAddress.phone}` : ''}
                                        </span>
                                    </div>
                                )}

                                {/* Bottom Row */}
                                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3 border-t border-gray-50">
                                    <div className="flex items-center gap-2 text-xs">
                                        <FiCreditCard size={13} className="text-gray-300 flex-shrink-0" />
                                        <span className="text-gray-500 font-bold tracking-wide">
                                            {paymentMethodLabel(order.paymentMethod)}
                                        </span>
                                        <span className={`font-bold capitalize ${order.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                            · {order.paymentStatus || 'Pending'}
                                        </span>
                                        <span className="text-gray-300 whitespace-nowrap">· {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex items-center gap-3 ml-auto">
                                        <div className="text-right leading-none">
                                            <span className="block text-[10px] text-gray-400 mb-0.5">Total</span>
                                            <span className="block text-lg font-bold text-[var(--color-primary)]">৳{order.total?.toLocaleString()}</span>
                                        </div>
                                        <FiChevronRight size={16} className="text-gray-300 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Pagination */}
            {meta.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 transition-all"
                    >
                        Previous
                    </button>
                    <span className="text-sm font-bold text-gray-500">
                        Page {page} of {meta.totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                        disabled={page === meta.totalPages}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-40 transition-all"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

export default function MyOrdersPage() {
    return (
        <Suspense fallback={<div className="space-y-6"><div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm h-24 animate-pulse" /></div>}>
            <MyOrdersContent />
        </Suspense>
    );
}
