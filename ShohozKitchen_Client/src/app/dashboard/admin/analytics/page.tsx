"use client";

import React, { useState, useMemo } from 'react';
import {
    FiShoppingCart, FiUsers, FiPackage, FiRefreshCw, FiCalendar,
    FiPieChart, FiBarChart2, FiActivity, FiStar, FiClock,
    FiCheckCircle, FiTruck, FiAlertCircle, FiTarget, FiDownload, FiFilter,
    FiAlertTriangle, FiRotateCcw, FiFileText,
} from 'react-icons/fi';
import {
    useGetDashboardSummaryQuery,
    useGetSalesByCategoryQuery,
    useGetTopProductsQuery,
} from '@/redux/api/dashboardApi';
import { useGetOrderStatsQuery, useGetAdminOrdersQuery } from '@/redux/api/orderApi';
import { useGetLowStockQuery, useGetReturnsSummaryQuery } from '@/redux/api/analyticsApi';
import { downloadReportPdf } from '@/lib/downloadReport';

// ── Stat Card ──
const StatCard = ({ title, value, sub, icon: Icon, color, bgColor }: any) => (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden">
        <div className="absolute -top-4 -right-4 w-16 h-16 rounded-full" style={{ background: `${color}08` }} />
        <div className="flex items-start justify-between">
            <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
                {sub && <p className="text-xs font-semibold mt-1" style={{ color }}>{sub}</p>}
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: bgColor }}>
                <Icon size={22} style={{ color }} />
            </div>
        </div>
    </div>
);

// ── Excel Export ──
function exportToExcel(data: any[], fileName: string) {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','),
        ...data.map(row =>
            headers.map(h => {
                let val = row[h] ?? '';
                if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
                    val = `"${val.replace(/"/g, '""')}"`;
                }
                return val;
            }).join(',')
        ),
    ];
    const csvString = '\uFEFF' + csvRows.join('\n'); // BOM for UTF-8
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export default function ReportAnalysisPage() {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'customers'>('overview');

    const { data: summaryData, isLoading, refetch } = useGetDashboardSummaryQuery(undefined);
    const { data: categoryData } = useGetSalesByCategoryQuery(undefined);
    const { data: topProductsData } = useGetTopProductsQuery(20);
    const { data: orderStatsData } = useGetOrderStatsQuery(undefined);
    const { data: allOrdersData } = useGetAdminOrdersQuery({ limit: 200 });
    const { data: lowStockData } = useGetLowStockQuery(undefined);
    const { data: returnsSummaryData } = useGetReturnsSummaryQuery();

    const lowStock = lowStockData?.data || [];
    const returnsSummary = returnsSummaryData?.data;

    const [pdfLoading, setPdfLoading] = useState(false);
    const handleExportPdf = async () => {
        try {
            setPdfLoading(true);
            await downloadReportPdf('admin');
        } catch (err) {
            console.error(err);
            alert('Failed to download PDF report');
        } finally {
            setPdfLoading(false);
        }
    };

    const stats = summaryData?.data || {};
    const salesByCategory = categoryData?.data || [];
    const topProducts = topProductsData?.data || [];
    const allOrders = allOrdersData?.data?.orders || allOrdersData?.data || [];
    const orderStats = orderStatsData?.data || {};

    const catColors = ['var(--color-primary)', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4', '#EF4444', '#10B981'];

    const statusConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
        pending: { color: '#D97706', bg: '#FEF3C7', icon: FiClock, label: 'Pending' },
        confirmed: { color: '#2563EB', bg: '#DBEAFE', icon: FiCheckCircle, label: 'Confirmed' },
        processing: { color: '#7C3AED', bg: '#EDE9FE', icon: FiPackage, label: 'Processing' },
        shipped: { color: '#4F46E5', bg: '#E0E7FF', icon: FiTruck, label: 'Shipped' },
        delivered: { color: 'var(--color-primary)', bg: 'var(--color-primary-border)', icon: FiCheckCircle, label: 'Delivered' },
        cancelled: { color: '#DC2626', bg: '#FEE2E2', icon: FiAlertCircle, label: 'Cancelled' },
    };

    // Filter orders by date
    const filteredOrders = useMemo(() => {
        if (!Array.isArray(allOrders)) return [];
        return allOrders.filter((order: any) => {
            if (!order.createdAt) return true;
            const d = new Date(order.createdAt);
            if (dateFrom && d < new Date(dateFrom)) return false;
            if (dateTo) {
                const to = new Date(dateTo);
                to.setHours(23, 59, 59, 999);
                if (d > to) return false;
            }
            return true;
        });
    }, [allOrders, dateFrom, dateTo]);

    const formatCurrency = (n: number) => `৳${(n || 0).toLocaleString()}`;
    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // ── Export handlers ──
    const exportOrders = () => {
        const data = filteredOrders.map((o: any) => ({
            OrderNo: o.orderId || '',
            Customer: o.user?.firstName ? `${o.user.firstName} ${o.user.lastName || ''}` : o.shippingAddress?.fullName || 'Guest',
            Email: o.user?.email || o.shippingAddress?.email || '',
            Phone: o.shippingAddress?.phone || '',
            Status: o.status || '',
            Total: o.total || 0,
            Payment: o.paymentMethod || '',
            Address: o.shippingAddress?.address || '',
            Date: o.createdAt ? formatDate(o.createdAt) : '',
        }));
        exportToExcel(data, 'orders_report');
    };

    const exportProducts = () => {
        const data = topProducts.map((p: any, i: number) => ({
            Rank: i + 1,
            Name: p.name || '',
            Price: p.price || 0,
            TotalSold: p.totalSold || 0,
            Stock: p.stock || 0,
            Rating: p.averageRating?.toFixed(1) || '0',
        }));
        exportToExcel(data, 'products_report');
    };

    const exportSummary = () => {
        const rows = [
            { Metric: 'Total Orders', Value: stats.totalOrders || 0 },
            { Metric: 'Total Customers', Value: stats.totalCustomers || 0 },
            { Metric: 'Total Products', Value: stats.totalProducts || 0 },
            { Metric: 'Today Orders', Value: stats.todayOrders || 0 },
            { Metric: 'Pending Orders', Value: stats.pendingOrders || 0 },
            { Metric: 'Delivered Orders', Value: stats.deliveredOrders || 0 },
            { Metric: 'Total Categories', Value: stats.totalCategories || 0 },
            ...Object.entries(orderStats).map(([k, v]) => ({ Metric: `Orders - ${k}`, Value: v as number })),
        ];
        exportToExcel(rows, 'summary_report');
    };

    const tabs = [
        { key: 'overview', label: 'Overview', icon: FiBarChart2 },
        { key: 'orders', label: 'Orders Report', icon: FiShoppingCart },
        { key: 'products', label: 'Products Report', icon: FiPackage },
    ] as const;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Report & Analysis</h1>
                    <p className="text-sm text-gray-500 mt-1">Filter, analyze, and download your store reports</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => refetch()}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2 transition-all">
                        <FiRefreshCw size={14} className={isLoading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Date Filter + Export */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap items-center gap-3">
                <FiFilter size={16} className="text-gray-400" />
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500">From:</label>
                    <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)] transition" />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-500">To:</label>
                    <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--color-primary)] transition" />
                </div>
                {(dateFrom || dateTo) && (
                    <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                        className="text-xs text-red-500 font-semibold hover:underline">Clear</button>
                )}
                <div className="w-full sm:w-auto sm:ml-auto flex flex-wrap items-center gap-2">
                    <button onClick={exportSummary}
                        className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-[var(--color-primary-dark)] transition">
                        <FiDownload size={12} /> Summary
                    </button>
                    <button onClick={exportOrders}
                        className="px-3 py-1.5 bg-[#3B82F6] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-[#2563EB] transition">
                        <FiDownload size={12} /> Orders
                    </button>
                    <button onClick={exportProducts}
                        className="px-3 py-1.5 bg-[#8B5CF6] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-[#7C3AED] transition">
                        <FiDownload size={12} /> Products
                    </button>
                    <button onClick={handleExportPdf} disabled={pdfLoading}
                        className="px-3 py-1.5 bg-[#DC2626] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-[#B91C1C] transition disabled:opacity-60">
                        <FiFileText size={12} className={pdfLoading ? 'animate-pulse' : ''} /> {pdfLoading ? 'Generating…' : 'Export PDF'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {tabs.map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <tab.icon size={15} /> {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══ OVERVIEW TAB ═══ */}
            {activeTab === 'overview' && (
                <>
                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard title="Total Orders" value={(stats.totalOrders || 0).toLocaleString()} sub={`${stats.todayOrders || 0} today`} icon={FiShoppingCart} color="#3B82F6" bgColor="#3B82F615" />
                        <StatCard title="Total Customers" value={(stats.totalCustomers || 0).toLocaleString()} sub="Registered" icon={FiUsers} color="#8B5CF6" bgColor="#8B5CF615" />
                        <StatCard title="Total Products" value={(stats.totalProducts || 0).toLocaleString()} sub={`${stats.totalCategories || 0} categories`} icon={FiPackage} color="#F59E0B" bgColor="#F59E0B15" />
                        <StatCard title="Delivered" value={(stats.deliveredOrders || 0).toLocaleString()} sub={`${stats.pendingOrders || 0} pending`} icon={FiCheckCircle} color="var(--color-primary)" bgColor="var(--color-primary)15" />
                    </div>

                    {/* Order Pipeline */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><FiTarget size={16} /> Order Pipeline</h2>
                        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
                            {Object.entries(statusConfig).map(([status, config]) => (
                                <div key={status} className="rounded-xl p-3 text-center" style={{ background: config.bg }}>
                                    <config.icon size={18} style={{ color: config.color, margin: '0 auto 6px' }} />
                                    <p className="text-xl font-bold" style={{ color: config.color }}>{orderStats[status] || 0}</p>
                                    <p className="text-[10px] font-semibold capitalize" style={{ color: config.color }}>{config.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><FiPieChart size={16} /> Sales by Category</h2>
                        {salesByCategory.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {salesByCategory.slice(0, 8).map((cat: any, i: number) => {
                                    const total = salesByCategory.reduce((s: number, c: any) => s + (c.totalSales || c.count || 0), 0);
                                    const pct = total > 0 ? Math.round(((cat.totalSales || cat.count || 0) / total) * 100) : 0;
                                    return (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: catColors[i % catColors.length] }} />
                                            <span className="text-sm text-gray-600 flex-1 truncate">{cat.name || 'Uncategorized'}</span>
                                            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: catColors[i % catColors.length] }} />
                                            </div>
                                            <span className="text-xs font-bold text-gray-700 w-10 text-right">{pct}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-8">No category data yet</p>
                        )}
                    </div>

                    {/* Returns Summary */}
                    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                        <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2"><FiRotateCcw size={16} /> Returns Summary</h2>
                        {returnsSummary ? (
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                <div className="rounded-xl p-3 text-center bg-gray-50">
                                    <p className="text-2xl font-bold text-gray-800">{returnsSummary.total}</p>
                                    <p className="text-[11px] font-semibold text-gray-500 mt-0.5">Total Returns</p>
                                </div>
                                <div className="rounded-xl p-3 text-center" style={{ background: '#FEF3C7' }}>
                                    <p className="text-2xl font-bold" style={{ color: '#D97706' }}>{returnsSummary.pending}</p>
                                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#D97706' }}>Pending</p>
                                </div>
                                <div className="rounded-xl p-3 text-center" style={{ background: '#DBEAFE' }}>
                                    <p className="text-2xl font-bold" style={{ color: '#2563EB' }}>{returnsSummary.approved}</p>
                                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#2563EB' }}>Approved</p>
                                </div>
                                <div className="rounded-xl p-3 text-center" style={{ background: 'var(--color-primary-border)' }}>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{returnsSummary.refunded}</p>
                                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--color-primary)' }}>Refunded</p>
                                </div>
                                <div className="rounded-xl p-3 text-center col-span-2 lg:col-span-1" style={{ background: '#FEE2E2' }}>
                                    <p className="text-2xl font-bold" style={{ color: '#DC2626' }}>{formatCurrency(returnsSummary.refundAmount)}</p>
                                    <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#DC2626' }}>Refund Amount</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-8">No returns data yet</p>
                        )}
                    </div>

                    {/* Low Stock Alert */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3C7' }}>
                                <FiAlertTriangle size={16} style={{ color: '#D97706' }} />
                            </span>
                            <h2 className="text-base font-bold text-gray-800">Low Stock Alert</h2>
                            <span className="text-sm font-normal text-gray-400">({lowStock.length} products)</span>
                        </div>
                        {lowStock.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-amber-50">
                                            <th className="text-left px-4 py-3 text-xs font-bold text-amber-700 uppercase">Product</th>
                                            <th className="text-left px-4 py-3 text-xs font-bold text-amber-700 uppercase">Shop</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-amber-700 uppercase">Stock Left</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowStock.map((p) => (
                                            <tr key={p._id} className="border-t border-gray-50 hover:bg-amber-50/40">
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-3">
                                                        {p.thumbnail ? (
                                                            <img src={p.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover border" />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><FiPackage size={14} className="text-gray-300" /></div>
                                                        )}
                                                        <span className="font-semibold text-gray-700 truncate max-w-[220px]">{p.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-500">{p.shopName || '—'}</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${p.stock === 0 ? 'text-red-600 bg-red-50' : 'text-amber-700 bg-amber-100'}`}>
                                                        {p.stock} left
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-10">All products are well stocked</p>
                        )}
                    </div>
                </>
            )}

            {/* ═══ ORDERS TAB ═══ */}
            {activeTab === 'orders' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-base font-bold text-gray-800">
                            Orders Report <span className="text-sm font-normal text-gray-400 ml-2">({filteredOrders.length} records)</span>
                        </h2>
                        <button onClick={exportOrders}
                            className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-[var(--color-primary-dark)]">
                            <FiDownload size={12} /> Download Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Order #</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Customer</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Phone</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Total</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.length > 0 ? filteredOrders.slice(0, 100).map((order: any, i: number) => {
                                    const sc = statusConfig[order.status] || statusConfig.pending;
                                    return (
                                        <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                                            <td className="px-4 py-2.5 font-semibold text-gray-700">{order.orderId}</td>
                                            <td className="px-4 py-2.5 text-gray-600">
                                                {order.user?.firstName ? `${order.user.firstName} ${order.user.lastName || ''}` : order.shippingAddress?.fullName || 'Guest'}
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-500">{order.shippingAddress?.phone || '—'}</td>
                                            <td className="px-4 py-2.5">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded capitalize" style={{ color: sc.color, background: sc.bg }}>{order.status}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-bold text-[var(--color-primary)]">{formatCurrency(order.total)}</td>
                                            <td className="px-4 py-2.5 text-gray-400 text-xs">{order.createdAt ? formatDate(order.createdAt) : '—'}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No orders found for selected date range</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ═══ PRODUCTS TAB ═══ */}
            {activeTab === 'products' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-base font-bold text-gray-800">
                            Products Report <span className="text-sm font-normal text-gray-400 ml-2">({topProducts.length} products)</span>
                        </h2>
                        <button onClick={exportProducts}
                            className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-[var(--color-primary-dark)]">
                            <FiDownload size={12} /> Download Excel
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">#</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Product</th>
                                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Price</th>
                                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Sold</th>
                                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Stock</th>
                                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase">Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.length > 0 ? topProducts.map((product: any, i: number) => (
                                    <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50">
                                        <td className="px-4 py-2.5 text-gray-400 font-bold">{i + 1}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-3">
                                                {product.thumbnail ? (
                                                    <img src={product.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover border" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><FiPackage size={14} className="text-gray-300" /></div>
                                                )}
                                                <span className="font-semibold text-gray-700 truncate max-w-[200px]">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-right font-semibold text-[var(--color-primary)]">{formatCurrency(product.price)}</td>
                                        <td className="px-4 py-2.5 text-right text-gray-600">{product.totalSold || 0}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            <span className={`font-semibold ${(product.stock || 0) > 0 ? 'text-green-600' : 'text-red-500'}`}>{product.stock || 0}</span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            {product.averageRating > 0 ? (
                                                <span className="text-amber-500 flex items-center gap-0.5 justify-end"><FiStar size={11} /> {product.averageRating.toFixed(1)}</span>
                                            ) : <span className="text-gray-300">—</span>}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="text-center py-12 text-gray-400">No products yet</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
