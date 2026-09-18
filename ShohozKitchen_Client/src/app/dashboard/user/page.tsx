"use client";

import React, { useMemo } from 'react';
import { useAppSelector } from '@/redux/hooks';
import Link from 'next/link';
import {
    FiArrowRight, FiPackage, FiCreditCard, FiMapPin, FiStar, FiHeart,
    FiClock, FiTruck, FiBox, FiCheckCircle, FiEdit2, FiChevronRight,
} from 'react-icons/fi';
import { useGetMyOrdersQuery } from '@/redux/api/orderApi';
import { getStatusConfig } from '@/lib/orderStatus';

const StatusBadge = ({ status }: { status: string }) => {
    const cfg = getStatusConfig(status);
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${cfg.badgeBg} ${cfg.badgeText}`}>
            {cfg.label}
        </span>
    );
};

export default function UserDashboard() {
    const { user } = useAppSelector((state) => state.auth);
    const wishlistCount = useAppSelector((state: any) => state.wishlist.totalItems);
    const { data: ordersData, isLoading } = useGetMyOrdersQuery({ limit: 100 });

    const orders: any[] = ordersData?.data || [];
    const recent = orders.slice(0, 5);

    const counts = useMemo(() => {
        const c = { toPay: 0, toShip: 0, toReceive: 0, toReview: 0 };
        orders.forEach(o => {
            if (o.status === 'pending') c.toPay++;
            else if (o.status === 'confirmed' || o.status === 'processing') c.toShip++;
            else if (['shipped', 'on_the_way', 'out_for_delivery', 'delivery_attempt'].includes(o.status)) c.toReceive++;
            else if (o.status === 'delivered') c.toReview++;
        });
        return c;
    }, [orders]);

    const firstName = user?.name?.split(' ')[0] || 'User';
    const getInitials = () => {
        if (!user?.name) return 'U';
        const parts = user.name.split(' ');
        return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0];
    };

    const orderTiles = [
        { icon: FiClock, label: 'To Pay', value: counts.toPay, href: '/dashboard/user/orders?status=pending', color: '#D97706', bg: '#FFFBEB' },
        { icon: FiBox, label: 'To Ship', value: counts.toShip, href: '/dashboard/user/orders?status=processing', color: '#7C3AED', bg: '#F5F3FF' },
        { icon: FiTruck, label: 'To Receive', value: counts.toReceive, href: '/dashboard/user/orders?status=shipped', color: '#2563EB', bg: '#EFF6FF' },
        { icon: FiStar, label: 'To Review', value: counts.toReview, href: '/dashboard/user/reviews', color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
    ];

    const quickLinks = [
        { icon: FiMapPin, label: 'Address Book', desc: 'Manage your delivery addresses', href: '/dashboard/user/addresses', color: '#2563EB', bg: '#EFF6FF' },
        { icon: FiCreditCard, label: 'My Payment Options', desc: 'Saved payment methods', href: '/dashboard/user/payments', color: '#059669', bg: '#ECFDF5' },
        { icon: FiStar, label: 'My Reviews', desc: 'Rate & review your purchases', href: '/dashboard/user/reviews', color: '#D97706', bg: '#FFFBEB' },
        { icon: FiHeart, label: 'Wishlist & Stores', desc: `${wishlistCount || 0} saved items`, href: '/dashboard/user/wishlist', color: '#DB2777', bg: '#FDF2F8' },
    ];

    return (
        <div className="space-y-5">

            {/* ── Account header ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-lg font-extrabold flex-shrink-0">
                        {getInitials()}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs text-gray-400 font-medium">Hello,</p>
                        <h1 className="text-xl font-bold text-gray-900 truncate">{firstName}</h1>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                </div>
                <Link href="/dashboard/user/profile" className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all flex items-center gap-2 flex-shrink-0">
                    <FiEdit2 size={14} /> <span className="hidden sm:inline">Edit Profile</span>
                </Link>
            </div>

            {/* ── My Orders status strip ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                    <h2 className="text-sm font-bold text-gray-900">My Orders</h2>
                    <Link href="/dashboard/user/orders" className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1">
                        View All <FiArrowRight size={13} />
                    </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-50">
                    {orderTiles.map(t => (
                        <Link key={t.label} href={t.href} className="flex flex-col items-center justify-center gap-2 py-6 hover:bg-gray-50/60 transition-colors">
                            <div className="relative">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: t.bg, color: t.color }}>
                                    <t.icon size={20} />
                                </div>
                                {t.value > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{t.value}</span>
                                )}
                            </div>
                            <span className="text-xs font-semibold text-gray-600">{t.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Quick account links ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickLinks.map(item => (
                    <Link key={item.label} href={item.href} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: item.bg, color: item.color }}>
                            <item.icon size={19} />
                        </div>
                        <p className="text-sm font-bold text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </Link>
                ))}
            </div>

            {/* ── Recent Orders ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
                    <h2 className="text-sm font-bold text-gray-900">Recent Orders</h2>
                    <Link href="/dashboard/user/orders" className="text-xs font-bold text-[var(--color-primary)] flex items-center gap-1">
                        View All <FiArrowRight size={13} />
                    </Link>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="w-8 h-8 rounded-full border-[3px] border-gray-100 border-t-[var(--color-primary)] animate-spin mx-auto" />
                        <p className="text-gray-300 text-sm mt-3">Loading orders…</p>
                    </div>
                ) : recent.length === 0 ? (
                    <div className="p-14 text-center">
                        <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                            <FiPackage size={26} className="text-gray-300" />
                        </div>
                        <p className="font-bold text-gray-600 mb-1">No orders yet</p>
                        <p className="text-sm text-gray-400 mb-5">Start shopping to see your orders here</p>
                        <Link href="/" className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold text-sm">
                            Start Shopping <FiArrowRight size={14} />
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {recent.map(order => (
                            <Link key={order._id} href={`/dashboard/user/orders/${order._id}`} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                                <div className="flex -space-x-2 flex-shrink-0">
                                    {(order.items?.slice(0, 2) || []).map((it: any, idx: number) => (
                                        <div key={idx} className="w-10 h-10 rounded-lg bg-gray-50 border-2 border-white overflow-hidden flex items-center justify-center">
                                            {it.thumbnail || it.image ? <img src={it.thumbnail || it.image} alt="" className="w-full h-full object-cover" /> : <FiPackage size={14} className="text-gray-300" />}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-800 truncate">#{order.orderId || order._id?.slice(-8).toUpperCase()}</p>
                                    <p className="text-xs text-gray-500 truncate">{order.items?.[0]?.name || '—'}{order.items?.length > 1 ? ` +${order.items.length - 1} more` : ''}</p>
                                    <p className="text-[11px] text-gray-400">
                                        {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <span className="text-sm font-bold text-[var(--color-primary)] whitespace-nowrap">৳{order.total?.toLocaleString()}</span>
                                    <StatusBadge status={order.status} />
                                </div>
                                <FiChevronRight size={16} className="text-gray-300 hidden sm:block flex-shrink-0" />
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
