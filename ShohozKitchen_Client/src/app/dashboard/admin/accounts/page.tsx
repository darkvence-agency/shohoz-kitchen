"use client";

import React, { useMemo, useState } from 'react';
import {
    LuHandCoins, LuShoppingBag, LuTruck, LuWallet, LuBoxes, LuClipboardList, LuRefreshCw, LuTriangleAlert, LuInfo,
} from 'react-icons/lu';
import { PageHeader, Btn, SelectPill, FilterBar, cx } from '@/components/admin/ui';
import { useGetAccountsOverviewQuery, type IAccountsOverview } from '@/redux/api/accountsApi';
import {
    dhakaToday, fmtRange, presetRange, errMsg, monthKeysBetween, DATE_PILL, type PeriodKey,
} from '../expenses/_components/shared';
import OverviewTile, { TileSkeleton } from './_components/OverviewTile';
import CashCard from './_components/CashCard';
import GapCard from './_components/GapCard';
import MonthlyChart from './_components/MonthlyChart';
import { money, count, plural, fmtDhakaDate, fmtDhakaTime } from './_components/format';

/**
 * Accounts: the money side of the business at a glance, since the beginning or for a
 * period. Admin only and read-only; every tile opens the page that owns its figure.
 */

const PERIODS: { value: PeriodKey; label: string }[] = [
    { value: 'all', label: 'All time' },
    { value: 'this_month', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
    { value: 'this_year', label: 'This year' },
    { value: 'custom', label: 'Custom range' },
];

function Tiles({ d }: { d: IAccountsOverview }) {
    const { investment, sales, payouts, expenses, stock, purchases, period } = d;

    let stockDetail: React.ReactNode = period.allTime ? 'As of today' : 'As of today: the period does not change it';
    let stockTone: 'amber' | undefined;
    if (stock.units <= 0) {
        stockDetail = 'No stock on hand';
    } else if (stock.value <= 0) {
        stockDetail = 'No purchase costs recorded yet, so stock counts as ৳0. Add stock with a unit cost to value it.';
        stockTone = 'amber';
    } else if (stock.uncosted > 0) {
        stockDetail = `${plural(stock.uncosted, 'product')} in stock ${stock.uncosted === 1 ? 'has' : 'have'} no cost yet and ${stock.uncosted === 1 ? 'is' : 'are'} left out.`;
        stockTone = 'amber';
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <OverviewTile
                href="/dashboard/admin/investors"
                label="Total investment"
                icon={<LuHandCoins size={15} />}
                value={money(investment.capital)}
                hint="Capital in, less taken back out"
                detail={investment.investors === 0 && investment.moneyIn === 0
                    ? 'No investors recorded yet'
                    : `${money(investment.moneyIn)} in · ${money(investment.moneyOut)} out · ${plural(investment.investors, 'investor')}`}
            />
            <OverviewTile
                href="/dashboard/admin/analytics"
                label="Total sales"
                icon={<LuShoppingBag size={15} />}
                value={money(sales.total)}
                hint={`${plural(sales.orders, 'delivered order')}, settled or not`}
                detail={sales.orders === 0
                    ? 'No orders delivered'
                    : `Includes ${money(sales.deliveryCharges)} delivery charges${sales.paidOnline > 0 ? ` · ${money(sales.paidOnline)} paid online` : ''}`}
            />
            <OverviewTile
                href="/dashboard/admin/courier-payouts"
                label="Total payouts"
                icon={<LuTruck size={15} />}
                value={money(payouts.received)}
                hint="Received from Steadfast"
                detail={payouts.count === 0
                    ? 'No payouts recorded'
                    : `${plural(payouts.count, 'payout')} · last on ${fmtDhakaDate(payouts.lastReceivedAt)}`}
            />
            <OverviewTile
                href="/dashboard/admin/expenses"
                label="Total expenses"
                icon={<LuWallet size={15} />}
                value={money(expenses.total)}
                hint="What you recorded. Courier charges come off the payouts"
                detail={expenses.count === 0 ? 'No expenses recorded' : plural(expenses.count, 'entry', 'entries')}
            />
            <OverviewTile
                href="/dashboard/admin/inventory"
                label="Stock value"
                icon={<LuBoxes size={15} />}
                value={money(stock.value)}
                hint={`${count(stock.units)} units at average purchase cost`}
                detail={stockDetail}
                tone={stockTone}
            />
            <OverviewTile
                href="/dashboard/admin/purchases"
                label="Purchases"
                icon={<LuClipboardList size={15} />}
                value={money(purchases.total)}
                hint={`${plural(purchases.count, 'purchase order')} placed`}
                detail={purchases.count === 0
                    ? (purchases.paymentsMade > 0 ? `${money(purchases.paymentsMade)} paid to suppliers` : 'No purchase orders placed')
                    : <>{money(purchases.paid)} paid · <span className={purchases.due > 0 ? 'text-amber-700' : undefined}>{money(purchases.due)} due</span></>}
            />
        </div>
    );
}

function Skeleton() {
    return (
        <div aria-busy="true" aria-label="Loading accounts">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <TileSkeleton key={i} />)}
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="h-[340px] animate-pulse rounded-2xl bg-gray-100" />
                <div className="h-[340px] animate-pulse rounded-2xl bg-gray-100" />
            </div>
            <div className="mt-3 h-[360px] animate-pulse rounded-2xl bg-gray-100" />
        </div>
    );
}

export default function AccountsPage() {
    const [today] = useState(dhakaToday);
    const [period, setPeriod] = useState<PeriodKey>('all');
    const [custom, setCustom] = useState<{ from: string; to: string }>(() => {
        const r = presetRange('this_month', today);
        return { from: r.from || today, to: r.to || today };
    });

    const range = period === 'custom'
        ? { from: custom.from || undefined, to: custom.to || undefined }
        : presetRange(period, today);
    const badRange = !!(range.from && range.to && range.from > range.to);
    const futureStart = !!(range.from && range.from > today);
    const invalid = badRange || futureStart;

    const q = useGetAccountsOverviewQuery(range, { skip: invalid });
    // While a new period loads, keep the last figures on screen (dimmed) instead of a skeleton.
    const data = q.currentData ?? (q.isFetching ? q.data : undefined);
    const stale = !q.currentData && !!data;
    const loading = !data && q.isFetching;
    const failed = !q.currentData && !q.isFetching && q.isError;

    const allTime = !range.from && !range.to;
    const label = fmtRange(range.from, range.to);

    const inPeriod = useMemo(
        () => (range.from || range.to ? new Set(monthKeysBetween(range.from || '2000-01-01', range.to && range.to < today ? range.to : today)) : null),
        [range.from, range.to, today],
    );

    const choosePeriod = (p: PeriodKey) => {
        // Custom starts from what was on screen, so it is a tweak rather than a blank.
        if (p === 'custom' && period !== 'custom') {
            const r = presetRange(period, today);
            if (r.from && r.to) setCustom({ from: r.from, to: r.to });
        }
        setPeriod(p);
    };

    return (
        <div>
            <PageHeader
                title="Accounts"
                subtitle={allTime
                    ? 'The whole section at a glance, since the beginning. Each tile opens its own page.'
                    : <>The section at a glance for <span className="font-medium text-gray-700">{label}</span>. Each tile opens its own page.</>}
                actions={
                    <Btn
                        icon={<LuRefreshCw size={15} className={cx(q.isFetching && 'animate-spin')} />}
                        onClick={() => { q.refetch(); }}
                        disabled={invalid || q.isFetching}
                    >
                        Refresh
                    </Btn>
                }
            />

            <FilterBar>
                <SelectPill ariaLabel="Period" value={period} onChange={(v) => choosePeriod(v as PeriodKey)} options={PERIODS} className="sm:w-44" />
                {period === 'custom' && (
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            aria-label="From"
                            className={DATE_PILL}
                            value={custom.from}
                            max={custom.to && custom.to < today ? custom.to : today}
                            onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                        />
                        <span className="text-sm text-gray-400">to</span>
                        <input
                            type="date"
                            aria-label="To"
                            className={DATE_PILL}
                            value={custom.to}
                            min={custom.from || undefined}
                            max={today}
                            onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                        />
                    </div>
                )}
                {data && (
                    <p className="text-xs text-gray-400 sm:ml-auto">
                        {stale ? 'Updating…' : `Updated ${fmtDhakaTime(data.generatedAt)} · Bangladesh time`}
                    </p>
                )}
            </FilterBar>

            {invalid ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-6 text-center text-sm text-amber-800">
                    <LuTriangleAlert size={24} className="mx-auto mb-2 text-amber-500" />
                    {badRange ? 'The start date is after the end date. Pick a start on or before the end.' : 'The period cannot start in the future.'}
                </div>
            ) : failed ? (
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-14 text-center text-sm text-gray-500">
                    <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
                    <p className="font-medium text-gray-800">Couldn&apos;t load the accounts.</p>
                    <p className="mt-1">{errMsg(q.error, 'Check your connection and try again.')}</p>
                    <div className="mt-4"><Btn onClick={() => { q.refetch(); }} icon={<LuRefreshCw size={15} />}>Retry</Btn></div>
                </div>
            ) : loading || !data ? (
                <Skeleton />
            ) : (
                <div className={cx('transition-opacity', stale && 'pointer-events-none opacity-60')}>
                    {data.empty && (
                        <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
                            <span className="flex items-start gap-2">
                                <LuInfo size={16} className="mt-0.5 shrink-0 text-gray-400" />
                                {data.period.allTime
                                    ? 'Nothing is recorded yet. Investments, delivered orders, payouts, expenses and purchases add up here as you record them.'
                                    : `No money moved in ${label}: no delivered orders, payouts, expenses, purchases or capital.`}
                            </span>
                            {!data.period.allTime && <Btn onClick={() => choosePeriod('all')} className="self-start sm:self-auto">Show all time</Btn>}
                        </div>
                    )}

                    <Tiles d={data} />

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <CashCard data={data} />
                        <GapCard data={data} />
                    </div>

                    <div className="mt-3">
                        <MonthlyChart months={data.monthly} inPeriod={inPeriod} />
                    </div>

                    <p className="mt-5 text-xs leading-relaxed text-gray-500">
                        Total sales counts delivered orders at their invoiced totals (items less discount, plus the delivery charge),
                        whether or not the cash has reached you yet, dated by the day they were delivered. Payouts are the cash Steadfast
                        actually sent, dated by the day it arrived; the gap between the two is broken down under Sales vs payouts.
                        Expenses are what you recorded; courier charges are not among them, because Steadfast deducts those before paying out.
                        Purchases count placed orders (not drafts or cancelled ones) by order date, and money paid to suppliers is dated by
                        each payment. Stock value is today&apos;s stock at average purchase cost: unsold inventory you still hold as an asset,
                        not a loss, and the period does not change it. The cash figures are estimates from what is recorded on these pages.
                    </p>
                </div>
            )}
        </div>
    );
}
