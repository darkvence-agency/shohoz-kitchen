/* eslint-disable @next/next/no-img-element */
"use client";

/* The cards that make up the admin home page (AdminDashboard.tsx composes them). */

import React from 'react';
import Link from 'next/link';
import {
    LuTriangleAlert, LuChevronRight, LuClock, LuTruck, LuPackageX, LuPackageMinus, LuStar, LuUndo2,
    LuPackage, LuTrendingUp, LuTrendingDown, LuArrowRight,
} from 'react-icons/lu';
import {
    Card, Badge, TableCard, TH, TD, TR, EmptyRow, SkeletonRows, taka, fmtDateTime, cx, type Tone,
} from '@/components/admin/ui';
import { getStatusConfig, paymentMethodLabel } from '@/lib/orderStatus';
import type { DashboardSummary } from '@/redux/api/dashboardApi';
import { BarChart, BarChartSkeleton } from './BarChart';
import { compact, compactTaka, count, pctChange } from './format';

export const ORDER_TONE: Record<string, Tone> = {
    pending: 'amber', confirmed: 'blue', processing: 'purple', shipped: 'indigo', on_the_way: 'sky',
    out_for_delivery: 'teal', delivery_attempt: 'orange', delivered: 'green', cancelled: 'red',
    returned: 'gray', refunded: 'rose',
};

const PAYMENT: Record<string, { label: string; tone: Tone }> = {
    pending: { label: 'Unpaid', tone: 'amber' },
    paid: { label: 'Paid', tone: 'green' },
    failed: { label: 'Failed', tone: 'red' },
    refunded: { label: 'Refunded', tone: 'purple' },
};

const COURIER_LABEL: Record<string, string> = {
    hold: 'on hold',
    cancelled: 'cancelled',
    cancelled_approval_pending: 'cancel in review',
    unknown: 'unknown',
    unknown_approval_pending: 'unknown, in review',
    partial_delivered: 'partly delivered',
    partial_delivered_approval_pending: 'partial, in review',
};

// A <span> so it is valid inside <p> and <a> (a <div> there breaks hydration).
const Skel = ({ className }: { className: string }) => <span className={cx('block animate-pulse rounded bg-gray-100', className)} />;

const cardTitle = (icon: React.ReactNode, text: string) => (
    <span className="inline-flex items-center gap-2">{icon}{text}</span>
);

/* ─── Charts ─────────────────────────────────────────────── */

/** "▲ 12% vs previous 30 days" — semantic colour plus an arrow, never colour alone. */
function Delta({ current, previous }: { current: number; previous: number }) {
    const p = pctChange(current, previous);
    if (p == null) return null;
    const up = p >= 0;
    const Icon = up ? LuTrendingUp : LuTrendingDown;
    return (
        <span className={cx('inline-flex items-center gap-1 text-xs font-medium', up ? 'text-emerald-600' : 'text-red-600')}>
            <Icon size={13} aria-hidden />
            {up ? '+' : '−'}{Math.abs(p) >= 100 ? Math.round(Math.abs(p)) : Math.abs(p).toFixed(1).replace(/\.0$/, '')}%
            <span className="font-normal text-gray-400">vs previous 30 days</span>
        </span>
    );
}

export function TrendCharts({ data, loading }: { data?: DashboardSummary; loading: boolean }) {
    const series = data?.series || [];
    const totals = data?.seriesTotals;
    const prev = data?.previousTotals;

    const header = (title: string, value: React.ReactNode, delta: React.ReactNode) => (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
            <div className="text-right">
                <p className="text-sm tabular-nums text-gray-500">{value}</p>
                {delta}
            </div>
        </div>
    );

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-gray-200 bg-white p-5">
                {header(
                    'Revenue · last 30 days',
                    loading ? <Skel className="ml-auto h-4 w-24" /> : taka(totals?.revenue),
                    !loading && totals && prev ? <Delta current={totals.revenue} previous={prev.revenue} /> : null,
                )}
                {loading ? <BarChartSkeleton /> : (
                    <BarChart
                        label="Revenue per day, last 30 days"
                        data={series.map((d) => ({ key: d.date, value: d.revenue }))}
                        format={(n) => taka(n)}
                        axisFormat={compactTaka}
                        todayKey={data?.today}
                        emptyText="No revenue in the last 30 days"
                        detail={(i) => (
                            <p className="text-xs text-gray-500">{count(series[i]?.orders)} order{series[i]?.orders === 1 ? '' : 's'}</p>
                        )}
                    />
                )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5">
                {header(
                    'Orders · last 30 days',
                    loading ? <Skel className="ml-auto h-4 w-20" /> : `${count(totals?.orders)} orders`,
                    !loading && totals && prev ? <Delta current={totals.orders} previous={prev.orders} /> : null,
                )}
                {loading ? <BarChartSkeleton /> : (
                    <BarChart
                        label="Orders per day, last 30 days"
                        data={series.map((d) => ({ key: d.date, value: d.orders }))}
                        format={(n) => `${count(n)} order${n === 1 ? '' : 's'}`}
                        axisFormat={compact}
                        todayKey={data?.today}
                        emptyText="No orders in the last 30 days"
                        detail={(i) => (series[i]?.cancelled ? (
                            <p className="text-xs text-gray-500">{count(series[i].cancelled)} cancelled</p>
                        ) : null)}
                    />
                )}
            </section>
        </div>
    );
}

/* ─── Needs attention ────────────────────────────────────── */

function AttentionRow({ href, icon, label, value, tone, hint, loading }: {
    href: string; icon: React.ReactNode; label: string; value: number;
    tone: 'red' | 'amber'; hint?: string; loading: boolean;
}) {
    const hot = value > 0;
    return (
        <Link href={href} className="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition hover:bg-gray-50">
            <span className="flex min-w-0 items-start gap-2.5">
                <span className="mt-0.5 shrink-0 text-gray-400" aria-hidden>{icon}</span>
                <span className="min-w-0">
                    <span className="block text-sm text-gray-600 group-hover:text-gray-900">{label}</span>
                    {hint && hot && !loading && <span className="block truncate text-xs text-gray-400">{hint}</span>}
                </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
                {loading ? <Skel className="h-4 w-6" /> : (
                    <span className={cx(
                        'text-sm font-semibold tabular-nums',
                        !hot ? 'text-gray-900' : tone === 'red' ? 'text-red-600' : 'text-amber-600',
                    )}>
                        {count(value)}
                    </span>
                )}
                <LuChevronRight size={14} className="text-gray-300 transition group-hover:text-gray-500" aria-hidden />
            </span>
        </Link>
    );
}

export function NeedsAttentionCard({ data, loading }: { data?: DashboardSummary; loading: boolean }) {
    const na = data?.needsAttention;
    const limit = na?.lowStockLimit ?? 5;
    const courierHint = (na?.courierFlaggedByStatus || [])
        .map((r) => `${count(r.count)} ${COURIER_LABEL[r.status] || r.status.replace(/_/g, ' ')}`)
        .join(' · ');
    const lowest = data?.lowestStock || [];

    return (
        <Card title={cardTitle(<LuTriangleAlert size={16} className="text-gray-500" aria-hidden />, 'Needs attention')}>
            <div className="-my-1">
                <AttentionRow loading={loading} href="/dashboard/admin/orders?status=pending" icon={<LuClock size={16} />}
                    label="Orders awaiting confirmation" value={na?.pendingOrders || 0} tone="amber" />
                <AttentionRow loading={loading} href="/dashboard/admin/courier" icon={<LuTruck size={16} />}
                    label="Flagged by the courier" value={na?.courierFlagged || 0} tone="red" hint={courierHint} />
                <AttentionRow loading={loading} href="/dashboard/admin/inventory?stock=out" icon={<LuPackageX size={16} />}
                    label="Out of stock" value={na?.outOfStock || 0} tone="red" />
                <AttentionRow loading={loading} href="/dashboard/admin/inventory?stock=low" icon={<LuPackageMinus size={16} />}
                    label="Low stock" value={na?.lowStock || 0} tone="amber"
                    hint={`At or below each product's low-stock level (${limit} if not set)`} />
                <AttentionRow loading={loading} href="/dashboard/admin/reviews?status=pending" icon={<LuStar size={16} />}
                    label="Reviews awaiting moderation" value={na?.pendingReviews || 0} tone="amber" />
                <AttentionRow loading={loading} href="/dashboard/admin/returns?status=pending" icon={<LuUndo2 size={16} />}
                    label="Return requests to review" value={na?.pendingReturns || 0} tone="amber" />
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="mb-2 text-xs font-medium text-gray-500">Lowest stock</p>
                {loading ? (
                    <div className="space-y-2.5">
                        {[0, 1, 2].map((i) => <Skel key={i} className="h-4 w-full" />)}
                    </div>
                ) : lowest.length === 0 ? (
                    <p className="text-sm text-gray-400">No active products yet.</p>
                ) : (
                    <ul className="space-y-1">
                        {lowest.map((p) => (
                            <li key={p._id}>
                                <Link href={`/dashboard/admin/products/new?id=${p._id}`} className="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-1 transition hover:bg-gray-50">
                                    <span className="min-w-0 truncate text-sm text-gray-800 group-hover:text-gray-900">
                                        {p.name}
                                        {p.sku && <span className="ml-1.5 text-xs text-gray-400">{p.sku}</span>}
                                    </span>
                                    <span className={cx(
                                        'shrink-0 text-sm tabular-nums',
                                        p.stock <= 0 ? 'font-semibold text-red-600' : p.stock < limit ? 'font-semibold text-amber-600' : 'text-gray-900',
                                    )}>
                                        {count(p.stock)}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </Card>
    );
}

/* ─── Today's orders by status ───────────────────────────── */

export function TodayByStatusCard({ data, loading }: { data?: DashboardSummary; loading: boolean }) {
    const rows = data?.todayByStatus || [];
    const orders = data?.ordersToday || 0;
    // Revenue excludes cancelled orders, so the average does too.
    const cancelled = rows.find((r) => r.status === 'cancelled')?.count || 0;
    const counted = orders - cancelled;
    const avg = counted > 0 ? (data?.revenueToday || 0) / counted : 0;

    return (
        <Card
            title="Today's orders by status"
            actions={!loading && orders > 0 ? <span className="text-sm tabular-nums text-gray-500">{count(orders)} total</span> : undefined}
        >
            {loading ? (
                <div className="flex flex-wrap gap-2">{[0, 1, 2].map((i) => <Skel key={i} className="h-6 w-24 rounded-md" />)}</div>
            ) : rows.length === 0 ? (
                <p className="text-sm text-gray-400">No orders yet today.</p>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2">
                        {rows.map((r) => (
                            <Link key={r.status} href={`/dashboard/admin/orders?status=${r.status}`} className="rounded-md transition hover:brightness-95">
                                <Badge tone={ORDER_TONE[r.status] || 'gray'}>
                                    {getStatusConfig(r.status).label}
                                    <span className="ml-1.5 font-semibold tabular-nums">{count(r.count)}</span>
                                </Badge>
                            </Link>
                        ))}
                    </div>
                    <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-gray-100 pt-4">
                        <div>
                            <dt className="text-xs text-gray-500">Revenue</dt>
                            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{taka(data?.revenueToday)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-500">Delivery charged</dt>
                            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{taka(data?.deliveryToday)}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-gray-500">Avg. order</dt>
                            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">{taka(avg)}</dd>
                        </div>
                    </dl>
                </>
            )}
        </Card>
    );
}

/* ─── Latest orders ──────────────────────────────────────── */

export function LatestOrdersCard({ data, loading }: { data?: DashboardSummary; loading: boolean }) {
    const rows = data?.latestOrders || [];
    return (
        <Card
            title="Latest orders"
            actions={
                <Link href="/dashboard/admin/orders" className="inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-[var(--color-primary)]">
                    View all <LuArrowRight size={14} aria-hidden />
                </Link>
            }
        >
            <TableCard>
                <table className="w-full min-w-[720px]">
                    <thead className="bg-gray-50/60">
                        <tr>
                            <th className={TH}>Reference</th>
                            <th className={TH}>Customer</th>
                            <th className={TH}>Status</th>
                            <th className={TH}>Payment</th>
                            <th className={cx(TH, 'text-right')}>Total</th>
                            <th className={TH}>Placed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? <SkeletonRows rows={5} cols={6} /> : rows.length === 0 ? (
                            <EmptyRow colSpan={6}>No orders yet.</EmptyRow>
                        ) : rows.map((o) => {
                            const pay = PAYMENT[o.paymentStatus] || { label: o.paymentStatus || '—', tone: 'gray' as Tone };
                            return (
                                <tr key={o._id} className={TR}>
                                    <td className={TD}>
                                        <Link href={`/dashboard/admin/orders/${o._id}`} className="font-semibold text-gray-900 hover:text-[var(--color-primary)]">
                                            {o.orderId || o._id.slice(-6)}
                                        </Link>
                                        <span className="block text-xs text-gray-400">{count(o.itemCount)} item{o.itemCount === 1 ? '' : 's'}</span>
                                    </td>
                                    <td className={TD}>
                                        <span className="block max-w-[220px] truncate text-gray-800">{o.customer}</span>
                                        {o.phone && <span className="block text-xs text-gray-400">{o.phone}</span>}
                                    </td>
                                    <td className={TD}>
                                        <Badge tone={ORDER_TONE[o.status] || 'gray'}>{getStatusConfig(o.status).label}</Badge>
                                    </td>
                                    <td className={TD}>
                                        <Badge tone={pay.tone}>{pay.label}</Badge>
                                        {o.paymentMethod && <span className="mt-0.5 block text-xs text-gray-400">{paymentMethodLabel(o.paymentMethod)}</span>}
                                    </td>
                                    <td className={cx(TD, 'text-right font-medium tabular-nums text-gray-900')}>{taka(o.total)}</td>
                                    <td className={cx(TD, 'whitespace-nowrap text-gray-500')}>{fmtDateTime(o.createdAt)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TableCard>
        </Card>
    );
}

/* ─── Extras: top products & sales by category ───────────── */

export function TopProductsCard({ data, loading }: { data?: DashboardSummary; loading: boolean }) {
    const rows = data?.topProducts || [];
    return (
        <Card
            title="Top products"
            description="Last 30 days, by revenue"
            actions={
                <Link href="/dashboard/admin/products" className="inline-flex items-center gap-1 text-sm text-gray-500 transition hover:text-[var(--color-primary)]">
                    All products <LuArrowRight size={14} aria-hidden />
                </Link>
            }
        >
            {loading ? (
                <div className="space-y-3">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                            <Skel className="h-10 w-10 rounded-lg" />
                            <div className="flex-1 space-y-1.5"><Skel className="h-3.5 w-2/3" /><Skel className="h-3 w-1/3" /></div>
                            <Skel className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No sales in the last 30 days.</p>
            ) : (
                <ol className="space-y-1">
                    {rows.map((p, i) => (
                        <li key={p.productId}>
                            <Link href={`/dashboard/admin/products/new?id=${p.productId}`} className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-gray-50">
                                <span className="w-4 shrink-0 text-center text-xs font-medium tabular-nums text-gray-400">{i + 1}</span>
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                                    {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-full w-full object-cover" /> : <LuPackage className="text-gray-300" aria-hidden />}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-gray-900 group-hover:text-[var(--color-primary)]">{p.name}</span>
                                    <span className="block text-xs text-gray-500">
                                        {count(p.units)} sold
                                        {p.stock != null && (
                                            <> · <span className={p.stock <= 0 ? 'text-red-600' : p.stock < 5 ? 'text-amber-600' : ''}>
                                                {p.stock <= 0 ? 'out of stock' : `${count(p.stock)} in stock`}
                                            </span></>
                                        )}
                                    </span>
                                </span>
                                <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{taka(p.revenue)}</span>
                            </Link>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}

export function SalesByCategoryCard({ data, loading }: { data?: DashboardSummary; loading: boolean }) {
    const rows = data?.salesByCategory || [];
    const total = rows.reduce((s, r) => s + r.revenue, 0);
    const top = Math.max(1, ...rows.map((r) => r.revenue));
    return (
        <Card
            title="Sales by category"
            description="Last 30 days, item revenue"
            actions={!loading && total > 0 ? <span className="text-sm tabular-nums text-gray-500">{taka(total)}</span> : undefined}
        >
            {loading ? (
                <div className="space-y-4">
                    {[0, 1, 2, 3, 4].map((i) => <div key={i} className="space-y-1.5"><Skel className="h-3.5 w-1/2" /><Skel className="h-2 w-full rounded-full" /></div>)}
                </div>
            ) : rows.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-400">No sales in the last 30 days.</p>
            ) : (
                <ul className="space-y-3.5">
                    {rows.map((r) => {
                        const share = total > 0 ? (r.revenue / total) * 100 : 0;
                        return (
                            <li key={`${r.categoryId ?? 'none'}-${r.name}`}>
                                <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                                    <span className="min-w-0 truncate text-gray-800">{r.name}</span>
                                    <span className="shrink-0 tabular-nums text-gray-900">
                                        <span className="font-semibold">{taka(r.revenue)}</span>
                                        <span className="ml-2 text-xs text-gray-400">{share < 1 && share > 0 ? '<1' : Math.round(share)}%</span>
                                    </span>
                                </div>
                                <div
                                    className="h-2 overflow-hidden rounded-full bg-gray-100"
                                    role="img"
                                    aria-label={`${r.name}: ${taka(r.revenue)}, ${Math.round(share)}% of sales, ${r.units} items`}
                                    title={`${count(r.units)} items sold`}
                                >
                                    <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.max(1, (r.revenue / top) * 100)}%` }} />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </Card>
    );
}
