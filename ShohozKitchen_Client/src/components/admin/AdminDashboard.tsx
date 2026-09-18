"use client";

import React from 'react';
import Link from 'next/link';
import {
    FiShoppingBag, FiShoppingCart, FiUsers,
    FiArrowRight, FiRefreshCw, FiPackage, FiTrendingUp,
    FiPhone, FiClock, FiPlus, FiGrid, FiLayout,
    FiCheckCircle, FiTruck,
    FiAlertCircle, FiStar, FiTag,
} from 'react-icons/fi';
import {
    useGetDashboardSummaryQuery,
    useGetRecentOrdersQuery,
    useGetTopProductsQuery,
    useGetSalesByCategoryQuery,
    useGetMonthlyRevenueQuery,
} from '@/redux/api/dashboardApi';
import { useGetOrderStatsQuery } from '@/redux/api/orderApi';

const AdminDashboard: React.FC = () => {
    const {
        data: summaryData,
        isLoading,
        refetch: refetchSummary
    } = useGetDashboardSummaryQuery(undefined, { pollingInterval: 30000 });

    const {
        data: ordersData,
        refetch: refetchOrders
    } = useGetRecentOrdersQuery(8);

    const { data: productsData } = useGetTopProductsQuery(5);
    const { data: categoryData } = useGetSalesByCategoryQuery(undefined);
    const { data: orderStatsData } = useGetOrderStatsQuery(undefined);
    const { data: monthlyData } = useGetMonthlyRevenueQuery(undefined);

    const handleRefresh = () => { refetchSummary(); refetchOrders(); };

    const stats = summaryData?.data || null;
    const recentOrders = ordersData?.data || [];
    const topProducts = productsData?.data || [];
    const salesByCategory = categoryData?.data || [];
    const orderStats = orderStatsData?.data || {};
    const monthly: any[] = monthlyData?.data || [];

    const formatCurrency = (amount: number) => `৳${(amount || 0).toLocaleString()}`;

    const timeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const statusColor = (status: string) => {
        const map: Record<string, { bg: string; text: string }> = {
            pending: { bg: '#FEF3C7', text: '#D97706' },
            confirmed: { bg: '#DBEAFE', text: '#2563EB' },
            processing: { bg: '#EDE9FE', text: '#7C3AED' },
            shipped: { bg: '#E0E7FF', text: '#4F46E5' },
            delivered: { bg: 'var(--color-primary-border)', text: 'var(--color-primary)' },
            cancelled: { bg: '#FEE2E2', text: '#DC2626' },
        };
        return map[status] || { bg: '#F3F4F6', text: '#6B7280' };
    };


    // Category colors
    const catColors = ['var(--color-primary)', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111', margin: 0, letterSpacing: '-0.5px' }}>Dashboard</h1>
                    <p style={{ fontSize: '13px', color: '#888', margin: '4px 0 0' }}>Welcome back! Here&apos;s what&apos;s happening with your store.</p>
                </div>
                <button
                    onClick={handleRefresh}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '8px 16px', background: '#fff', border: '1px solid #e5e7eb',
                        borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#555',
                        cursor: 'pointer', transition: 'all 0.2s',
                    }}
                >
                    <FiRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                {[
                    {
                        label: 'Total Orders',
                        value: (stats?.totalOrders || 0).toLocaleString(),
                        sub: `${orderStats.pending || 0} pending`,
                        icon: FiShoppingCart,
                        color: '#3B82F6',
                        bg: '#EFF6FF',
                        gradient: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                    },
                    {
                        label: 'Total Customers',
                        value: (stats?.totalCustomers || 0).toLocaleString(),
                        sub: 'Registered users',
                        icon: FiUsers,
                        color: '#8B5CF6',
                        bg: '#F5F3FF',
                        gradient: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
                    },
                    {
                        label: 'Total Products',
                        value: (stats?.totalProducts || 0).toLocaleString(),
                        sub: 'In catalog',
                        icon: FiShoppingBag,
                        color: '#F59E0B',
                        bg: '#FFFBEB',
                        gradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                    },
                    {
                        label: "Today's Orders",
                        value: (stats?.todayOrders || 0).toLocaleString(),
                        sub: `${stats?.deliveredOrders || 0} delivered total`,
                        icon: FiPackage,
                        color: 'var(--color-primary)',
                        bg: 'var(--color-primary-lightest)',
                        gradient: 'linear-gradient(135deg, var(--color-primary-lightest) 0%, var(--color-primary-border) 100%)',
                    },
                ].map((item, i) => (
                    <div key={i} style={{
                        background: item.gradient, border: '0.5px solid #f3f3f3', borderRadius: '12px',
                        padding: '13px 15px', position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{
                            position: 'absolute', top: '-10px', right: '-10px',
                            width: '54px', height: '54px', borderRadius: '50%',
                            background: `${item.color}10`,
                        }} />
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '9px',
                            background: '#fff', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', flexShrink: 0, marginBottom: '8px',
                            boxShadow: '0 1px 5px rgba(0,0,0,0.05)',
                        }}>
                            <item.icon size={16} color={item.color} />
                        </div>
                        {isLoading ? (
                            <div style={{ width: '56px', height: '20px', background: '#e5e7eb', borderRadius: '6px' }} />
                        ) : (
                            <p style={{ fontSize: '20px', fontWeight: 800, color: '#111', margin: 0, lineHeight: 1 }}>
                                {item.value}
                            </p>
                        )}
                        <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 0', fontWeight: 500 }}>{item.label}</p>
                        <p style={{ fontSize: '11px', color: item.color, margin: '2px 0 0', fontWeight: 600 }}>{item.sub}</p>
                    </div>
                ))}
            </div>

            {/* Order Status Pipeline */}
            <div style={{
                background: '#fff', border: '1px solid #eee', borderRadius: '14px',
                padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '8px',
                overflowX: 'auto',
            }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#555', marginRight: '8px', whiteSpace: 'nowrap' }}>
                    Order Pipeline:
                </span>
                {[
                    { label: 'Pending', value: orderStats.pending || 0, color: '#D97706', bg: '#FEF3C7' },
                    { label: 'Confirmed', value: orderStats.confirmed || 0, color: '#2563EB', bg: '#DBEAFE' },
                    { label: 'Processing', value: orderStats.processing || 0, color: '#7C3AED', bg: '#EDE9FE' },
                    { label: 'Shipped', value: orderStats.shipped || 0, color: '#4F46E5', bg: '#E0E7FF' },
                    { label: 'Delivered', value: orderStats.delivered || 0, color: 'var(--color-primary)', bg: 'var(--color-primary-border)' },
                    { label: 'Cancelled', value: orderStats.cancelled || 0, color: '#DC2626', bg: '#FEE2E2' },
                ].map((item, i) => (
                    <React.Fragment key={item.label}>
                        {i > 0 && <span style={{ color: '#ddd', fontSize: '16px' }}>→</span>}
                        <Link href={`/dashboard/admin/orders?status=${item.label.toLowerCase()}`} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 14px', borderRadius: '20px',
                            background: item.bg, textDecoration: 'none',
                            transition: 'transform 0.15s', whiteSpace: 'nowrap',
                        }}>
                            <span style={{ fontSize: '16px', fontWeight: 800, color: item.color }}>{item.value}</span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: item.color }}>{item.label}</span>
                        </Link>
                    </React.Fragment>
                ))}
            </div>

            {/* Orders Table + Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-3.5">

                {/* LEFT COLUMN: Orders & Revenue chart + Recent Orders */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: 0 }}>

                {/* Orders & Revenue chart */}
                <div style={{ background: '#fff', border: '0.5px solid #f3f3f3', borderRadius: '12px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#111', margin: 0 }}>Revenue Overview</h3>
                            <p style={{ fontSize: '12px', color: '#999', margin: '3px 0 0' }}>Monthly performance</p>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', fontWeight: 600 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#555' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: 'var(--color-primary)' }} /> Revenue</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#555' }}><span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#4F46E5' }} /> Orders</span>
                        </div>
                    </div>

                    {(() => {
                        // Continuous last-12-months window (gaps filled with 0) → the reference look.
                        const map: Record<string, any> = {};
                        monthly.forEach((p: any) => { map[`${p.month}-${p.year}`] = p; });
                        const now = new Date();
                        const series = Array.from({ length: 12 }, (_, k) => {
                            const d = new Date(now.getFullYear(), now.getMonth() - (11 - k), 1);
                            const label = d.toLocaleString('en-US', { month: 'short' });
                            const e = map[`${label}-${d.getFullYear()}`];
                            return { label, revenue: e?.revenue || 0, orders: e?.orders || 0 };
                        });
                        const totalRev = series.reduce((s, m) => s + m.revenue, 0);
                        const totalOrd = series.reduce((s, m) => s + m.orders, 0);
                        const thisMonthRev = series[series.length - 1].revenue;
                        const aov = totalOrd > 0 ? Math.round(totalRev / totalOrd) : 0;

                        const niceMax = (v: number) => { if (v <= 0) return 1000; const pow = Math.pow(10, Math.floor(Math.log10(v))); const nrm = v / pow; const st = nrm <= 1 ? 1 : nrm <= 2 ? 2 : nrm <= 5 ? 5 : 10; return st * pow; };
                        const maxRev = niceMax(Math.max(...series.map(m => m.revenue), 1));
                        const maxOrd = Math.max(...series.map(m => m.orders), 1);

                        const W = 640, H = 184, padL = 42, padR = 10, padT = 10, padB = 24;
                        const cw = W - padL - padR, ch = H - padT - padB, n = series.length;
                        const baseY = padT + ch;
                        const x = (i: number) => padL + (cw * i) / (n - 1);
                        const yRev = (v: number) => padT + ch - (v / maxRev) * ch;
                        const yOrd = (v: number) => padT + ch - (v / maxOrd) * ch;
                        const revPts = series.map((m, i) => ({ x: x(i), y: yRev(m.revenue) }));
                        const ordPts = series.map((m, i) => ({ x: x(i), y: yOrd(m.orders) }));
                        // Catmull-Rom → cubic bézier: the smooth, "smart" curve.
                        const smooth = (P: { x: number; y: number }[]) => {
                            if (P.length < 2) return '';
                            let d = `M ${P[0].x} ${P[0].y}`;
                            for (let i = 0; i < P.length - 1; i++) {
                                const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
                                const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
                                const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
                                d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
                            }
                            return d;
                        };
                        const revLine = smooth(revPts);
                        const revArea = `${revLine} L ${revPts[n - 1].x} ${baseY} L ${revPts[0].x} ${baseY} Z`;
                        const ordLine = smooth(ordPts);
                        const ticks = [1, 0.75, 0.5, 0.25, 0];
                        const fmtTick = (v: number) => v >= 1000 ? `৳${Math.round(v / 1000)}K` : `৳${Math.round(v)}`;

                        return (
                            <>
                                <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
                                    <defs>
                                        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.22} />
                                            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    {ticks.map((g, gi) => {
                                        const yy = baseY - g * ch;
                                        return (
                                            <g key={gi}>
                                                <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="#f7f7f7" strokeWidth={1} strokeDasharray="4 5" />
                                                <text x={padL - 8} y={yy + 3} textAnchor="end" fontSize={6.5} fill="#cccccc">{fmtTick(maxRev * g)}</text>
                                            </g>
                                        );
                                    })}
                                    <path d={revArea} fill="url(#revFill)" />
                                    <path d={revLine} fill="none" stroke="var(--color-primary)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
                                    <path d={ordLine} fill="none" stroke="#4F46E5" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
                                    {series.map((m, i) => (m.revenue > 0 ? <circle key={'r' + i} cx={x(i)} cy={yRev(m.revenue)} r={2.8} fill="#fff" stroke="var(--color-primary)" strokeWidth={1.5} /> : null))}
                                    {series.map((m, i) => (<text key={'t' + i} x={x(i)} y={H - 7} textAnchor="middle" fontSize={6.5} fill="#bcbcbc">{m.label}</text>))}
                                </svg>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ borderTop: '0.5px solid #f3f3f3', marginTop: '10px', paddingTop: '10px' }}>
                                    {[
                                        { label: 'This Month', value: formatCurrency(thisMonthRev), color: '#111' },
                                        { label: 'Avg Order Value', value: formatCurrency(aov), color: '#111' },
                                        { label: 'Total Orders', value: totalOrd.toLocaleString(), color: '#4F46E5' },
                                        { label: 'Total Revenue', value: formatCurrency(totalRev), color: 'var(--color-primary)' },
                                    ].map((c, i) => (
                                        <div key={i}>
                                            <p style={{ fontSize: '11px', color: '#999', margin: 0, fontWeight: 500 }}>{c.label}</p>
                                            <p style={{ fontSize: '16px', fontWeight: 800, color: c.color, margin: '4px 0 0', lineHeight: 1 }}>{c.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        );
                    })()}
                </div>

                {/* Recent Orders */}
                <div style={{
                    background: '#fff', border: '1px solid #eee', borderRadius: '14px',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#111', margin: 0 }}>Recent Orders</h3>
                            {recentOrders.length > 0 && (
                                <span style={{
                                    fontSize: '10px', fontWeight: 700, color: '#fff',
                                    background: 'var(--color-primary)', padding: '2px 8px', borderRadius: '999px',
                                }}>
                                    {recentOrders.length}
                                </span>
                            )}
                        </div>
                        <Link href="/dashboard/admin/orders" style={{
                            fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)',
                            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px',
                        }}>
                            View All <FiArrowRight size={12} />
                        </Link>
                    </div>

                    {recentOrders.length > 0 ? (
                        <div>
                            {recentOrders.map((order: any, i: number) => {
                                const sc = statusColor(order.status);
                                return (
                                    <Link key={order._id || i} href={`/dashboard/admin/orders/${order._id}`}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px 20px', textDecoration: 'none',
                                            borderBottom: i < recentOrders.length - 1 ? '1px solid #f8f8f8' : 'none',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '36px', height: '36px', borderRadius: '10px',
                                                background: sc.bg,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0,
                                            }}>
                                                {order.status === 'pending'
                                                    ? <FiClock size={15} color={sc.text} />
                                                    : order.status === 'shipped'
                                                        ? <FiTruck size={15} color={sc.text} />
                                                        : order.status === 'delivered'
                                                            ? <FiCheckCircle size={15} color={sc.text} />
                                                            : <FiShoppingCart size={15} color={sc.text} />
                                                }
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: 700, color: '#111', margin: 0 }}>
                                                    {order.user?.firstName || order.shippingAddress?.fullName || 'Customer'} {order.user?.lastName || ''}
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                    <span style={{ fontSize: '11px', color: '#aaa', fontWeight: 500 }}>{order.orderId}</span>
                                                    <span style={{ fontSize: '11px', color: '#ddd' }}>•</span>
                                                    <span style={{
                                                        fontSize: '10px', fontWeight: 700,
                                                        color: sc.text, background: sc.bg,
                                                        padding: '1px 6px', borderRadius: '4px',
                                                        textTransform: 'capitalize',
                                                    }}>
                                                        {order.status}
                                                    </span>
                                                    {order.shippingAddress?.phone && (
                                                        <>
                                                            <span style={{ fontSize: '11px', color: '#ddd' }}>•</span>
                                                            <span style={{ fontSize: '10.5px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                <FiPhone size={9} /> {order.shippingAddress.phone}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                                                {formatCurrency(order.total)}
                                            </p>
                                            <p style={{ fontSize: '10px', color: '#ccc', margin: '2px 0 0', fontWeight: 500 }}>
                                                {order.createdAt ? timeAgo(order.createdAt) : ''}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ padding: '50px', textAlign: 'center' }}>
                            <FiShoppingCart size={28} color="#ddd" style={{ margin: '0 auto 10px' }} />
                            <p style={{ fontSize: '13px', color: '#bbb', margin: 0 }}>No website orders yet</p>
                        </div>
                    )}
                </div>
                </div>

                {/* Right Sidebar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                    {/* Quick Actions */}
                    <div style={{
                        background: '#fff', border: '1px solid #eee', borderRadius: '14px',
                        padding: '16px',
                    }}>
                        <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#111', margin: '0 0 12px' }}>Quick Actions</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {[
                                { label: 'Add Product', href: '/dashboard/admin/products/new', icon: FiPlus, color: 'var(--color-primary)', bg: 'var(--color-primary-lightest)' },
                                { label: 'All Orders', href: '/dashboard/admin/orders', icon: FiShoppingCart, color: '#3B82F6', bg: '#EFF6FF' },
                                { label: 'Shipping', href: '/dashboard/admin/shipping', icon: FiTruck, color: '#F59E0B', bg: '#FFFBEB' },
                                { label: 'Reports', href: '/dashboard/admin/analytics', icon: FiTrendingUp, color: '#8B5CF6', bg: '#F5F3FF' },
                                { label: 'Coupons', href: '/dashboard/admin/coupons', icon: FiTag, color: '#EC4899', bg: '#FDF2F8' },
                                { label: 'Reviews', href: '/dashboard/admin/reviews', icon: FiStar, color: '#06B6D4', bg: '#ECFEFF' },
                            ].map((item, i) => (
                                <Link key={i} href={item.href} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '10px 12px', background: item.bg, borderRadius: '10px',
                                    textDecoration: 'none', color: item.color, fontSize: '12px', fontWeight: 600,
                                    transition: 'all 0.15s', border: '1px solid transparent',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
                                >
                                    <item.icon size={14} />
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Top Products */}
                    <div style={{
                        background: '#fff', border: '1px solid #eee', borderRadius: '14px',
                        padding: '16px',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#111', margin: 0 }}>Top Products</h3>
                            <Link href="/dashboard/admin/products" style={{
                                fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)',
                                textDecoration: 'none',
                            }}>View All</Link>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {topProducts.length > 0 ? topProducts.map((product: any, i: number) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '8px 10px', background: '#fafafa', borderRadius: '10px',
                                }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '8px',
                                        background: '#f0f0f0', overflow: 'hidden', flexShrink: 0,
                                        border: '1px solid #eee',
                                    }}>
                                        {product.thumbnail ? (
                                            <img src={product.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <FiShoppingBag size={14} color="#ccc" />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#333', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {product.name}
                                        </p>
                                        <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>
                                            {formatCurrency(product.price)} · {product.stock || 0} stock
                                        </p>
                                    </div>
                                    <span style={{
                                        fontSize: '10px', fontWeight: 700,
                                        color: 'var(--color-primary)', background: 'var(--color-primary-lightest)',
                                        padding: '2px 6px', borderRadius: '4px',
                                    }}>
                                        #{i + 1}
                                    </span>
                                </div>
                            )) : (
                                <p style={{ fontSize: '11px', color: '#bbb', textAlign: 'center', padding: '16px 0' }}>No products yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Sales by Category (moved to the bottom) */}
            <div style={{
                background: '#fff', border: '1px solid #eee', borderRadius: '14px',
                padding: '20px',
            }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111', margin: '0 0 16px' }}>Sales by Category</h3>
                {salesByCategory.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {salesByCategory.slice(0, 8).map((cat: any, i: number) => {
                            const totalSales = salesByCategory.reduce((sum: number, c: any) => sum + (c.count || c.totalSales || 0), 0);
                            const percentage = totalSales > 0 ? Math.round(((cat.count || cat.totalSales || 0) / totalSales) * 100) : 0;
                            return (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#555', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{
                                                width: '8px', height: '8px', borderRadius: '50%',
                                                background: catColors[i % catColors.length],
                                                display: 'inline-block',
                                            }} />
                                            {cat._id || cat.category || 'Other'}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#333' }}>
                                            {percentage}% ({cat.count || cat.totalSales || 0})
                                        </span>
                                    </div>
                                    <div style={{
                                        height: '6px', background: '#f0f0f0', borderRadius: '3px', overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            height: '100%', borderRadius: '3px',
                                            background: catColors[i % catColors.length],
                                            width: `${percentage}%`,
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '30px 0' }}>
                        <FiShoppingBag size={24} color="#ddd" style={{ margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '12px', color: '#bbb' }}>No category data yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
