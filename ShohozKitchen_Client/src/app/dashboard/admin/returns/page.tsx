'use client';

import { useState, useMemo } from 'react';
import {
    useGetAdminReturnsQuery,
    useApproveReturnMutation,
    useRejectReturnMutation,
    useRefundReturnMutation,
    returnStatusBadge,
    RETURN_REASONS,
} from '@/redux/api/returnApi';
import toast from 'react-hot-toast';
import OrderItemsPreview from '@/components/shared/OrderItemsPreview';

type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

const STATUS_TABS: { label: string; value: ReturnStatus | 'all' }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Refunded', value: 'refunded' },
];

const reasonLabel = (value: string) =>
    RETURN_REASONS.find((r) => r.value === value)?.label || value;

const fmt = (n: number) => `৳${(n || 0).toLocaleString()}`;

const fmtDate = (d?: string) =>
    d
        ? new Date(d).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })
        : '—';

const fmtDateTime = (d?: string) =>
    d
        ? new Date(d).toLocaleString('en-BD', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '—';

const customerName = (user: any) => {
    if (!user) return '—';
    if (typeof user === 'string') return user;
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email || '—';
};

function StatusBadge({ status }: { status: string }) {
    const cfg = returnStatusBadge[status] || {
        label: status,
        className: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.className}`}
        >
            {cfg.label}
        </span>
    );
}

export default function AdminReturnsPage() {
    const [activeTab, setActiveTab] = useState<ReturnStatus | 'all'>('all');
    const [selected, setSelected] = useState<any | null>(null);
    const [lightbox, setLightbox] = useState<string | null>(null);
    const [rejectMode, setRejectMode] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    // Fetch ALL returns (no server filter) so the stat row can count every status.
    const { data, isLoading, refetch } = useGetAdminReturnsQuery({});

    const [approveReturn, { isLoading: isApproving }] = useApproveReturnMutation();
    const [rejectReturn, { isLoading: isRejecting }] = useRejectReturnMutation();
    const [refundReturn, { isLoading: isRefunding }] = useRefundReturnMutation();

    const allReturns: any[] = (data as any)?.data || [];

    const counts = useMemo(() => {
        const c: Record<string, number> = { pending: 0, approved: 0, rejected: 0, refunded: 0 };
        allReturns.forEach((r) => {
            if (c[r.status] !== undefined) c[r.status] += 1;
        });
        return c;
    }, [allReturns]);

    const filtered = useMemo(
        () => (activeTab === 'all' ? allReturns : allReturns.filter((r) => r.status === activeTab)),
        [allReturns, activeTab]
    );

    const isBusy = isApproving || isRejecting || isRefunding;

    const closePanel = () => {
        setSelected(null);
        setRejectMode(false);
        setRejectReason('');
    };

    const handleApprove = async (id: string) => {
        try {
            await approveReturn({ id }).unwrap();
            toast.success('Return approved.');
            const res = await refetch();
            const fresh = ((res.data as any)?.data || []).find((r: any) => r._id === id);
            setSelected(fresh || null);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to approve return.');
        }
    };

    const handleReject = async (id: string) => {
        if (!rejectReason.trim()) {
            toast.error('Please provide a rejection reason.');
            return;
        }
        try {
            await rejectReturn({ id, rejectionReason: rejectReason.trim() }).unwrap();
            toast.success('Return rejected.');
            setRejectMode(false);
            setRejectReason('');
            const res = await refetch();
            const fresh = ((res.data as any)?.data || []).find((r: any) => r._id === id);
            setSelected(fresh || null);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to reject return.');
        }
    };

    const handleRefund = async (id: string) => {
        if (!window.confirm('Process the refund for this return? This marks it as refunded.')) return;
        try {
            await refundReturn({ id }).unwrap();
            toast.success('Refund processed.');
            const res = await refetch();
            const fresh = ((res.data as any)?.data || []).find((r: any) => r._id === id);
            setSelected(fresh || null);
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to process refund.');
        }
    };

    const statCards = [
        { key: 'pending', label: 'Pending', value: counts.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
        { key: 'approved', label: 'Approved', value: counts.approved, color: 'text-blue-600', bg: 'bg-blue-50' },
        { key: 'rejected', label: 'Rejected', value: counts.rejected, color: 'text-red-600', bg: 'bg-red-50' },
        { key: 'refunded', label: 'Refunded', value: counts.refunded, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    return (
        <div>
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-xl font-bold text-gray-800">Returns &amp; Refunds</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                    Review customer return requests, approve or reject, and process refunds
                </p>
            </div>

            {/* Stat Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((s) => (
                    <div
                        key={s.key}
                        className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between"
                    >
                        <div>
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.label}</p>
                            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                            <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
                {STATUS_TABS.map((tab) => {
                    const tabCount =
                        tab.value === 'all' ? allReturns.length : counts[tab.value] ?? 0;
                    return (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                                activeTab === tab.value
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {tab.label}
                            <span className="ml-1.5 text-xs text-gray-400">({tabCount})</span>
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-7 h-7 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-4xl mb-3">📦</div>
                        <p className="text-gray-500 font-medium">
                            No {activeTab === 'all' ? '' : activeTab} return requests found
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Return</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Customer</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Order</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Shop</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Items</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Reason</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Refund</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Status</th>
                                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filtered.map((r) => (
                                    <tr
                                        key={r._id}
                                        onClick={() => {
                                            setSelected(r);
                                            setRejectMode(false);
                                            setRejectReason('');
                                        }}
                                        className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                                    >
                                        <td className="px-5 py-4">
                                            <span className="text-sm font-semibold text-indigo-600">{r.returnId || '—'}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-sm text-gray-800">{customerName(r.user)}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-sm text-gray-600">{r.orderId || '—'}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-sm text-gray-600">{r.shopName || 'Shohoz Kitchen'}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <OrderItemsPreview items={r.items} totalCount={r.items?.length} size={34} />
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-sm text-gray-600">{reasonLabel(r.reason)}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-sm font-bold text-gray-800">{fmt(r.refundAmount)}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <StatusBadge status={r.status} />
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-sm text-gray-500">{fmtDate(r.createdAt)}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Detail Panel (slide-over) */}
            {selected && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/40" onClick={closePanel} />
                    <div className="relative w-full max-w-lg bg-white h-full shadow-xl overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">{selected.returnId}</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Order {selected.orderId} · {fmtDate(selected.createdAt)}
                                </p>
                            </div>
                            <button
                                onClick={closePanel}
                                className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-2"
                            >
                                ×
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-6">
                            {/* Summary */}
                            <div className="flex items-center justify-between">
                                <StatusBadge status={selected.status} />
                                <span className="text-lg font-bold text-gray-800">{fmt(selected.refundAmount)}</span>
                            </div>

                            {/* Customer & Shop */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Customer</p>
                                    <p className="text-sm font-medium text-gray-800">{customerName(selected.user)}</p>
                                    {typeof selected.user === 'object' && selected.user?.email && (
                                        <p className="text-xs text-gray-500">{selected.user.email}</p>
                                    )}
                                    {typeof selected.user === 'object' && selected.user?.phone && (
                                        <p className="text-xs text-gray-500">{selected.user.phone}</p>
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Shop</p>
                                    <p className="text-sm font-medium text-gray-800">{selected.shopName || 'Shohoz Kitchen'}</p>
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Reason</p>
                                <p className="text-sm font-medium text-gray-800">{reasonLabel(selected.reason)}</p>
                                {selected.description && (
                                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg p-3">
                                        {selected.description}
                                    </p>
                                )}
                            </div>

                            {/* Items */}
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                    Items ({selected.items?.length || 0})
                                </p>
                                <div className="space-y-2">
                                    {(selected.items || []).map((it: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 border border-gray-100 rounded-lg p-2.5">
                                            {it.thumbnail ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={it.thumbnail}
                                                    alt={it.name}
                                                    className="w-11 h-11 rounded-md object-cover bg-gray-100 flex-shrink-0"
                                                />
                                            ) : (
                                                <div className="w-11 h-11 rounded-md bg-gray-100 flex-shrink-0" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{it.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {fmt(it.price)} × {it.quantity}
                                                </p>
                                            </div>
                                            <span className="text-sm font-semibold text-gray-700">
                                                {fmt((it.price || 0) * (it.quantity || 0))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Proof Images */}
                            {selected.images?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                                        Proof Images ({selected.images.length})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {selected.images.map((url: string, i: number) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                key={i}
                                                src={url}
                                                alt={`proof-${i + 1}`}
                                                onClick={() => setLightbox(url)}
                                                className="w-20 h-20 rounded-lg object-cover bg-gray-100 cursor-pointer border border-gray-200 hover:opacity-80 transition"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Timeline */}
                            {selected.timeline?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Timeline</p>
                                    <div className="space-y-3">
                                        {selected.timeline.map((t: any, i: number) => (
                                            <div key={i} className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 mt-1" />
                                                    {i < selected.timeline.length - 1 && (
                                                        <div className="w-px flex-1 bg-gray-200 my-1" />
                                                    )}
                                                </div>
                                                <div className="pb-1">
                                                    <p className="text-sm font-medium text-gray-800 capitalize">{t.status}</p>
                                                    {t.note && <p className="text-xs text-gray-500">{t.note}</p>}
                                                    <p className="text-[11px] text-gray-400 mt-0.5">{fmtDateTime(t.createdAt)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Resolution (terminal states) */}
                            {selected.status === 'rejected' && selected.rejectionReason && (
                                <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Rejection Reason</p>
                                    <p className="text-sm text-red-700">{selected.rejectionReason}</p>
                                </div>
                            )}
                            {selected.status === 'refunded' && (
                                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                                    <p className="text-sm font-medium text-emerald-700">
                                        ✅ Refund of {fmt(selected.refundAmount)} has been processed
                                        {selected.resolvedAt ? ` on ${fmtDate(selected.resolvedAt)}` : ''}.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Action Footer */}
                        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
                            {selected.status === 'pending' && !rejectMode && (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => handleApprove(selected._id)}
                                        disabled={isBusy}
                                        className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                                    >
                                        {isApproving ? 'Approving...' : '✓ Approve Return'}
                                    </button>
                                    <button
                                        onClick={() => setRejectMode(true)}
                                        disabled={isBusy}
                                        className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                                    >
                                        ✕ Reject
                                    </button>
                                </div>
                            )}

                            {selected.status === 'pending' && rejectMode && (
                                <div>
                                    <textarea
                                        value={rejectReason}
                                        onChange={(e) => setRejectReason(e.target.value)}
                                        rows={2}
                                        placeholder="Reason for rejecting this return..."
                                        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:border-red-400 resize-none mb-3"
                                    />
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setRejectMode(false); setRejectReason(''); }}
                                            className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50 transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleReject(selected._id)}
                                            disabled={isRejecting}
                                            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                                        >
                                            {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {selected.status === 'approved' && (
                                <button
                                    onClick={() => handleRefund(selected._id)}
                                    disabled={isBusy}
                                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                                >
                                    {isRefunding ? 'Processing...' : `Process Refund · ${fmt(selected.refundAmount)}`}
                                </button>
                            )}

                            {(selected.status === 'rejected' || selected.status === 'refunded') && (
                                <p className="text-center text-sm text-gray-400">
                                    This return is {selected.status} — no further action.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Image Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6"
                    onClick={() => setLightbox(null)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lightbox} alt="proof" className="max-w-full max-h-full rounded-lg object-contain" />
                </div>
            )}
        </div>
    );
}
