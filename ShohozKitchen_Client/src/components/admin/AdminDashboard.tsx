"use client";

/**
 * Admin home (/dashboard/admin). Layout follows the client's design: welcome line,
 * four tiles, revenue + orders charts for the last 30 days, "Needs attention",
 * today's orders by status and the latest orders — then our own extras (top
 * products and sales by category). Everything comes from GET /dashboard/summary.
 */

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { LuWallet, LuShoppingCart, LuWarehouse, LuUsers, LuRefreshCw, LuPlus, LuPackagePlus, LuTriangleAlert } from 'react-icons/lu';
import type { RootState } from '@/redux/store';
import { useGetAdminDashboardQuery } from '@/redux/api/dashboardApi';
import { PageHeader, Btn, StatTile, Card, taka, cx } from '@/components/admin/ui';
import {
    TrendCharts, NeedsAttentionCard, TodayByStatusCard, LatestOrdersCard, TopProductsCard, SalesByCategoryCard,
} from './dashboard/sections';
import { count } from './dashboard/format';

const Skel = ({ className }: { className: string }) => <span className={cx('block animate-pulse rounded bg-gray-100', className)} />;

function Tile({ href, loading, value, hint, ...rest }: {
    href: string; label: string; icon: React.ReactNode; loading: boolean; value: React.ReactNode; hint?: React.ReactNode;
}) {
    return (
        <Link href={href} className="block rounded-2xl transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--color-primary-rgb),0.25)]">
            <StatTile
                {...rest}
                value={loading ? <Skel className="my-1 h-6 w-28" /> : value}
                hint={loading ? <Skel className="mt-1.5 h-3 w-20" /> : hint}
            />
        </Link>
    );
}

export default function AdminDashboard() {
    const user = useSelector((s: RootState) => s.auth.user);
    const { data, isLoading, isFetching, isError, refetch } = useGetAdminDashboardQuery(undefined, {
        pollingInterval: 60_000,
        refetchOnMountOrArgChange: 30,
    });
    const loading = isLoading || (!data && isFetching);
    const name = user?.name?.trim();

    const updated = data?.generatedAt
        ? new Date(data.generatedAt).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
        : null;

    return (
        <div className="space-y-4">
            <PageHeader
                title={name ? `Welcome back, ${name}` : 'Welcome back'}
                subtitle={<>Here&apos;s an overview of Shohoz Kitchen.{updated && <span className="text-gray-400"> Updated {updated}.</span>}</>}
                actions={
                    <>
                        <Btn
                            onClick={() => refetch()}
                            disabled={isFetching}
                            icon={<LuRefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />}
                            aria-label="Refresh dashboard"
                        >
                            Refresh
                        </Btn>
                        <Btn href="/dashboard/admin/products/new" icon={<LuPackagePlus size={15} />}>Add product</Btn>
                        <Btn variant="primary" href="/dashboard/admin/orders/new" icon={<LuPlus size={15} />}>New order</Btn>
                    </>
                }
            />

            {isError && !data && (
                <Card>
                    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="flex items-center gap-2 text-sm text-red-600">
                            <LuTriangleAlert size={16} aria-hidden /> The dashboard couldn&apos;t be loaded.
                        </p>
                        <Btn onClick={() => refetch()} icon={<LuRefreshCw size={15} />}>Try again</Btn>
                    </div>
                </Card>
            )}

            {/* ── Tiles ── */}
            <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 lg:grid-cols-4">
                <Tile
                    href="/dashboard/admin/orders"
                    label="Revenue today"
                    icon={<LuWallet size={16} />}
                    loading={loading}
                    value={taka(data?.revenueToday)}
                    hint={`${taka(data?.deliveryToday)} of it delivery`}
                />
                <Tile
                    href="/dashboard/admin/orders"
                    label="Orders today"
                    icon={<LuShoppingCart size={16} />}
                    loading={loading}
                    value={count(data?.ordersToday)}
                    hint={`${count(data?.pendingOrders)} pending overall`}
                />
                <Tile
                    href="/dashboard/admin/inventory"
                    label="Stock value"
                    icon={<LuWarehouse size={16} />}
                    loading={loading}
                    value={taka(data?.stockValue)}
                    hint={data?.stockUncosted
                        ? `At cost · ${count(data.stockUncosted)} in-stock product${data.stockUncosted === 1 ? ' has' : 's have'} no cost yet`
                        : `At cost · ${count(data?.skuCount)} SKU${data?.skuCount === 1 ? '' : 's'} · ${count(data?.stockUnits)} units`}
                />
                <Tile
                    href="/dashboard/admin/customers"
                    label="Customers"
                    icon={<LuUsers size={16} />}
                    loading={loading}
                    value={count(data?.customers)}
                    hint={data?.newCustomers30d ? `+${count(data.newCustomers30d)} in the last 30 days` : 'No new sign-ups in 30 days'}
                />
            </div>

            {/* ── Last 30 days ── */}
            <TrendCharts data={data} loading={loading} />

            {/* ── Needs attention · today ── */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <NeedsAttentionCard data={data} loading={loading} />
                <div className="space-y-4">
                    {/*
                      Procurement card goes here, at the top of this column, once Suppliers /
                      Purchases exist: "Owed to suppliers" (CNY) and "Owed on landing" (BDT)
                      tiles — settled separately, never summed — plus purchase status chips
                      (Confirmed · Partially received · Received · Cancelled). Needs a
                      procurement block in GET /dashboard/summary.
                    */}
                    <TodayByStatusCard data={data} loading={loading} />
                </div>
            </div>

            {/* ── Latest orders ── */}
            <LatestOrdersCard data={data} loading={loading} />

            {/* ── Our extras ── */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <TopProductsCard data={data} loading={loading} />
                <SalesByCategoryCard data={data} loading={loading} />
            </div>
        </div>
    );
}
