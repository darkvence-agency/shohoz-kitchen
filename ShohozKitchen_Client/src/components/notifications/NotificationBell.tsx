'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSocket } from '@/lib/socket';
import {
    useGetNotificationsQuery,
    useGetNotifUnreadCountQuery,
    useMarkNotifReadMutation,
    useMarkAllNotifReadMutation,
} from '@/redux/api/notificationApi';

type Theme = 'orange' | 'indigo';

interface NotificationBellProps {
    theme?: Theme;
    seeAllHref: string;
}

interface NotificationItem {
    _id: string;
    type?: string;
    title?: string;
    message?: string;
    link?: string;
    isRead?: boolean;
    createdAt?: string;
}

// Theme accent classes
const THEME = {
    orange: {
        accentText: 'text-[var(--color-primary)]',
        accentBg: 'bg-[var(--color-primary)]',
        accentHover: 'hover:text-[var(--color-primary)]',
        ring: 'focus:ring-[var(--color-primary)]/40',
        dot: 'bg-[var(--color-primary)]',
    },
    indigo: {
        accentText: 'text-[#4F46E5]',
        accentBg: 'bg-[#4F46E5]',
        accentHover: 'hover:text-[#4F46E5]',
        ring: 'focus:ring-[#4F46E5]/40',
        dot: 'bg-[#4F46E5]',
    },
} as const;

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

const NotificationBell: React.FC<NotificationBellProps> = ({ theme = 'orange', seeAllHref }) => {
    const t = THEME[theme];
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement | null>(null);

    const { data: countData, refetch: refetchCount } = useGetNotifUnreadCountQuery(undefined);
    const {
        data: listData,
        isLoading,
        isFetching,
        refetch: refetchList,
    } = useGetNotificationsQuery({ page: 1, limit: 10 });

    const [markNotifRead] = useMarkNotifReadMutation();
    const [markAllNotifRead] = useMarkAllNotifReadMutation();

    // Unread count — tolerate a few common response shapes
    const unreadCount: number = useMemo(() => {
        const d = countData as { count?: number; data?: { count?: number } | number } | undefined;
        if (!d) return 0;
        if (typeof d.count === 'number') return d.count;
        if (typeof d.data === 'number') return d.data;
        if (d.data && typeof d.data.count === 'number') return d.data.count;
        return 0;
    }, [countData]);

    // Notification list — tolerate { data: [] } / { data: { notifications: [] } } / []
    const items: NotificationItem[] = useMemo(() => {
        const d = listData as
            | { data?: NotificationItem[] | { notifications?: NotificationItem[]; data?: NotificationItem[] }; notifications?: NotificationItem[] }
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

    // Subscribe to live notifications via the existing socket
    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        const onNew = () => {
            refetchCount();
            refetchList();
        };
        socket.on('notification:new', onNew);
        return () => {
            socket.off('notification:new', onNew);
        };
    }, [refetchCount, refetchList]);

    // Close dropdown on outside click
    useEffect(() => {
        if (!open) return;
        const onDocClick = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    const handleOpen = () => {
        const next = !open;
        setOpen(next);
        if (next) {
            refetchList();
            refetchCount();
        }
    };

    const resolveLink = (link?: string) => {
        if (!link) return '';
        let target = link.trim();
        if (target.startsWith('/admin/')) target = target.replace('/admin/', '/dashboard/admin/');
        return target;
    };

    const handleItemClick = async (n: NotificationItem) => {
        setOpen(false);
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

    return (
        <div className="relative" ref={wrapRef}>
            <button
                type="button"
                onClick={handleOpen}
                aria-label="Notifications"
                aria-haspopup="true"
                aria-expanded={open}
                className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-gray-100 ${t.accentHover} focus:outline-none focus:ring-2 ${t.ring}`}
            >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {unreadCount > 0 && (
                    <span
                        className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[11px] font-semibold leading-none text-white ${t.accentBg}`}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="fixed inset-x-2 top-16 z-50 mx-auto max-w-sm rounded-xl border border-gray-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mx-0 sm:mt-2 sm:w-80"
                    role="menu"
                >
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={handleMarkAll}
                                className={`text-xs font-medium ${t.accentText} hover:underline`}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-80 overflow-y-auto">
                        {isLoading || (isFetching && items.length === 0) ? (
                            <div className="px-4 py-8 text-center text-sm text-gray-400">Loading…</div>
                        ) : items.length === 0 ? (
                            <div className="px-4 py-10 text-center text-sm text-gray-400">
                                You have no notifications yet.
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {items.map((n) => (
                                    <li key={n._id}>
                                        <button
                                            type="button"
                                            onClick={() => handleItemClick(n)}
                                            className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                                                n.isRead ? '' : 'bg-[var(--color-primary-lightest)]/40'
                                            }`}
                                        >
                                            <span
                                                className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${
                                                    n.isRead ? 'bg-transparent' : t.dot
                                                }`}
                                            />
                                            <span className="min-w-0 flex-1">
                                                {n.title && (
                                                    <span className="block truncate text-sm font-medium text-gray-900">
                                                        {n.title}
                                                    </span>
                                                )}
                                                {n.message && (
                                                    <span className="mt-0.5 block line-clamp-2 text-xs text-gray-500">
                                                        {n.message}
                                                    </span>
                                                )}
                                                <span className="mt-1 block text-[11px] text-gray-400">
                                                    {relativeTime(n.createdAt)}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="border-t border-gray-100 px-4 py-2.5 text-center">
                        <Link
                            href={seeAllHref}
                            onClick={() => setOpen(false)}
                            className={`text-xs font-medium ${t.accentText} hover:underline`}
                        >
                            See all
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
