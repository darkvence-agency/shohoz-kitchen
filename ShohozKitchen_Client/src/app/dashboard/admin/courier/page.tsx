"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
    FiSearch, FiRefreshCw, FiTruck, FiPackage, FiExternalLink,
    FiChevronLeft, FiChevronRight, FiDollarSign, FiX,
} from 'react-icons/fi';
import {
    useGetCourierPackagesQuery,
    useBulkBookCourierMutation,
    useBulkRefreshCourierMutation,
    useBookCourierPackageMutation,
    useRefreshCourierStatusMutation,
    useGetCourierBalanceQuery,
    type ICourierPackage,
} from '@/redux/api/courierApi';
import { getStatusConfig, paymentMethodLabel } from '@/lib/orderStatus';
import OrderItemsPreview from '@/components/shared/OrderItemsPreview';
import BookCourierModal from '@/components/admin/courier/BookCourierModal';

const STATE_TABS = [
    { key: 'all', label: 'All' },
    { key: 'to_ship', label: 'To Ship' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'delivered', label: 'Delivered' },
    { key: 'cancelled', label: 'Cancelled' },
];

// Package states where booking / sync no longer apply (already final).
const TERMINAL_STATES = ['delivered', 'cancelled', 'returned', 'refunded'];

export default function CourierShipmentsPage() {
    const [state, setState] = useState('to_ship');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Record<string, ICourierPackage>>({});
    const limit = 20;

    const { data, isLoading, isFetching, refetch } = useGetCourierPackagesQuery({
        state: state !== 'all' ? state : undefined,
        search: search || undefined,
        page,
        limit,
    });
    const { data: balanceData } = useGetCourierBalanceQuery();

    const [bulkBook, { isLoading: booking }] = useBulkBookCourierMutation();
    const [bulkRefresh, { isLoading: refreshing }] = useBulkRefreshCourierMutation();

    // Per-row "click & go" single actions (primary path).
    const [bookTarget, setBookTarget] = useState<ICourierPackage | null>(null);
    const [bookOne, { isLoading: bookingOne }] = useBookCourierPackageMutation();
    const [refreshOne] = useRefreshCourierStatusMutation();
    const [syncingId, setSyncingId] = useState<string | null>(null);

    const rows: ICourierPackage[] = data?.data || [];
    const meta = data?.meta || { total: 0, page: 1, limit, totalPages: 1 };
    const balance = balanceData?.data?.current_balance;

    const selectedList = useMemo(() => Object.values(selected), [selected]);
    const selectedCount = selectedList.length;
    const selectedCod = selectedList.reduce((s, p) => s + (p.codAmount || 0), 0);

    const toggle = (pkg: ICourierPackage) =>
        setSelected((prev) => {
            const next = { ...prev };
            if (next[pkg.packageId]) delete next[pkg.packageId];
            else next[pkg.packageId] = pkg;
            return next;
        });

    const allOnPageSelected = rows.length > 0 && rows.every((r) => selected[r.packageId]);
    const toggleAll = () =>
        setSelected((prev) => {
            const next = { ...prev };
            if (allOnPageSelected) rows.forEach((r) => delete next[r.packageId]);
            else rows.forEach((r) => (next[r.packageId] = r));
            return next;
        });

    const clearSelection = () => setSelected({});

    const refresh = () => refetch();

    const doBulkBook = async () => {
        const items = selectedList.filter((p) => !p.booked).map((p) => ({ orderId: p.orderId, packageId: p.packageId }));
        if (!items.length) {
            toast.error('No unbooked package selected.');
            return;
        }
        try {
            const res = await bulkBook({ items }).unwrap();
            const r = res.data;
            toast.success(`Booked ${r.booked}/${r.total} with Steadfast`);
            if (r.failed) toast(`${r.failed} failed — ${r.results.find((x) => !x.ok)?.error || 'see order'}`, { icon: '⚠️', duration: 6000 });
            clearSelection();
        } catch (e: any) {
            toast.error(e?.data?.message || 'Bulk booking failed');
        }
    };

    const doBulkRefresh = async () => {
        const items = selectedList.filter((p) => p.booked).map((p) => ({ orderId: p.orderId, packageId: p.packageId }));
        if (!items.length) {
            toast.error('No booked package selected.');
            return;
        }
        try {
            const res = await bulkRefresh({ items }).unwrap();
            const r = res.data;
            toast.success(`Synced ${r.ok}/${r.total} from Steadfast`);
            const needs = r.results.filter((x) => x.needsConfirmation).length;
            if (needs) toast(`${needs} reported delivered/cancelled — confirm on the order to settle earnings.`, { icon: 'ℹ️', duration: 7000 });
            clearSelection();
        } catch (e: any) {
            toast.error(e?.data?.message || 'Bulk sync failed');
        }
    };

    // Single-package book — confirmed from the modal (the primary "click & go" flow).
    const confirmBook = async (pkg: ICourierPackage) => {
        try {
            await bookOne({ orderId: pkg.orderId, packageId: pkg.packageId }).unwrap();
            toast.success(`Booked ${pkg.orderNo} with Steadfast`);
            setBookTarget(null);
        } catch (e: any) {
            toast.error(e?.data?.message || 'Booking failed');
        }
    };

    // Single-package status sync (per row).
    const syncOne = async (pkg: ICourierPackage) => {
        setSyncingId(pkg.packageId);
        try {
            const res: any = await refreshOne({ orderId: pkg.orderId, packageId: pkg.packageId }).unwrap();
            const d = res?.data || res;
            if (d?.needsConfirmation) {
                toast(`${pkg.orderNo}: courier reports "${d.courierStatus}". Confirm on the order to settle earnings.`, { icon: 'ℹ️', duration: 7000 });
            } else {
                toast.success(`${pkg.orderNo} synced — ${d?.courierStatus || 'updated'}`);
            }
        } catch (e: any) {
            toast.error(e?.data?.message || 'Sync failed');
        } finally {
            setSyncingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-md border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <FiTruck className="text-[#4F46E5]" size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Courier — Shipments</h1>
                        <p className="text-sm text-gray-500 mt-0.5">Book parcels with Steadfast & sync delivery status in bulk</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 rounded-md bg-emerald-50 border border-emerald-100 flex items-center gap-2">
                        <FiDollarSign className="text-emerald-600" size={16} />
                        <div className="leading-tight">
                            <p className="text-[10px] text-emerald-700/70 font-semibold uppercase">Steadfast Balance</p>
                            <p className="text-sm font-bold text-emerald-700">
                                {typeof balance === 'number' ? `৳${balance.toLocaleString()}` : '—'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={refresh}
                        className="px-4 py-2.5 bg-white border border-gray-200 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center gap-2 shadow-sm"
                    >
                        <FiRefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* How-it-works guide — answers "how do I book?" at a glance */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-md px-4 py-3 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#4F46E5] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <FiTruck size={13} />
                </div>
                <p className="text-sm text-indigo-900/80 leading-relaxed">
                    <span className="font-bold">How booking works:</span> open the{' '}
                    <span className="font-semibold">To Ship</span> tab → click{' '}
                    <span className="font-semibold text-[#4F46E5]">Book Courier</span> on a parcel → review &amp; confirm → then track the delivery right here.{' '}
                    <span className="text-indigo-900/60">Booking many at once? Tick the checkboxes and use the action bar that appears on top.</span>
                </p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-md p-4 shadow-sm border border-gray-200 space-y-4">
                {/* State tabs */}
                <div className="flex flex-wrap gap-2">
                    {STATE_TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => { setState(t.key); setPage(1); }}
                            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${state === t.key
                                ? 'bg-[#4F46E5] text-white shadow-md'
                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search order no, customer, phone, tracking…"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-md focus:border-[#4F46E5] focus:bg-white outline-none text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Bulk action bar */}
            {selectedCount > 0 && (
                <div className="bg-[#1f2937] text-white rounded-md px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="font-bold">{selectedCount} selected</span>
                        <span className="text-gray-300">COD total: <span className="font-bold text-white">৳{selectedCod.toLocaleString()}</span></span>
                        <button onClick={clearSelection} className="text-gray-300 hover:text-white flex items-center gap-1 text-xs">
                            <FiX size={14} /> clear
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={doBulkBook}
                            disabled={booking}
                            className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] rounded-md text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                            <FiPackage size={15} /> {booking ? 'Booking…' : 'Book Selected'}
                        </button>
                        <button
                            onClick={doBulkRefresh}
                            disabled={refreshing}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                        >
                            <FiRefreshCw size={15} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Syncing…' : 'Refresh Selected'}
                        </button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                {/* Desktop / tablet: table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-4 py-3 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allOnPageSelected}
                                        onChange={toggleAll}
                                        className="w-4 h-4 accent-[#4F46E5] cursor-pointer"
                                    />
                                </th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Courier</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">View</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                [...Array(8)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-4 py-4"><div className="h-4 w-4 bg-gray-100 rounded" /></td>
                                        {[...Array(8)].map((__, j) => (
                                            <td key={j} className="px-4 py-4"><div className="h-4 bg-gray-100 rounded w-20" /></td>
                                        ))}
                                    </tr>
                                ))
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center">
                                        <FiTruck size={44} className="mx-auto text-gray-200 mb-3" />
                                        <p className="text-gray-500">No packages in this view</p>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((p) => {
                                    const cfg = getStatusConfig(p.status);
                                    const isSel = !!selected[p.packageId];
                                    return (
                                        <tr key={p.packageId} className={`transition-colors ${isSel ? 'bg-indigo-50/40' : 'hover:bg-gray-50/50'}`}>
                                            <td className="px-4 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={isSel}
                                                    onChange={() => toggle(p)}
                                                    className="w-4 h-4 accent-[#4F46E5] cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-semibold text-[#4F46E5]">{p.orderNo}</p>
                                                <p className="text-[11px] text-gray-400">{p.itemCount} item{p.itemCount > 1 ? 's' : ''}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <OrderItemsPreview items={p.items} totalCount={p.itemCount} />
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-medium text-gray-800 text-sm">{p.customer}</p>
                                                <p className="text-xs text-gray-400">{p.phone}{p.city ? ` · ${p.city}` : ''}</p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm text-gray-700">Shohoz Kitchen</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p className="font-bold text-gray-800">৳{p.subtotal?.toLocaleString()}</p>
                                                {p.codAmount > 0
                                                    ? <p className="text-[11px] font-semibold text-emerald-600">COD ৳{p.codAmount.toLocaleString()}</p>
                                                    : <p className="text-[11px] text-gray-400">{paymentMethodLabel(p.paymentMethod)} · paid</p>}
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>
                                                    {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {p.booked ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="leading-tight">
                                                            <p className="font-mono text-xs font-bold text-gray-700">{p.trackingNumber || '—'}</p>
                                                            {p.courierStatus && <p className="text-[11px] text-gray-400">{p.courierStatus}</p>}
                                                        </div>
                                                        {!TERMINAL_STATES.includes(p.status) && (
                                                            <button
                                                                onClick={() => syncOne(p)}
                                                                disabled={syncingId === p.packageId}
                                                                className="p-1.5 rounded-md text-gray-400 hover:text-[#4F46E5] hover:bg-indigo-50 disabled:opacity-50"
                                                                title="Sync delivery status"
                                                            >
                                                                <FiRefreshCw size={14} className={syncingId === p.packageId ? 'animate-spin' : ''} />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : TERMINAL_STATES.includes(p.status) ? (
                                                    <span className="text-[11px] font-semibold text-gray-400">—</span>
                                                ) : (
                                                    <button
                                                        onClick={() => setBookTarget(p)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] shadow-sm"
                                                    >
                                                        <FiTruck size={13} /> Book Courier
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-4 py-4 text-right">
                                                <Link
                                                    href={`/dashboard/admin/orders/${p.orderId}`}
                                                    className="inline-flex p-2 rounded-md text-gray-400 hover:text-[#4F46E5] hover:bg-indigo-50"
                                                    title="Open order"
                                                >
                                                    <FiExternalLink size={16} />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile: cards */}
                <div className="lg:hidden divide-y divide-gray-100">
                    {!isLoading && rows.length > 0 && (
                        <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-50/60 text-xs font-semibold text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={allOnPageSelected} onChange={toggleAll} className="w-4 h-4 accent-[#4F46E5]" />
                            Select all on this page
                        </label>
                    )}
                    {isLoading ? (
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="p-4 animate-pulse"><div className="h-24 bg-gray-100 rounded-lg" /></div>
                        ))
                    ) : rows.length === 0 ? (
                        <div className="px-6 py-12 text-center">
                            <FiTruck size={44} className="mx-auto text-gray-200 mb-3" />
                            <p className="text-gray-500">No packages in this view</p>
                        </div>
                    ) : (
                        rows.map((p) => {
                            const cfg = getStatusConfig(p.status);
                            const isSel = !!selected[p.packageId];
                            return (
                                <div key={p.packageId} className={`p-4 space-y-3 ${isSel ? 'bg-indigo-50/40' : ''}`}>
                                    {/* Header: checkbox + order + status */}
                                    <div className="flex items-start gap-3">
                                        <input
                                            type="checkbox"
                                            checked={isSel}
                                            onChange={() => toggle(p)}
                                            className="w-4 h-4 mt-1 accent-[#4F46E5] cursor-pointer shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <p className="font-semibold text-[#4F46E5]">{p.orderNo}</p>
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.badgeBg} ${cfg.badgeText}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-400">{p.itemCount} item{p.itemCount > 1 ? 's' : ''}</p>
                                        </div>
                                    </div>

                                    {/* Product preview */}
                                    <OrderItemsPreview items={p.items} totalCount={p.itemCount} />

                                    {/* Customer + amount */}
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-800 text-sm truncate">{p.customer}</p>
                                            <p className="text-xs text-gray-400 truncate">{p.phone}{p.city ? ` · ${p.city}` : ''}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-bold text-gray-800">৳{p.subtotal?.toLocaleString()}</p>
                                            {p.codAmount > 0
                                                ? <p className="text-[11px] font-semibold text-emerald-600">COD ৳{p.codAmount.toLocaleString()}</p>
                                                : <p className="text-[11px] text-gray-400">{paymentMethodLabel(p.paymentMethod)} · paid</p>}
                                        </div>
                                    </div>

                                    {/* Courier action + view */}
                                    <div className="flex items-center justify-between gap-2 pt-1">
                                        {p.booked ? (
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="leading-tight min-w-0">
                                                    <p className="font-mono text-xs font-bold text-gray-700 truncate">{p.trackingNumber || '—'}</p>
                                                    {p.courierStatus && <p className="text-[11px] text-gray-400">{p.courierStatus}</p>}
                                                </div>
                                                {!TERMINAL_STATES.includes(p.status) && (
                                                    <button
                                                        onClick={() => syncOne(p)}
                                                        disabled={syncingId === p.packageId}
                                                        className="p-1.5 rounded-md text-gray-400 hover:text-[#4F46E5] hover:bg-indigo-50 disabled:opacity-50 shrink-0"
                                                        title="Sync delivery status"
                                                    >
                                                        <FiRefreshCw size={14} className={syncingId === p.packageId ? 'animate-spin' : ''} />
                                                    </button>
                                                )}
                                            </div>
                                        ) : TERMINAL_STATES.includes(p.status) ? (
                                            <span className="text-[11px] font-semibold text-gray-400">—</span>
                                        ) : (
                                            <button
                                                onClick={() => setBookTarget(p)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-white bg-[#4F46E5] hover:bg-[#4338CA] shadow-sm"
                                            >
                                                <FiTruck size={13} /> Book Courier
                                            </button>
                                        )}
                                        <Link
                                            href={`/dashboard/admin/orders/${p.orderId}`}
                                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-[#4F46E5] bg-indigo-50 hover:bg-indigo-100 shrink-0"
                                        >
                                            <FiExternalLink size={14} /> Open
                                        </Link>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                    <p className="text-sm text-gray-500">
                        Showing <span className="text-gray-900 font-medium">{rows.length}</span> of <span className="text-gray-900 font-medium">{meta.total}</span> packages
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage((x) => Math.max(1, x - 1))}
                            disabled={page === 1}
                            className="p-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            <FiChevronLeft size={18} />
                        </button>
                        <span className="text-sm text-gray-600 px-2">{page} / {meta.totalPages}</span>
                        <button
                            onClick={() => setPage((x) => Math.min(meta.totalPages, x + 1))}
                            disabled={page >= meta.totalPages}
                            className="p-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            <FiChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Click-&-go booking confirmation */}
            <BookCourierModal
                pkg={bookTarget}
                isBooking={bookingOne}
                onClose={() => setBookTarget(null)}
                onConfirm={confirmBook}
            />
        </div>
    );
}
