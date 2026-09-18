/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { LuPlus, LuDownload, LuEye, LuExternalLink, LuStickyNote, LuX, LuPackage } from 'react-icons/lu';
import {
    useGetAdminOrdersQuery,
    useUpdateOrderStatusMutation,
    useUpdatePaymentStatusMutation,
    useGetOrderStatsQuery,
    useAddAdminNoteMutation,
} from '@/redux/api/orderApi';
import { useGetProductsQuery } from '@/redux/api/productApi';
import { toast } from 'react-hot-toast';
import { ORDER_STATUS_CONFIG, getStatusConfig, paymentMethodLabel } from '@/lib/orderStatus';
import {
    PageHeader, Btn, SearchInput, SelectPill, FilterBar, StatTile, BadgeSelect, TableCard,
    TH, TD, TR, EmptyRow, SkeletonRows, Pager, RowMenu, Modal, TEXTAREA, taka, fmtDateTime, cx, type Tone,
} from '@/components/admin/ui';

const PAGE_SIZE = 10;

const ORDER_TONE: Record<string, Tone> = {
    pending: 'amber', confirmed: 'blue', processing: 'purple', shipped: 'indigo', on_the_way: 'sky',
    out_for_delivery: 'teal', delivery_attempt: 'orange', delivered: 'green', cancelled: 'red',
    returned: 'gray', refunded: 'rose',
};

const PAYMENT: Record<string, { label: string; tone: Tone }> = {
    pending: { label: 'Unpaid', tone: 'red' },
    paid: { label: 'Paid', tone: 'green' },
    failed: { label: 'Failed', tone: 'red' },
    refunded: { label: 'Refunded', tone: 'purple' },
};

const STATUS_OPTIONS = Object.entries(ORDER_STATUS_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }));
const PAYMENT_OPTIONS = Object.entries(PAYMENT).map(([value, p]) => ({ value, label: p.label }));

const customerName = (o: any) =>
    o.shippingAddress?.fullName || `${o.user?.firstName || ''} ${o.user?.lastName || ''}`.trim() || 'Guest';
const customerPhone = (o: any) => o.shippingAddress?.phone || o.user?.phone || '';
const parcelId = (o: any) => (o.packages || []).map((p: any) => p.consignmentId).filter(Boolean).join(', ');

/** What has been paid and what is still owed on an order. */
function money(o: any) {
    const total = Number(o.total || 0);
    if (o.paymentStatus === 'paid') return { paid: total, due: 0 };
    if (o.paymentStatus === 'refunded') return { paid: 0, due: 0, refunded: true };
    // A cancelled order is owed nothing.
    if (o.status === 'cancelled') return { paid: 0, due: 0 };
    return { paid: 0, due: total };
}

function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}

export default function OrdersPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [paymentFilter, setPaymentFilter] = useState('all');
    const [productFilter, setProductFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState('');
    const [noteFor, setNoteFor] = useState<any>(null);
    const [noteText, setNoteText] = useState('');
    const q = useDebounced(search);

    const { data: ordersData, isLoading, isFetching } = useGetAdminOrdersQuery({
        page,
        limit: PAGE_SIZE,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        paymentStatus: paymentFilter !== 'all' ? paymentFilter : undefined,
        'items.product': productFilter !== 'all' ? productFilter : undefined,
        searchTerm: q || undefined,
    });
    const { data: statsData } = useGetOrderStatsQuery({});
    const { data: productsData } = useGetProductsQuery({ limit: 200, sort: 'name', fields: 'name' });
    const [updateStatus] = useUpdateOrderStatusMutation();
    const [updatePayment] = useUpdatePaymentStatusMutation();
    const [addNote, { isLoading: isSavingNote }] = useAddAdminNoteMutation();

    const orders: any[] = ordersData?.data || [];
    const meta = ordersData?.meta || { total: 0, totalPages: 1 };
    const stats = statsData?.data || {};
    const products: any[] = productsData?.data || [];

    // Any change of filter or page starts a fresh selection.
    const resetPage = () => { setPage(1); setSelected(new Set()); };
    const goToPage = (p: number) => { setPage(p); setSelected(new Set()); };

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            await updateStatus({ id: orderId, status: newStatus }).unwrap();
            toast.success(`Status changed to ${getStatusConfig(newStatus).label}`);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to update status');
        }
    };

    const handlePaymentChange = async (orderId: string, newStatus: string) => {
        try {
            await updatePayment({ id: orderId, paymentStatus: newStatus }).unwrap();
            toast.success(`Payment marked ${PAYMENT[newStatus]?.label || newStatus}`);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to update payment');
        }
    };

    const exportOrdersCsv = (list: any[], suffix: string) => {
        if (!list.length) { toast.error('No orders to export'); return; }
        const headers = ['Order No', 'Parcel', 'Customer', 'Phone', 'Items', 'Total', 'Paid', 'Due', 'Payment Method', 'Payment Status', 'Status', 'Placed'];
        const escapeCell = (val: any) => {
            const s = String(val ?? '');
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const rows = list.map((o: any) => {
            const m = money(o);
            return [
                o.orderId || o._id, parcelId(o), customerName(o), customerPhone(o),
                o.items?.length || 0, o.total ?? 0, m.paid, m.due,
                o.paymentMethod ? paymentMethodLabel(o.paymentMethod) : '',
                PAYMENT[o.paymentStatus]?.label || o.paymentStatus || '',
                getStatusConfig(o.status).label,
                o.createdAt ? new Date(o.createdAt).toLocaleString() : '',
            ];
        });
        const csv = [headers, ...rows].map((r) => r.map(escapeCell).join(',')).join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orders-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${list.length} orders`);
    };

    // ── Bulk selection ──
    const allSelected = orders.length > 0 && orders.every((o: any) => selected.has(o._id));
    const someSelected = selected.size > 0 && !allSelected;

    const toggleOne = (id: string) => setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const toggleAll = () => setSelected((prev) => {
        const next = new Set(prev);
        if (orders.every((o: any) => next.has(o._id))) orders.forEach((o: any) => next.delete(o._id));
        else orders.forEach((o: any) => next.add(o._id));
        return next;
    });
    const clearSelection = () => setSelected(new Set());

    const handleBulkStatus = async (newStatus: string) => {
        const ids = Array.from(selected);
        if (!ids.length || !newStatus) return;
        const tId = toast.loading(`Updating ${ids.length} order${ids.length > 1 ? 's' : ''}…`);
        const results = await Promise.allSettled(ids.map((id) => updateStatus({ id, status: newStatus }).unwrap()));
        const ok = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.length - ok;
        if (ok > 0) toast.success(`Updated ${ok} order${ok > 1 ? 's' : ''} to ${getStatusConfig(newStatus).label}${failed ? ` · ${failed} failed` : ''}`, { id: tId });
        else toast.error('Could not update the selected orders', { id: tId });
        clearSelection();
        setBulkStatus('');
    };

    const saveNote = async () => {
        if (!noteText.trim()) { toast.error('Write a note first'); return; }
        try {
            await addNote({ id: noteFor._id, note: noteText.trim() }).unwrap();
            toast.success('Note added to the order timeline');
            setNoteFor(null);
            setNoteText('');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to add note');
        }
    };

    const tiles = [
        { key: 'all', label: 'All orders', value: stats.total },
        { key: 'pending', label: 'Pending', value: stats.pending },
        { key: 'confirmed', label: 'Confirmed', value: stats.confirmed },
        { key: 'processing', label: 'Processing', value: stats.processing },
        { key: 'shipped', label: 'Shipped', value: stats.shipped },
        { key: 'delivered', label: 'Delivered', value: stats.delivered },
        { key: 'cancelled', label: 'Cancelled', value: stats.cancelled },
    ];

    const rowMenu = (o: any) => (
        <RowMenu items={[
            { label: 'Open full page', icon: <LuExternalLink size={15} />, href: `/dashboard/admin/orders/${o._id}` },
            { label: 'Add note', icon: <LuStickyNote size={15} />, onClick: () => { setNoteFor(o); setNoteText(''); } },
        ]} />
    );

    return (
        <div>
            <PageHeader
                title="Orders"
                subtitle="Customer sales orders - from the store and taken by phone."
                actions={<>
                    <Btn icon={<LuDownload size={15} />} onClick={() => exportOrdersCsv(orders, `page-${page}`)}>Export</Btn>
                    <Btn variant="primary" icon={<LuPlus size={16} />} href="/dashboard/admin/orders/new">New order</Btn>
                </>}
            />

            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                {tiles.map((t) => (
                    <StatTile
                        key={t.key}
                        label={t.label}
                        value={(t.value || 0).toLocaleString('en-IN')}
                        active={statusFilter === t.key}
                        onClick={() => { setStatusFilter(t.key); resetPage(); }}
                    />
                ))}
            </div>

            <FilterBar>
                <SearchInput value={search} onChange={(v) => { setSearch(v); resetPage(); }} placeholder="Search order no, customer, phone…" />
                <SelectPill ariaLabel="Status" className="sm:w-44" value={statusFilter} onChange={(v) => { setStatusFilter(v); resetPage(); }}
                    options={[{ value: 'all', label: 'All statuses' }, ...STATUS_OPTIONS]} />
                <SelectPill ariaLabel="Payment" className="sm:w-40" value={paymentFilter} onChange={(v) => { setPaymentFilter(v); resetPage(); }}
                    options={[{ value: 'all', label: 'All payments' }, ...PAYMENT_OPTIONS]} />
                <SelectPill ariaLabel="Product" className="sm:w-56" value={productFilter} onChange={(v) => { setProductFilter(v); resetPage(); }}
                    options={[{ value: 'all', label: 'All products' }, ...products.map((p) => ({ value: p._id, label: p.name }))]} />
            </FilterBar>

            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[var(--color-primary-border)] bg-[var(--color-primary-lightest)] px-4 py-3 sm:flex-row sm:items-center">
                    <p className="text-sm font-medium text-gray-800">
                        <span className="mr-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--color-primary)] px-2 text-xs text-white">{selected.size}</span>
                        order{selected.size > 1 ? 's' : ''} selected
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                        <SelectPill
                            ariaLabel="Change status"
                            className="w-48"
                            value={bulkStatus}
                            onChange={handleBulkStatus}
                            options={[{ value: '', label: 'Change status to…' }, ...STATUS_OPTIONS]}
                        />
                        <Btn icon={<LuDownload size={15} />} onClick={() => exportOrdersCsv(orders.filter((o) => selected.has(o._id)), 'selected')}>Export selected</Btn>
                        <Btn variant="ghost" icon={<LuX size={15} />} onClick={clearSelection}>Clear</Btn>
                    </div>
                </div>
            )}

            <TableCard
                className="hidden lg:block"
                footer={null}
            >
                <table className={cx('w-full', isFetching && !isLoading && 'opacity-60')}>
                    <thead>
                        <tr>
                            <th className={`${TH} w-10`}>
                                <input
                                    type="checkbox"
                                    aria-label="Select all orders on this page"
                                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                                    checked={allSelected}
                                    onChange={toggleAll}
                                    className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[var(--color-primary)]"
                                />
                            </th>
                            <th className={`${TH} w-10`}>#</th>
                            <th className={TH}>Order No</th>
                            <th className={TH}>Customer</th>
                            <th className={TH}>Status</th>
                            <th className={TH}>Payment</th>
                            <th className={`${TH} text-right`}>Items</th>
                            <th className={`${TH} text-right`}>Total</th>
                            <th className={`${TH} text-right`}>Paid / due</th>
                            <th className={TH}>Placed</th>
                            <th className={`${TH} w-20`} />
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={11} /> : orders.length === 0 ? (
                            <EmptyRow colSpan={11}>
                                <LuPackage size={28} className="mx-auto mb-2 text-gray-300" />
                                No orders match these filters.
                            </EmptyRow>
                        ) : orders.map((o, i) => {
                            const m = money(o);
                            const pay = PAYMENT[o.paymentStatus] || PAYMENT.pending;
                            const itemCount = (o.items || []).reduce((n: number, it: any) => n + (it.quantity || 0), 0);
                            return (
                                <tr key={o._id} className={cx(TR, selected.has(o._id) && 'bg-[var(--color-primary-lightest)] hover:bg-[var(--color-primary-lightest)]')}>
                                    <td className={TD}>
                                        <input
                                            type="checkbox"
                                            aria-label="Select order"
                                            checked={selected.has(o._id)}
                                            onChange={() => toggleOne(o._id)}
                                            className="h-4 w-4 cursor-pointer rounded border-gray-300 accent-[var(--color-primary)]"
                                        />
                                    </td>
                                    <td className={`${TD} text-gray-400`}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                    <td className={TD}>
                                        <Link href={`/dashboard/admin/orders/${o._id}`} className="font-semibold text-gray-900 hover:text-[var(--color-primary)]">{o.orderId}</Link>
                                        <p className="mt-0.5 text-xs text-gray-400" title="Steadfast consignment">{parcelId(o) || 'Not booked'}</p>
                                    </td>
                                    <td className={TD}>
                                        <p className="max-w-[180px] truncate text-gray-900">{customerName(o)}</p>
                                        <p className="mt-0.5 text-xs text-gray-400">{customerPhone(o)}</p>
                                    </td>
                                    <td className={TD}>
                                        <BadgeSelect ariaLabel="Order status" tone={ORDER_TONE[o.status] || 'gray'} value={o.status || 'pending'}
                                            onChange={(v) => handleStatusChange(o._id, v)} options={STATUS_OPTIONS} />
                                    </td>
                                    <td className={TD}>
                                        <BadgeSelect ariaLabel="Payment status" tone={pay.tone} value={o.paymentStatus || 'pending'}
                                            onChange={(v) => handlePaymentChange(o._id, v)} options={PAYMENT_OPTIONS} />
                                        <p className="mt-1 text-xs text-gray-400">{o.paymentMethod ? paymentMethodLabel(o.paymentMethod) : '—'}</p>
                                    </td>
                                    <td className={`${TD} text-right`} title={(o.items || []).map((it: any) => `${it.quantity} × ${it.name}`).join('\n')}>{itemCount}</td>
                                    <td className={`${TD} whitespace-nowrap text-right font-medium text-gray-900`}>{taka(o.total)}</td>
                                    <td className={`${TD} whitespace-nowrap text-right`}>
                                        {m.refunded ? <span className="text-gray-400">refunded</span> : <>
                                            <span className="text-gray-900">{taka(m.paid)}</span>
                                            <span className={cx('block text-xs', m.due > 0 ? 'text-gray-400' : 'text-emerald-600')}>
                                                {m.due > 0 ? `due ${taka(m.due)}` : 'settled'}
                                            </span>
                                        </>}
                                    </td>
                                    <td className={`${TD} whitespace-nowrap text-gray-500`}>{fmtDateTime(o.createdAt)}</td>
                                    <td className={`${TD} whitespace-nowrap text-right`}>
                                        <Link href={`/dashboard/admin/orders/${o._id}`} aria-label="View order" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800">
                                            <LuEye size={16} />
                                        </Link>
                                        {rowMenu(o)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TableCard>

            {/* Phones & tablets: cards */}
            <div className="space-y-3 lg:hidden">
                {isLoading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />)
                    : orders.length === 0 ? (
                        <div className="rounded-2xl border border-gray-200 px-4 py-12 text-center text-sm text-gray-500">No orders match these filters.</div>
                    ) : orders.map((o) => {
                        const m = money(o);
                        const pay = PAYMENT[o.paymentStatus] || PAYMENT.pending;
                        return (
                            <div key={o._id} className={cx('rounded-2xl border bg-white p-4', selected.has(o._id) ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-lightest)]' : 'border-gray-200')}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-start gap-2.5">
                                        <input type="checkbox" aria-label="Select order" checked={selected.has(o._id)} onChange={() => toggleOne(o._id)}
                                            className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 accent-[var(--color-primary)]" />
                                        <div className="min-w-0">
                                            <Link href={`/dashboard/admin/orders/${o._id}`} className="font-semibold text-gray-900">{o.orderId}</Link>
                                            <p className="text-xs text-gray-400">{fmtDateTime(o.createdAt)}</p>
                                        </div>
                                    </div>
                                    {rowMenu(o)}
                                </div>
                                <div className="mt-3 flex items-end justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-gray-900">{customerName(o)}</p>
                                        <p className="text-xs text-gray-400">{customerPhone(o)}{parcelId(o) && ` · ${parcelId(o)}`}</p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="font-semibold text-gray-900">{taka(o.total)}</p>
                                        {!m.refunded && <p className="text-xs text-gray-400">{m.due > 0 ? `due ${taka(m.due)}` : 'settled'}</p>}
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <BadgeSelect ariaLabel="Order status" tone={ORDER_TONE[o.status] || 'gray'} value={o.status || 'pending'}
                                        onChange={(v) => handleStatusChange(o._id, v)} options={STATUS_OPTIONS} />
                                    <BadgeSelect ariaLabel="Payment status" tone={pay.tone} value={o.paymentStatus || 'pending'}
                                        onChange={(v) => handlePaymentChange(o._id, v)} options={PAYMENT_OPTIONS} />
                                    <span className="text-xs text-gray-400">{o.paymentMethod ? paymentMethodLabel(o.paymentMethod) : ''}</span>
                                </div>
                            </div>
                        );
                    })}
            </div>

            <Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={orders.length} onPage={goToPage} noun="orders" />

            <Modal
                open={!!noteFor}
                onClose={() => setNoteFor(null)}
                title="Add note"
                subtitle={noteFor ? `${noteFor.orderId} · ${customerName(noteFor)}` : ''}
                width="max-w-md"
                footer={<>
                    <Btn onClick={() => setNoteFor(null)}>Cancel</Btn>
                    <Btn variant="primary" onClick={saveNote} disabled={isSavingNote}>{isSavingNote ? 'Saving…' : 'Add note'}</Btn>
                </>}
            >
                <textarea
                    className={TEXTAREA}
                    rows={4}
                    autoFocus
                    placeholder="e.g. Customer asked for delivery after 5 pm"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                />
                <p className="mt-2 text-xs text-gray-400">Staff-only. It is added to the order’s timeline.</p>
            </Modal>
        </div>
    );
}
