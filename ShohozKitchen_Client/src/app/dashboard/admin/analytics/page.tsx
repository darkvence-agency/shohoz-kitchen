/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
    LuRefreshCw, LuFileText, LuDownload, LuChevronLeft, LuChevronRight, LuPackage, LuArrowUpRight,
    LuArrowDownRight, LuX, LuArrowDown, LuArrowUp, LuTriangleAlert, LuExternalLink,
} from 'react-icons/lu';
import {
    useGetSalesReportQuery,
    useGetSalesReportOrdersQuery,
    useLazyGetSalesReportOrdersQuery,
    useGetLowStockQuery,
    type ReportPeriod,
    type SalesReport,
    type StatusBucket,
} from '@/redux/api/analyticsApi';
import { getStatusConfig, paymentMethodLabel } from '@/lib/orderStatus';
import {
    PageHeader, Btn, Segmented, SearchInput, SelectPill, StatTile, Badge, Card, TableCard, TH, TD, TR,
    EmptyRow, SkeletonRows, Pager, taka, fmtDateTime, cx, type Tone,
} from '@/components/admin/ui';
import TrendChart from './_components/TrendChart';
import { downloadCsv, downloadSalesPdf, periodSlug } from './_components/exporters';
import {
    MAX_RANGE_DAYS, PRESETS, addDays, daySpan, dhakaToday, fmtDay, fmtPeriod, isDay,
} from './_components/period';

const PAGE_SIZE = 10;

/** The seven status groups, in the client's order, with the Orders page's tones. */
const BUCKETS: { key: StatusBucket; label: string; tone: Tone; title: string }[] = [
    { key: 'pending', label: 'Pending', tone: 'amber', title: 'Pending' },
    { key: 'confirmed', label: 'Confirmed', tone: 'blue', title: 'Confirmed' },
    { key: 'processing', label: 'Packed', tone: 'purple', title: 'Processing (packed, not yet handed to the courier)' },
    { key: 'shipped', label: 'Shipped', tone: 'indigo', title: 'Shipped, on the way, out for delivery or delivery attempted' },
    { key: 'delivered', label: 'Delivered', tone: 'green', title: 'Delivered' },
    { key: 'returned', label: 'Returned', tone: 'gray', title: 'Returned or refunded' },
    { key: 'cancelled', label: 'Cancelled', tone: 'red', title: 'Cancelled' },
];
const BUCKET_LABEL = Object.fromEntries(BUCKETS.map((b) => [b.key, b.label])) as Record<StatusBucket, string>;

/** Raw order statuses folded into a bucket — shown as a breakdown line. */
const SUB_STATUSES: Partial<Record<StatusBucket, string[]>> = {
    shipped: ['on_the_way', 'out_for_delivery', 'delivery_attempt'],
    returned: ['refunded'],
};

// Same tones as the Orders page.
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

const LOW_STOCK_OPTIONS = [
    { value: 'own', label: 'Own restock level' },
    { value: '0', label: 'Out of stock only' },
    { value: '5', label: '5 or fewer' },
    { value: '10', label: '10 or fewer' },
    { value: '20', label: '20 or fewer' },
];

type Mode = 'single' | 'range';
type SortKey = 'qty' | 'revenue' | 'orders' | 'name';
const num = (n: number) => Number(n || 0).toLocaleString('en-IN');

/* ─── Small pieces ───────────────────────────────────────── */

/** "▲ 12% vs previous day" — green up, red down. */
function Delta({ now, prev, vs }: { now: number; prev: number; vs: string }) {
    const pct = prev ? Math.round(((now - prev) / prev) * 100) : null;
    if (now === prev || pct === 0) return <span className="text-gray-400">No change vs {vs}</span>;
    const up = now > prev;
    return (
        <span className="inline-flex flex-wrap items-center gap-1">
            <span className={cx('inline-flex items-center font-medium', up ? 'text-emerald-600' : 'text-red-600')}>
                {up ? <LuArrowUpRight size={13} /> : <LuArrowDownRight size={13} />}
                {pct === null ? 'from 0' : `${Math.abs(pct)}%`}
            </span>
            <span className="text-gray-400">vs {vs}</span>
        </span>
    );
}

function DateInput({ label, value, onChange, min, max }: {
    label: string; value: string; onChange: (v: string) => void; min?: string; max?: string;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-xs text-gray-500">{label}</span>
            <input
                type="date"
                value={value}
                min={min}
                max={max}
                onChange={(e) => { if (isDay(e.target.value)) onChange(e.target.value); }}
                className="h-9 rounded-full border border-transparent bg-gray-100 px-4 text-sm text-gray-800 outline-none transition focus:border-[var(--color-primary-border)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]"
            />
        </label>
    );
}

function SortTh({ label, k, sort, onSort, right, className }: {
    label: string; k: SortKey; sort: { key: SortKey; dir: 'asc' | 'desc' }; onSort: (k: SortKey) => void; right?: boolean; className?: string;
}) {
    const active = sort.key === k;
    return (
        <th className={cx(TH, right && 'text-right', className)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
            <button type="button" onClick={() => onSort(k)} className={cx('inline-flex items-center gap-1 hover:text-[var(--color-primary)]', right && 'flex-row-reverse')}>
                {label}
                <span className={cx('text-gray-400', !active && 'opacity-0')}>
                    {sort.dir === 'asc' ? <LuArrowUp size={13} /> : <LuArrowDown size={13} />}
                </span>
            </button>
        </th>
    );
}

function StockCell({ stock }: { stock: number | null }) {
    if (stock === null) return <span className="text-gray-400">—</span>;
    if (stock <= 0) return <Badge tone="red">Out of stock</Badge>;
    if (stock <= 5) return <Badge tone="amber">{num(stock)} left</Badge>;
    return <span>{num(stock)}</span>;
}

function Thumb({ src }: { src: string }) {
    return src ? (
        <img src={src} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-gray-100 object-cover" />
    ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300"><LuPackage size={16} /></span>
    );
}

/* ─── Page ───────────────────────────────────────────────── */

export default function SalesReportPage() {
    const today = dhakaToday();
    const [sel, setSel] = useState<{ mode: Mode; from: string; to: string }>(() => {
        const t = dhakaToday();
        return { mode: 'single', from: t, to: t };
    });
    const period: ReportPeriod = { from: sel.from, to: sel.to };
    const days = daySpan(sel.from, sel.to);

    const [statusFilter, setStatusFilter] = useState<StatusBucket | null>(null);
    const [ordersPage, setOrdersPage] = useState(1);
    const [metric, setMetric] = useState<'orders' | 'value'>('orders');
    const [prodSearch, setProdSearch] = useState('');
    const [prodSort, setProdSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'qty', dir: 'desc' });
    const [prodPage, setProdPage] = useState(1);
    const [lowStockLevel, setLowStockLevel] = useState('own');
    const [pdfLoading, setPdfLoading] = useState(false);

    /** Every period change goes through here so the tables start on page 1. */
    const choose = (next: { mode: Mode; from: string; to: string }) => {
        let { from, to } = next;
        if (next.mode === 'single') to = from;
        if (from > to) [from, to] = [to, from];
        if (daySpan(from, to) > MAX_RANGE_DAYS) from = addDays(to, -(MAX_RANGE_DAYS - 1));
        setSel({ mode: next.mode, from, to });
        setOrdersPage(1);
        setProdPage(1);
    };

    const { data, isLoading, isFetching, isError, refetch } = useGetSalesReportQuery(period);
    const { data: ordersData, isLoading: ordersLoading, isFetching: ordersFetching, isError: ordersError, refetch: refetchOrders } = useGetSalesReportOrdersQuery({
        ...period, status: statusFilter ?? undefined, page: ordersPage, limit: PAGE_SIZE,
    });
    const { data: lowStockData, isLoading: lowLoading, isError: lowError, refetch: refetchLow } = useGetLowStockQuery(
        lowStockLevel === 'own' ? undefined : Number(lowStockLevel),
    );
    const [fetchOrdersForExport, { isFetching: exportingOrders }] = useLazyGetSalesReportOrdersQuery();

    const r: SalesReport | undefined = data?.data;
    const s = r?.summary;
    const vs = days === 1 ? 'previous day' : `previous ${days} days`;
    const periodText = fmtPeriod(sel.from, sel.to);
    const activePreset = PRESETS.find((p) => { const x = p.range(); return x.from === sel.from && x.to === sel.to; })?.key;

    // ── Products sold: search + sort + client-side pages ──
    const allProducts = useMemo(() => r?.productsSold ?? [], [r]);
    const totalRevenue = useMemo(() => allProducts.reduce((a, p) => a + p.revenue, 0), [allProducts]);
    const products = useMemo(() => {
        const q = prodSearch.trim().toLowerCase();
        const list = q ? allProducts.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)) : allProducts;
        const dir = prodSort.dir === 'asc' ? 1 : -1;
        return [...list].sort((a, b) => (prodSort.key === 'name' ? a.name.localeCompare(b.name) : a[prodSort.key] - b[prodSort.key]) * dir);
    }, [allProducts, prodSearch, prodSort]);
    const prodPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
    const prodPageSafe = Math.min(prodPage, prodPages);
    const prodRows = products.slice((prodPageSafe - 1) * PAGE_SIZE, prodPageSafe * PAGE_SIZE);
    const listedQty = products.reduce((a, p) => a + p.qty, 0);
    const listedRevenue = products.reduce((a, p) => a + p.revenue, 0);

    const onSort = (key: SortKey) => {
        setProdSort((cur) => (cur.key === key ? { key, dir: cur.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }));
        setProdPage(1);
    };

    // On a failed load RTK keeps the previous period's rows in `data` — never show those as this period's.
    const orders = (!ordersError && ordersData?.data) || [];
    const ordersMeta = (!ordersError && ordersData?.meta) || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };
    const lowStock = (!lowError && lowStockData?.data) || [];

    const pickStatus = (b: StatusBucket) => {
        setStatusFilter((cur) => (cur === b ? null : b));
        setOrdersPage(1);
        document.getElementById('period-orders')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const refreshAll = () => { refetch(); refetchOrders(); refetchLow(); };

    // ── Exports ──
    const exportProducts = () => {
        if (!products.length) { toast.error('No products to export'); return; }
        downloadCsv(
            `products-sold-${periodSlug(period)}.csv`,
            ['#', 'Product', 'SKU', 'Qty sold', 'Orders', 'Revenue (BDT)', 'Share of sales (%)', 'In stock now'],
            products.map((p, i) => [
                i + 1, p.name, p.sku, p.qty, p.orders, p.revenue,
                totalRevenue ? Math.round((p.revenue / totalRevenue) * 1000) / 10 : 0,
                p.stock === null ? '' : p.stock,
            ]),
        );
    };

    const exportOrders = async () => {
        try {
            const res = await fetchOrdersForExport({ ...period, status: statusFilter ?? undefined, page: 1, limit: 1000 }).unwrap();
            const list = res.data;
            if (!list.length) { toast.error('No orders to export'); return; }
            downloadCsv(
                `orders-${statusFilter ? `${statusFilter}-` : ''}${periodSlug(period)}.csv`,
                ['Order No', 'Placed', 'Customer', 'Phone', 'Items', 'Subtotal', 'Delivery fee', 'Discount', 'Total', 'Payment method', 'Payment status', 'Status', 'Parcel'],
                list.map((o) => [
                    o.orderId, fmtDateTime(o.createdAt), o.customer, o.phone, o.items, o.subtotal, o.shippingCost, o.discount, o.total,
                    o.paymentMethod ? paymentMethodLabel(o.paymentMethod) : '', PAYMENT[o.paymentStatus]?.label || o.paymentStatus,
                    getStatusConfig(o.status).label, o.consignmentId,
                ]),
            );
            if (res.meta.total > list.length) toast(`Exported the latest ${list.length} of ${res.meta.total} orders`);
        } catch {
            toast.error('Could not export the orders');
        }
    };

    const exportPdf = async () => {
        try {
            setPdfLoading(true);
            await downloadSalesPdf(period);
        } catch {
            toast.error('Could not download the PDF report');
        } finally {
            setPdfLoading(false);
        }
    };

    const maxCat = Math.max(1, ...(r?.byCategory ?? []).map((c) => c.revenue));
    const catTotal = (r?.byCategory ?? []).reduce((a, c) => a + c.revenue, 0);
    const trendEmpty = !r || r.trend.every((t) => t.orders === 0);

    return (
        <div>
            <PageHeader
                title="Sales report"
                subtitle={<>Orders received and products sold · {periodText}{days > 1 && <span className="text-gray-400"> ({days} days)</span>}</>}
                actions={<>
                    <Btn icon={<LuRefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />} onClick={refreshAll}>Refresh</Btn>
                    <Btn icon={<LuFileText size={15} />} onClick={exportPdf} disabled={pdfLoading || !r}>
                        {pdfLoading ? 'Preparing…' : 'PDF report'}
                    </Btn>
                </>}
            />

            {/* ── Period ── */}
            <Card className="mb-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end">
                    <div>
                        <Segmented<Mode>
                            value={sel.mode}
                            onChange={(m) => choose(m === 'single'
                                ? { mode: 'single', from: sel.to, to: sel.to }
                                : { mode: 'range', from: sel.from === sel.to ? addDays(sel.to, -6) : sel.from, to: sel.to })}
                            options={[{ value: 'single', label: 'Single day' }, { value: 'range', label: 'Date range' }]}
                        />
                    </div>

                    {sel.mode === 'single' ? (
                        <div className="flex items-end gap-2">
                            <DateInput label="Day" value={sel.from} max={today} onChange={(v) => choose({ mode: 'single', from: v, to: v })} />
                            <div className="flex gap-1">
                                <button type="button" aria-label="Previous day" onClick={() => choose({ mode: 'single', from: addDays(sel.from, -1), to: '' })}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50">
                                    <LuChevronLeft size={16} />
                                </button>
                                <button type="button" aria-label="Next day" disabled={sel.from >= today} onClick={() => choose({ mode: 'single', from: addDays(sel.from, 1), to: '' })}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">
                                    <LuChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-end gap-3">
                            <DateInput label="From" value={sel.from} max={today}
                                onChange={(v) => {
                                    // Moving "From" drags "To" along when needed (never past today, never over the max span).
                                    let to = v > sel.to ? v : sel.to;
                                    if (daySpan(v, to) > MAX_RANGE_DAYS) to = addDays(v, MAX_RANGE_DAYS - 1);
                                    if (to > today) to = today;
                                    choose({ mode: 'range', from: v, to });
                                }} />
                            <DateInput label="To" value={sel.to} min={sel.from} max={today}
                                onChange={(v) => choose({ mode: 'range', from: v < sel.from ? v : sel.from, to: v })} />
                        </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 lg:ml-auto">
                        {PRESETS.map((p) => (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => { const x = p.range(); choose({ mode: x.from === x.to ? 'single' : 'range', ...x }); }}
                                className={cx(
                                    'h-8 rounded-full border px-3 text-xs font-medium transition',
                                    activePreset === p.key
                                        ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-lightest)] text-[var(--color-primary-dark)]'
                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {isError ? (
                <Card className="mb-5">
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600"><LuTriangleAlert size={18} /></span>
                        <p className="text-sm text-gray-600">The report for {periodText} could not be loaded.</p>
                        <Btn onClick={() => refetch()} icon={<LuRefreshCw size={15} />}>Try again</Btn>
                    </div>
                </Card>
            ) : (
                <div className={cx('space-y-5 transition-opacity', isFetching && !isLoading && 'opacity-60')}>
                    {/* ── Headline tiles ── */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <StatTile
                            label="Orders received"
                            value={s ? num(s.ordersReceived) : '—'}
                            hint={r && s ? <>
                                <Delta now={s.ordersReceived} prev={r.previous.ordersReceived} vs={vs} />
                                {s.cancelledOrders > 0 && <span className="text-gray-400"> · {num(s.cancelledOrders)} cancelled</span>}
                            </> : undefined}
                        />
                        <StatTile
                            label="Total order value"
                            value={s ? taka(s.orderValue) : '—'}
                            hint={r && s ? <>
                                <Delta now={s.orderValue} prev={r.previous.orderValue} vs={vs} />
                                <span className="text-gray-400"> · excl. cancelled</span>
                            </> : undefined}
                        />
                        <StatTile
                            label="Delivery fees"
                            value={s ? taka(s.deliveryFees) : '—'}
                            hint={r && s ? <>
                                <Delta now={s.deliveryFees} prev={r.previous.deliveryFees} vs={vs} />
                                {s.freeDeliveryOrders > 0 && <span className="text-gray-400"> · {num(s.freeDeliveryOrders)} free</span>}
                            </> : undefined}
                        />
                    </div>

                    {/* ── By status ── */}
                    <Card title="By status" description="Click a status to list those orders below.">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                            {BUCKETS.map((b) => {
                                const active = statusFilter === b.key;
                                const sub = (SUB_STATUSES[b.key] ?? [])
                                    .filter((st) => r?.statusDetail[st])
                                    .map((st) => `${r?.statusDetail[st]} ${getStatusConfig(st).label.toLowerCase()}`);
                                return (
                                    <button
                                        key={b.key}
                                        type="button"
                                        title={b.title}
                                        aria-pressed={active}
                                        onClick={() => pickStatus(b.key)}
                                        className={cx(
                                            'rounded-xl border bg-white p-3 text-left transition',
                                            active ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]' : 'border-gray-200 hover:border-gray-300',
                                        )}
                                    >
                                        <Badge tone={b.tone}>{b.label}</Badge>
                                        <p className="mt-2 text-xl font-semibold tracking-tight text-gray-900">{r ? num(r.byStatus[b.key]) : '—'}</p>
                                        <p className="mt-0.5 truncate text-xs text-gray-400">{r ? taka(r.byStatusValue[b.key]) : ''}</p>
                                        {sub.length > 0 && <p className="mt-0.5 truncate text-[11px] text-gray-400" title={sub.join(', ')}>{sub.join(', ')}</p>}
                                    </button>
                                );
                            })}
                        </div>
                    </Card>

                    {/* ── Products sold ── */}
                    <section>
                        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-[15px] font-semibold text-gray-900">Products sold ({num(allProducts.length)})</h2>
                                <p className="mt-0.5 text-sm text-gray-500">From orders placed {days === 1 ? 'on' : 'between'} {periodText}, cancelled orders left out.</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <SearchInput value={prodSearch} onChange={(v) => { setProdSearch(v); setProdPage(1); }} placeholder="Search product or SKU…" className="sm:w-60" />
                                <Btn icon={<LuDownload size={15} />} onClick={exportProducts} disabled={!products.length}>Export CSV</Btn>
                            </div>
                        </div>
                        <TableCard
                            footer={products.length > PAGE_SIZE ? (
                                <Pager page={prodPageSafe} totalPages={prodPages} total={products.length} pageSize={PAGE_SIZE} count={prodRows.length} onPage={setProdPage} noun="products" />
                            ) : undefined}
                        >
                            <table className="w-full min-w-[720px]">
                                <thead>
                                    <tr>
                                        <SortTh label="Product" k="name" sort={prodSort} onSort={onSort} className="min-w-[260px]" />
                                        <SortTh label="Qty sold" k="qty" sort={prodSort} onSort={onSort} right />
                                        <SortTh label="Orders" k="orders" sort={prodSort} onSort={onSort} right />
                                        <SortTh label="Revenue" k="revenue" sort={prodSort} onSort={onSort} right />
                                        <th className={cx(TH, 'w-40')}>Share of sales</th>
                                        <th className={cx(TH, 'text-right')}>In stock</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isLoading ? <SkeletonRows rows={4} cols={6} /> : prodRows.length === 0 ? (
                                        <EmptyRow colSpan={6}>{prodSearch ? 'No product matches your search.' : `No products sold ${days === 1 ? 'on' : 'in'} ${periodText}.`}</EmptyRow>
                                    ) : prodRows.map((p) => {
                                        const share = totalRevenue ? (p.revenue / totalRevenue) * 100 : 0;
                                        return (
                                            <tr key={p.productId ?? p.name} className={TR}>
                                                <td className={TD}>
                                                    <div className="flex items-center gap-3">
                                                        <Thumb src={p.thumbnail} />
                                                        <div className="min-w-0">
                                                            {p.productId && !p.deleted ? (
                                                                <Link href={`/dashboard/admin/products/new?id=${p.productId}`} className="line-clamp-2 font-medium text-gray-900 hover:text-[var(--color-primary)]">{p.name}</Link>
                                                            ) : (
                                                                <span className="line-clamp-2 font-medium text-gray-900">{p.name}</span>
                                                            )}
                                                            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                                                                {p.sku && <span>{p.sku}</span>}
                                                                {p.deleted && <Badge tone="gray">Deleted</Badge>}
                                                                {p.status === 'draft' && <Badge tone="gray">Draft</Badge>}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={cx(TD, 'text-right font-medium text-gray-900')}>{num(p.qty)}</td>
                                                <td className={cx(TD, 'text-right')}>{num(p.orders)}</td>
                                                <td className={cx(TD, 'text-right font-medium text-gray-900')}>{taka(p.revenue)}</td>
                                                <td className={TD}>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                                                            <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${share}%` }} />
                                                        </div>
                                                        <span className="w-10 text-right text-xs text-gray-500">{share >= 10 ? Math.round(share) : share.toFixed(1)}%</span>
                                                    </div>
                                                </td>
                                                <td className={cx(TD, 'text-right')}><StockCell stock={p.stock} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {!isLoading && products.length > 0 && (
                                    <tfoot>
                                        <tr className="border-t border-gray-200 bg-gray-50/60">
                                            <td className={cx(TD, 'font-semibold text-gray-900')}>
                                                Total{prodSearch && <span className="font-normal text-gray-400"> ({num(products.length)} shown)</span>}
                                            </td>
                                            <td className={cx(TD, 'text-right font-semibold text-gray-900')}>{num(listedQty)}</td>
                                            <td className={TD} />
                                            <td className={cx(TD, 'text-right font-semibold text-gray-900')}>{taka(listedRevenue)}</td>
                                            <td className={TD} colSpan={2} />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </TableCard>
                    </section>

                    {/* ── Trend + period metrics ── */}
                    <Card
                        title={r?.period.granularity === 'hour' ? 'Orders by hour' : r?.period.granularity === 'month' ? 'Orders by month' : 'Orders by day'}
                        description="Bangladesh time. Order value leaves out cancelled orders."
                        actions={<Segmented<'orders' | 'value'> value={metric} onChange={setMetric} options={[{ value: 'orders', label: 'Orders' }, { value: 'value', label: 'Value' }]} />}
                    >
                        <div className="relative pt-2">
                            {r && <TrendChart points={r.trend} granularity={r.period.granularity} metric={metric} />}
                            {!r && <div className="h-52 animate-pulse rounded-xl bg-gray-50" />}
                            {r && trendEmpty && (
                                <p className="pointer-events-none absolute inset-x-0 top-16 text-center text-sm text-gray-400">No orders {days === 1 ? 'on' : 'in'} {periodText}</p>
                            )}
                        </div>
                        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-100 bg-gray-100 lg:grid-cols-4">
                            {[
                                { k: 'Items sold', v: s ? num(s.itemsSold) : '—', h: r && s ? <Delta now={s.itemsSold} prev={r.previous.itemsSold} vs={vs} /> : null },
                                { k: 'Average order value', v: s ? taka(s.avgOrderValue) : '—', h: s ? `${num(s.activeOrders)} orders, excl. cancelled` : null },
                                { k: 'Discounts given', v: s ? taka(s.discount) : '—', h: s ? `Items subtotal ${taka(s.subtotal)}` : null },
                                { k: 'Customers', v: s ? num(s.customers) : '—', h: s ? `${num(s.newCustomers)} new sign-up${s.newCustomers === 1 ? '' : 's'}` : null },
                            ].map((m) => (
                                <div key={m.k} className="bg-white p-4">
                                    <dt className="text-xs text-gray-500">{m.k}</dt>
                                    <dd className="mt-1 text-lg font-semibold tracking-tight text-gray-900">{m.v}</dd>
                                    {m.h && <dd className="mt-0.5 text-xs text-gray-400">{m.h}</dd>}
                                </div>
                            ))}
                        </dl>
                    </Card>

                    {/* ── Category + payments ── */}
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                        <Card title="Sales by category" description="Item revenue per category in this period.">
                            {!r ? <div className="h-40 animate-pulse rounded-xl bg-gray-50" /> : r.byCategory.length === 0 ? (
                                <p className="py-10 text-center text-sm text-gray-400">No sales in this period.</p>
                            ) : (
                                <ul className="space-y-3.5">
                                    {r.byCategory.slice(0, 8).map((c) => (
                                        <li key={c._id}>
                                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                                <span className="truncate text-gray-700">{c.name}</span>
                                                <span className="shrink-0 font-medium text-gray-900">{taka(c.revenue)}</span>
                                            </div>
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                                                <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${(c.revenue / maxCat) * 100}%` }} />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-400">
                                                {num(c.qty)} item{c.qty === 1 ? '' : 's'} · {num(c.products)} product{c.products === 1 ? '' : 's'} · {catTotal ? Math.round((c.revenue / catTotal) * 100) : 0}% of sales
                                            </p>
                                        </li>
                                    ))}
                                    {r.byCategory.length > 8 && (
                                        <li className="text-xs text-gray-400">+ {r.byCategory.length - 8} more categories</li>
                                    )}
                                </ul>
                            )}
                        </Card>

                        <Card
                            title="Payments"
                            description={s ? <>{taka(s.paidValue)} paid of {taka(s.orderValue)} · {num(s.paidOrders)} of {num(s.activeOrders)} orders</> : 'Paid and due by payment method.'}
                        >
                            {!r ? <div className="h-40 animate-pulse rounded-xl bg-gray-50" /> : r.payments.length === 0 ? (
                                <p className="py-10 text-center text-sm text-gray-400">No orders in this period.</p>
                            ) : (
                                <ul className="space-y-3.5">
                                    {r.payments.map((m) => {
                                        const paidPct = m.value ? (m.paid / m.value) * 100 : 0;
                                        return (
                                            <li key={m.method}>
                                                <div className="flex items-baseline justify-between gap-3 text-sm">
                                                    <span className="text-gray-700">{paymentMethodLabel(m.method)} <span className="text-gray-400">· {num(m.orders)} order{m.orders === 1 ? '' : 's'}</span></span>
                                                    <span className="shrink-0 font-medium text-gray-900">{taka(m.value)}</span>
                                                </div>
                                                <div className="mt-1.5 flex h-1.5 gap-[2px] overflow-hidden rounded-full">
                                                    {m.paid > 0 && <div className="h-full rounded-full bg-emerald-500" style={{ width: `${paidPct}%` }} />}
                                                    {m.value - m.paid > 0 && <div className="h-full flex-1 rounded-full bg-gray-200" />}
                                                </div>
                                                <p className="mt-1 flex gap-3 text-xs text-gray-400">
                                                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{taka(m.paid)} paid</span>
                                                    <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-300" />{taka(m.value - m.paid)} due</span>
                                                </p>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Card>
                    </div>

                    {/* ── Returns + low stock ── */}
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
                        <Card
                            className="xl:col-span-2"
                            title="Returns"
                            description="Return requests raised in this period."
                            actions={<Btn variant="ghost" href="/dashboard/admin/returns" icon={<LuExternalLink size={14} />} className="h-8 px-3">Open</Btn>}
                        >
                            {!r ? <div className="h-40 animate-pulse rounded-xl bg-gray-50" /> : (
                                <div className="grid grid-cols-2 gap-3">
                                    {([
                                        { label: 'Requests', value: r.returns.total, tone: null },
                                        { label: 'Pending', value: r.returns.pending, tone: 'amber' },
                                        { label: 'Approved', value: r.returns.approved, tone: 'blue' },
                                        { label: 'Rejected', value: r.returns.rejected, tone: 'red' },
                                        { label: 'Refunded', value: r.returns.refunded, tone: 'green' },
                                    ] as { label: string; value: number; tone: Tone | null }[]).map((x) => (
                                        <div key={x.label} className="rounded-xl border border-gray-200 p-3">
                                            {x.tone ? <Badge tone={x.tone}>{x.label}</Badge> : <span className="text-xs text-gray-500">{x.label}</span>}
                                            <p className="mt-1.5 text-lg font-semibold text-gray-900">{num(x.value)}</p>
                                        </div>
                                    ))}
                                    <div className="rounded-xl border border-gray-200 p-3">
                                        <span className="text-xs text-gray-500">Refunded amount</span>
                                        <p className="mt-1.5 text-lg font-semibold text-gray-900">{taka(r.returns.refundAmount)}</p>
                                    </div>
                                </div>
                            )}
                        </Card>

                        <Card
                            className="xl:col-span-3"
                            title={<span className="inline-flex items-center gap-2">Low stock {lowStock.length > 0 && <Badge tone="amber">{lowStock.length >= 50 ? '50+' : lowStock.length}</Badge>}</span>}
                            description="Stock right now — not tied to the period."
                            actions={<SelectPill value={lowStockLevel} onChange={setLowStockLevel} options={LOW_STOCK_OPTIONS} ariaLabel="Low stock level" className="w-48" />}
                        >
                            <div className="-mx-5 -mb-5 max-h-[360px] overflow-y-auto rounded-b-2xl border-t border-gray-100">
                                <table className="w-full">
                                    <thead className="sticky top-0 bg-white">
                                        <tr>
                                            <th className={TH}>Product</th>
                                            <th className={cx(TH, 'hidden sm:table-cell')}>SKU</th>
                                            <th className={cx(TH, 'hidden text-right sm:table-cell')}>Restock at</th>
                                            <th className={cx(TH, 'text-right')}>Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lowLoading ? <SkeletonRows rows={4} cols={4} /> : lowError ? (
                                            <EmptyRow colSpan={4}>
                                                Stock levels could not be loaded. <button type="button" onClick={() => refetchLow()} className="font-medium text-[var(--color-primary)] hover:underline">Try again</button>
                                            </EmptyRow>
                                        ) : lowStock.length === 0 ? (
                                            <EmptyRow colSpan={4}>Everything is well stocked.</EmptyRow>
                                        ) : lowStock.map((p) => (
                                            <tr key={p._id} className={TR}>
                                                <td className={TD}>
                                                    <div className="flex items-center gap-3">
                                                        <Thumb src={p.thumbnail} />
                                                        <Link href={`/dashboard/admin/products/new?id=${p._id}`} className="line-clamp-2 font-medium text-gray-900 hover:text-[var(--color-primary)]">{p.name}</Link>
                                                    </div>
                                                </td>
                                                <td className={cx(TD, 'hidden whitespace-nowrap text-gray-500 sm:table-cell')}>{p.sku || '—'}</td>
                                                <td className={cx(TD, 'hidden text-right text-gray-500 sm:table-cell')}>{num(p.lowStockThreshold)}</td>
                                                <td className={cx(TD, 'text-right')}>
                                                    {p.stock <= 0 ? <Badge tone="red">Out of stock</Badge> : <Badge tone="amber">{num(p.stock)} left</Badge>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* ── Orders in the period ── */}
            <section id="period-orders" className="mt-5 scroll-mt-4">
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-[15px] font-semibold text-gray-900">Orders {days === 1 ? `on ${fmtDay(sel.from)}` : 'in this period'} ({num(ordersMeta.total)})</h2>
                        {statusFilter && (
                            <button type="button" onClick={() => { setStatusFilter(null); setOrdersPage(1); }}
                                className="inline-flex h-7 items-center gap-1 rounded-full border border-[var(--color-primary-border)] bg-[var(--color-primary-lightest)] px-2.5 text-xs font-medium text-[var(--color-primary-dark)]">
                                {BUCKET_LABEL[statusFilter]} <LuX size={12} />
                            </button>
                        )}
                    </div>
                    <Btn icon={<LuDownload size={15} />} onClick={exportOrders} disabled={exportingOrders || ordersMeta.total === 0}>
                        {exportingOrders ? 'Exporting…' : 'Export CSV'}
                    </Btn>
                </div>
                <TableCard
                    footer={<Pager page={ordersMeta.page} totalPages={ordersMeta.totalPages} total={ordersMeta.total} pageSize={PAGE_SIZE} count={orders.length} onPage={setOrdersPage} noun="orders" />}
                >
                    <table className={cx('w-full min-w-[860px] transition-opacity', ordersFetching && !ordersLoading && 'opacity-60')}>
                        <thead>
                            <tr>
                                <th className={TH}>Order</th>
                                <th className={TH}>Customer</th>
                                <th className={cx(TH, 'text-right')}>Items</th>
                                <th className={cx(TH, 'text-right')}>Delivery</th>
                                <th className={cx(TH, 'text-right')}>Total</th>
                                <th className={TH}>Payment</th>
                                <th className={TH}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordersLoading ? <SkeletonRows rows={5} cols={7} /> : ordersError ? (
                                <EmptyRow colSpan={7}>
                                    The orders could not be loaded. <button type="button" onClick={() => refetchOrders()} className="font-medium text-[var(--color-primary)] hover:underline">Try again</button>
                                </EmptyRow>
                            ) : orders.length === 0 ? (
                                <EmptyRow colSpan={7}>
                                    {statusFilter ? `No ${BUCKET_LABEL[statusFilter].toLowerCase()} orders` : 'No orders'} {days === 1 ? 'on' : 'in'} {periodText}.
                                </EmptyRow>
                            ) : orders.map((o) => (
                                <tr key={o._id} className={TR}>
                                    <td className={TD}>
                                        <Link href={`/dashboard/admin/orders/${o._id}`} className="font-semibold text-gray-900 hover:text-[var(--color-primary)]">{o.orderId}</Link>
                                        <p className="mt-0.5 text-xs text-gray-400">{fmtDateTime(o.createdAt)}</p>
                                    </td>
                                    <td className={TD}>
                                        <p className="font-medium text-gray-900">{o.customer}</p>
                                        {o.phone && <p className="mt-0.5 text-xs text-gray-400">{o.phone}</p>}
                                    </td>
                                    <td className={cx(TD, 'text-right')}>{num(o.items)}</td>
                                    <td className={cx(TD, 'text-right')}>{o.shippingCost ? taka(o.shippingCost) : <span className="text-gray-400">Free</span>}</td>
                                    <td className={cx(TD, 'text-right font-medium text-gray-900')}>{taka(o.total)}</td>
                                    <td className={TD}>
                                        <div className="flex flex-col items-start gap-1">
                                            <span className="text-xs text-gray-500">{o.paymentMethod ? paymentMethodLabel(o.paymentMethod) : '—'}</span>
                                            <Badge tone={PAYMENT[o.paymentStatus]?.tone || 'gray'}>{PAYMENT[o.paymentStatus]?.label || o.paymentStatus}</Badge>
                                        </div>
                                    </td>
                                    <td className={TD}><Badge tone={ORDER_TONE[o.status] || 'gray'}>{getStatusConfig(o.status).label}</Badge></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableCard>
            </section>
        </div>
    );
}
