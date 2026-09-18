'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    useGetNotificationsQuery,
    useMarkNotifReadMutation,
    useMarkAllNotifReadMutation,
} from '@/redux/api/notificationApi';

const ACCENT = 'var(--color-primary)';

interface NotificationItem {
    _id: string;
    type?: string;
    title?: string;
    message?: string;
    link?: string;
    isRead?: boolean;
    createdAt?: string;
}

function relativeTime(iso?: string): string {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diff = Math.max(0, Date.now() - then);
    const s = Math.floor(diff / 1000);
    if (s < 60) return 'just now';
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    const w = Math.floor(d / 7);
    if (w < 5) return `${w}w ago`;
    return new Date(iso).toLocaleDateString();
}

const UserNotificationsPage: React.FC = () => {
    const router = useRouter();

    const { data: listData, isLoading, isFetching } = useGetNotificationsQuery({ page: 1, limit: 50 });
    const [markNotifRead] = useMarkNotifReadMutation();
    const [markAllNotifRead, { isLoading: isMarkingAll }] = useMarkAllNotifReadMutation();

    // Notification list — tolerate { data: [] } / { data: { notifications: [] } } / []
    const items: NotificationItem[] = useMemo(() => {
        const d = listData as
            | {
                  data?: NotificationItem[] | { notifications?: NotificationItem[]; data?: NotificationItem[] };
                  notifications?: NotificationItem[];
              }
            | NotificationItem[]
            | undefined;
        if (!d) return [];
        if (Array.isArray(d)) return d;
        if (Array.isArray(d.data)) return d.data;
        if (Array.isArray(d.notifications)) return d.notifications;
        if (d.data && !Array.isArray(d.data)) {
            if (Array.isArray(d.data.notifications)) return d.data.notifications;
            if (Array.isArray(d.data.data)) return d.data.data;
        }
        return [];
    }, [listData]);

    const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

    const resolveLink = (link?: string) => {
        if (!link) return '';
        let target = link.trim();
        if (target.startsWith('/admin/')) target = target.replace('/admin/', '/dashboard/admin/');
        return target;
    };

    const handleItemClick = async (n: NotificationItem) => {
        if (!n.isRead) {
            try {
                await markNotifRead(n._id).unwrap();
            } catch {
                /* non-blocking */
            }
        }
        const targetUrl = resolveLink(n.link);
        if (targetUrl) router.push(targetUrl);
    };

    const handleMarkAll = async () => {
        try {
            await markAllNotifRead(undefined).unwrap();
        } catch {
            /* non-blocking */
        }
    };

    const loading = isLoading || (isFetching && items.length === 0);

    return (
        <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-4 sm:py-6">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">Notifications</h1>
                    <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
                        {unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        type="button"
                        onClick={handleMarkAll}
                        disabled={isMarkingAll}
                        className="rounded-lg px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60 sm:text-sm"
                        style={{ backgroundColor: ACCENT }}
                    >
                        {isMarkingAll ? 'Marking…' : 'Mark all read'}
                    </button>
                )}
            </div>

            {/* Card */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {loading ? (
                    <ul className="divide-y divide-gray-100">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <li key={i} className="flex items-start gap-3 px-4 py-4">
                                <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gray-200" />
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="h-3.5 w-1/3 animate-pulse rounded bg-gray-200" />
                                    <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                                    <div className="h-2.5 w-16 animate-pulse rounded bg-gray-100" />
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                        <div
                            className="mb-3 flex h-14 w-14 items-center justify-center rounded-full"
                            style={{ backgroundColor: `${ACCENT}1A` }}
                        >
                            <svg
                                className="h-7 w-7"
                                style={{ color: ACCENT }}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.8}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                                />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-gray-900">No notifications yet</p>
                        <p className="mt-1 text-xs text-gray-500">
                            We&apos;ll let you know when something arrives.
                        </p>
                    </div>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {items.map((n) => (
                            <li key={n._id}>
                                <button
                                    type="button"
                                    onClick={() => handleItemClick(n)}
                                    className={`flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-gray-50 ${
                                        n.isRead ? '' : 'bg-green-50/50'
                                    }`}
                                >
                                    <span
                                        className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                        style={{ backgroundColor: n.isRead ? 'transparent' : ACCENT }}
                                    />
                                    <span className="min-w-0 flex-1">
                                        {n.title && (
                                            <span
                                                className={`block text-sm ${
                                                    n.isRead ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'
                                                }`}
                                            >
                                                {n.title}
                                            </span>
                                        )}
                                        {n.message && (
                                            <span className="mt-0.5 block text-xs text-gray-500 sm:text-sm">
                                                {n.message}
                                            </span>
                                        )}
                                        <span className="mt-1 block text-[11px] text-gray-400">
                                            {relativeTime(n.createdAt)}
                                        </span>
                                    </span>
                                    {!n.isRead && (
                                        <span
                                            className="mt-1 flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                                            style={{ backgroundColor: ACCENT }}
                                        >
                                            New
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default UserNotificationsPage;
