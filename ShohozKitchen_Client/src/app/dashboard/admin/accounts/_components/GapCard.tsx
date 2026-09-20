"use client";

import React from 'react';
import Link from 'next/link';
import { LuInfo, LuTriangleAlert } from 'react-icons/lu';
import { Badge, cx } from '@/components/admin/ui';
import type { IAccountsOverview } from '@/redux/api/accountsApi';
import { money, plural } from './format';

/**
 * Why sales and payouts differ: sales = payouts received + what the courier kept as
 * charges + orders paid online (never through the courier) + what is not settled yet.
 */
export default function GapCard({ data }: { data: IAccountsOverview }) {
    const { sales, payouts, gap } = data;
    const segs = [
        { key: 'payouts', label: 'Paid out by the courier', value: payouts.received, cls: 'bg-[var(--color-primary)]', href: '/dashboard/admin/courier-payouts' },
        { key: 'charges', label: 'Courier charges kept', value: gap.courierCharges, cls: 'bg-gray-400', hint: 'Delivery bills and COD fees' },
        { key: 'online', label: 'Paid online', value: gap.paidOnline, cls: 'bg-indigo-500', hint: `${plural(sales.paidOnlineOrders, 'order')} paid by bKash, card …` },
        { key: 'rest', label: 'Not settled yet', value: gap.rest, cls: 'bg-amber-400', hint: 'COD the courier still holds or has not paid out' },
    ];
    const positive = segs.filter((s) => s.value > 0);
    const base = Math.max(sales.total, positive.reduce((s, x) => s + x.value, 0), 1);

    return (
        <section className="flex min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-gray-900">Sales vs payouts</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Where the gap between delivered sales and the cash Steadfast sent you comes from.</p>
                </div>
                <Badge tone="amber">Estimate</Badge>
            </div>

            {sales.orders === 0 && payouts.count === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No delivered orders or payouts in this period.</p>
            ) : (
                <>
                    <p className="text-[28px] font-semibold leading-tight tracking-tight text-gray-900 tabular-nums">{money(gap.total)}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                        {gap.total >= 0 ? 'of sales not paid out by the courier' : 'more paid out than delivered in this period'}
                        {' '}({money(sales.total)} sales − {money(payouts.received)} payouts)
                    </p>

                    {/* One bar = all delivered sales, split into where the money is. */}
                    <div className="mt-4 flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-gray-100" role="img" aria-label="Sales split into payouts, courier charges, online payments and unsettled">
                        {positive.map((s) => (
                            <div key={s.key} className={cx('h-full first:rounded-l-full last:rounded-r-full', s.cls)} style={{ width: `${Math.max(1, (s.value / base) * 100)}%` }} title={`${s.label}: ${money(s.value)}`} />
                        ))}
                    </div>

                    <ul className="mt-4 space-y-2">
                        {segs.map((s) => (
                            <li key={s.key} className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="flex min-w-0 items-baseline gap-2">
                                    <span className={cx('h-2.5 w-2.5 shrink-0 translate-y-[1px] rounded-sm', s.cls)} aria-hidden />
                                    <span className="min-w-0">
                                        {s.href ? <Link href={s.href} className="text-gray-700 hover:text-[var(--color-primary)] hover:underline">{s.label}</Link> : <span className="text-gray-700">{s.label}</span>}
                                        {s.hint && <span className="block text-xs text-gray-400">{s.hint}</span>}
                                    </span>
                                </span>
                                <span className={cx('shrink-0 font-medium tabular-nums', s.value < 0 ? 'text-gray-400' : 'text-gray-900')}>{money(s.value)}</span>
                            </li>
                        ))}
                    </ul>

                    {gap.rest < 0 && (
                        <p className="mt-3 flex gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
                            <LuTriangleAlert size={14} className="mt-px shrink-0" />
                            <span>The payouts here include cash for orders delivered before this period, so they add up to more than its sales.</span>
                        </p>
                    )}
                    {payouts.withoutBreakdown > 0 && (
                        <p className="mt-3 flex gap-1.5 text-xs text-gray-400">
                            <LuInfo size={13} className="mt-px shrink-0" />
                            <span>{plural(payouts.withoutBreakdown, 'payout')} recorded without a COD breakdown, so their charges are counted under &quot;not settled yet&quot;.</span>
                        </p>
                    )}
                </>
            )}
        </section>
    );
}
