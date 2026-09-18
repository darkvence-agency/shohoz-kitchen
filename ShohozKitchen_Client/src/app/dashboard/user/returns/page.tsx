"use client";

import React from 'react';
import Link from 'next/link';
import {
    FiRefreshCw,
    FiChevronDown,
    FiChevronUp,
    FiPackage,
    FiExternalLink,
    FiAlertCircle,
} from 'react-icons/fi';
import { useGetMyReturnsQuery, RETURN_REASONS, returnStatusBadge } from '@/redux/api/returnApi';

export default function MyReturnsPage() {
    const { data, isLoading } = useGetMyReturnsQuery(undefined);
    const returns: any[] = data?.data || [];
    const [expandedId, setExpandedId] = React.useState<string | null>(null);

    const reasonLabel = (value: string) =>
        RETURN_REASONS.find((r) => r.value === value)?.label || value;

    const toggle = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

    // ===== Loading =====
    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 w-40 bg-gray-200 rounded animate-pulse" />
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 animate-pulse">
                        <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
                        <div className="h-4 bg-gray-100 rounded w-2/3" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-2">
                <FiRefreshCw size={20} className="text-[var(--color-primary)]" />
                <h1 className="text-xl font-bold text-gray-900">My Returns</h1>
                {returns.length > 0 && (
                    <span className="ml-1 text-xs font-bold text-gray-400">({returns.length})</span>
                )}
            </div>

            {/* Empty state */}
            {returns.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
                    <FiRefreshCw size={48} className="mx-auto text-gray-200 mb-4" />
                    <h3 className="text-lg font-bold text-gray-600 mb-1">No returns yet</h3>
                    <p className="text-sm text-gray-400 mb-4">
                        When you request a return on a delivered order, it&apos;ll show up here.
                    </p>
                    <Link
                        href="/dashboard/user/orders"
                        className="text-[var(--color-primary)] font-bold text-sm hover:underline"
                    >
                        Go to My Orders →
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {returns.map((ret) => {
                        const badge = returnStatusBadge[ret.status] || {
                            label: ret.status,
                            className: 'bg-gray-100 text-gray-700 border-gray-200',
                        };
                        const isOpen = expandedId === ret._id;
                        const itemCount = (ret.items || []).reduce(
                            (sum: number, it: any) => sum + (it.quantity || 0),
                            0,
                        );
                        return (
                            <div
                                key={ret._id}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                            >
                                {/* Card header (clickable) */}
                                <button
                                    onClick={() => toggle(ret._id)}
                                    className="w-full text-left px-5 py-4 hover:bg-gray-50/60 transition-colors"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold text-gray-900">{ret.returnId}</span>
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.className}`}
                                                >
                                                    {badge.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Order {ret.orderId} · {itemCount} item{itemCount !== 1 ? 's' : ''} ·{' '}
                                                {reasonLabel(ret.reason)}
                                            </p>
                                            <p className="text-[11px] text-gray-400 mt-1">
                                                {ret.createdAt &&
                                                    new Date(ret.createdAt).toLocaleDateString('en-US', {
                                                        day: 'numeric',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                            <span className="text-sm font-bold text-[var(--color-primary)] whitespace-nowrap">
                                                ৳{(ret.refundAmount || 0).toLocaleString()}
                                            </span>
                                            <span className="text-gray-300">
                                                {isOpen ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                                            </span>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded detail */}
                                {isOpen && (
                                    <div className="px-5 pb-5 pt-1 border-t border-gray-50 space-y-5">
                                        {/* Items */}
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 mt-3">
                                                Items
                                            </p>
                                            <div className="space-y-2">
                                                {(ret.items || []).map((item: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-3">
                                                        <div className="w-11 h-11 rounded-lg bg-gray-50 overflow-hidden border border-gray-100 flex-shrink-0">
                                                            {item.thumbnail ? (
                                                                <img
                                                                    src={item.thumbnail}
                                                                    alt={item.name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                                    <FiPackage size={16} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-gray-800 truncate">
                                                                {item.name}
                                                            </p>
                                                            <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                                                        </div>
                                                        <span className="text-sm font-semibold text-gray-600 whitespace-nowrap">
                                                            ৳{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {ret.description && (
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                                                    Description
                                                </p>
                                                <p className="text-sm text-gray-600">{ret.description}</p>
                                            </div>
                                        )}

                                        {/* Uploaded images */}
                                        {ret.images && ret.images.length > 0 && (
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                                                    Photos
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {ret.images.map((url: string, idx: number) => (
                                                        <a
                                                            key={idx}
                                                            href={url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-20 h-20 rounded-xl overflow-hidden border border-gray-100 block"
                                                        >
                                                            <img
                                                                src={url}
                                                                alt={`return-${idx}`}
                                                                className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                                                            />
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Rejection reason */}
                                        {ret.status === 'rejected' && ret.rejectionReason && (
                                            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                                                <FiAlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <p className="text-xs font-bold text-red-700">Reason for rejection</p>
                                                    <p className="text-sm text-red-600 mt-0.5">{ret.rejectionReason}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Timeline */}
                                        {ret.timeline && ret.timeline.length > 0 && (
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                                                    Timeline
                                                </p>
                                                <div className="space-y-3">
                                                    {ret.timeline.map((event: any, idx: number) => (
                                                        <div key={idx} className="flex gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-1.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="text-xs font-semibold text-gray-700 capitalize">
                                                                    {event.status}
                                                                </p>
                                                                {event.note && (
                                                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                                                        {event.note}
                                                                    </p>
                                                                )}
                                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                                    {event.createdAt &&
                                                                        new Date(event.createdAt).toLocaleString('en-US')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Link to order */}
                                        <Link
                                            href={`/dashboard/user/orders/${ret.order?._id || ret.order}`}
                                            className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-primary)] hover:underline"
                                        >
                                            View order
                                            <FiExternalLink size={13} />
                                        </Link>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
