"use client";

import React from 'react';
import { LuArrowDownLeft, LuArrowUpRight, LuInfo } from 'react-icons/lu';
import { Badge, cx } from '@/components/admin/ui';
import type { IAccountsOverview } from '@/redux/api/accountsApi';
import { money } from './format';

function Line({ label, value, hint }: { label: string; value: number; hint?: string }) {
    return (
        <li className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
            <span className="min-w-0 text-gray-600">
                {label}
                {hint && <span className="block text-xs text-gray-400">{hint}</span>}
            </span>
            <span className="shrink-0 font-medium tabular-nums text-gray-900">{money(value)}</span>
        </li>
    );
}

/**
 * Cash in against cash out, from what is recorded in these pages. For all time it is a
 * position ("what should be in hand"); for a period it is that period's net flow.
 */
export default function CashCard({ data }: { data: IAccountsOverview }) {
    const { cash, period } = data;
    const pos = cash.position;
    const max = Math.max(cash.moneyIn, cash.moneyOut, 1);
    const title = period.allTime ? 'Cash position' : 'Net cash flow';

    return (
        <section className="flex min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-gray-900">{title}</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                        {period.allTime ? 'What should be in hand, by what is recorded here.' : 'Money that came in, less money that went out, in this period.'}
                    </p>
                </div>
                <Badge tone="amber">Estimate</Badge>
            </div>

            <p className={cx('text-[28px] font-semibold leading-tight tracking-tight tabular-nums', pos > 0 ? 'text-emerald-700' : pos < 0 ? 'text-red-600' : 'text-gray-900')}>
                {money(pos)}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
                {pos < 0 ? 'More went out than came in.' : pos > 0 ? 'More came in than went out.' : 'In and out are level.'}
            </p>

            {/* In vs out on one scale */}
            <div className="mt-4 space-y-1.5" aria-hidden>
                {[
                    { label: 'In', value: cash.moneyIn, cls: 'bg-emerald-500' },
                    { label: 'Out', value: cash.moneyOut, cls: 'bg-red-400' },
                ].map((r) => (
                    <div key={r.label} className="flex items-center gap-3">
                        <span className="w-7 shrink-0 text-xs text-gray-500">{r.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                            <div className={cx('h-full rounded-full', r.cls)} style={{ width: `${r.value > 0 ? Math.max(2, (r.value / max) * 100) : 0}%` }} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                <div className="min-w-0">
                    <p className="flex items-center justify-between gap-2 border-b border-gray-100 pb-1.5 text-sm font-semibold text-gray-900">
                        <span className="inline-flex items-center gap-1.5"><LuArrowDownLeft size={15} className="text-emerald-600" /> Money in</span>
                        <span className="tabular-nums">{money(cash.moneyIn)}</span>
                    </p>
                    <ul>
                        <Line label="Capital from investors" value={cash.in.capital} />
                        <Line label="Courier payouts" value={cash.in.payouts} />
                        <Line label="Paid online" value={cash.in.online} hint="Delivered orders paid by bKash, card …" />
                    </ul>
                </div>
                <div className="min-w-0">
                    <p className="flex items-center justify-between gap-2 border-b border-gray-100 pb-1.5 text-sm font-semibold text-gray-900">
                        <span className="inline-flex items-center gap-1.5"><LuArrowUpRight size={15} className="text-red-500" /> Money out</span>
                        <span className="tabular-nums">{money(cash.moneyOut)}</span>
                    </p>
                    <ul>
                        <Line label="Expenses" value={cash.out.expenses} />
                        <Line label="Paid to suppliers" value={cash.out.suppliers} />
                        <Line label="Capital taken back out" value={cash.out.capitalOut} />
                    </ul>
                </div>
            </div>

            <p className="mt-auto flex gap-1.5 pt-4 text-xs text-gray-400">
                <LuInfo size={13} className="mt-px shrink-0" />
                <span>Not a bank balance. Cash collected by hand, refunds and anything not recorded on these pages are not in it.</span>
            </p>
        </section>
    );
}
