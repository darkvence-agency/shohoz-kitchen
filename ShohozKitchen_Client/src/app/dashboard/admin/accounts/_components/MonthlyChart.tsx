"use client";

import React, { useState } from 'react';
import { LuChartColumn } from 'react-icons/lu';
import { Segmented, TH, TD, cx } from '@/components/admin/ui';
import type { IAccountsMonth } from '@/redux/api/accountsApi';
import { fmtMonth } from '../../expenses/_components/shared';
import { compactTaka, count, money } from './format';

// Two series on one axis: sales (brand) against expenses (indigo). Checked with the
// dataviz palette validator: both pass lightness, chroma, CVD and contrast on white.
const SERIES = [
    { key: 'sales', label: 'Sales', cls: 'bg-[var(--color-primary)]' },
    { key: 'expenses', label: 'Expenses', cls: 'bg-indigo-500' },
] as const;

/** A round axis top at or above the largest bar (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × 10ⁿ), so half of it is round too. */
function niceMax(v: number) {
    if (v <= 0) return 1;
    const p = 10 ** Math.floor(Math.log10(v));
    for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
    return 10 * p;
}

function Readout({ m }: { m: IAccountsMonth }) {
    const rows = [
        { label: 'Sales', value: m.sales, key: 'bg-[var(--color-primary)]', sub: m.orders ? `${count(m.orders)} delivered` : undefined },
        { label: 'Expenses', value: m.expenses, key: 'bg-indigo-500' },
        { label: 'Courier payouts', value: m.payouts },
        { label: 'Paid to suppliers', value: m.purchasesPaid },
    ];
    return (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {rows.map((r) => (
                <div key={r.label} className="min-w-0">
                    <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                        {r.key ? <span className={cx('h-0.5 w-3 rounded-full', r.key)} aria-hidden /> : <span className="h-0.5 w-3 rounded-full bg-gray-200" aria-hidden />}
                        {r.label}
                    </dt>
                    <dd className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900">
                        {money(r.value)}
                        {r.sub && <span className="ml-1 text-xs font-normal text-gray-400">· {r.sub}</span>}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/**
 * The 12 months ending with the period's last month: sales against expenses as CSS
 * columns. Hover or tap a month for all four figures; the table view has every number.
 */
export default function MonthlyChart({ months, inPeriod }: {
    months: IAccountsMonth[];
    /** months that overlap the selected period (the rest are dimmed); null = all */
    inPeriod: Set<string> | null;
}) {
    const [view, setView] = useState<'chart' | 'table'>('chart');
    const [active, setActive] = useState<number | null>(null);

    const first = months[0]?.month;
    const last = months[months.length - 1]?.month;
    const top = niceMax(Math.max(0, ...months.map((m) => Math.max(m.sales, m.expenses))));
    const pct = (v: number) => (v > 0 ? `${Math.max(1.5, (v / top) * 100)}%` : '0%');
    const nothing = months.every((m) => !m.sales && !m.expenses && !m.payouts && !m.purchasesPaid);
    const shown = months[active ?? months.length - 1];
    const totals = months.reduce(
        (a, m) => ({ sales: a.sales + m.sales, orders: a.orders + m.orders, expenses: a.expenses + m.expenses, payouts: a.payouts + m.payouts, purchasesPaid: a.purchasesPaid + m.purchasesPaid }),
        { sales: 0, orders: 0, expenses: 0, payouts: 0, purchasesPaid: 0 },
    );

    return (
        <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold text-gray-900">Month by month</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                        Sales against expenses, {first && last ? `${fmtMonth(first, true)} – ${fmtMonth(last, true)}` : 'last 12 months'} (Bangladesh time).
                    </p>
                </div>
                <div className="self-start">
                    <Segmented value={view} onChange={setView} options={[{ value: 'chart', label: 'Chart' }, { value: 'table', label: 'Table' }]} />
                </div>
            </div>

            {nothing ? (
                <div className="py-12 text-center text-sm text-gray-500">
                    <LuChartColumn size={28} className="mx-auto mb-2 text-gray-300" />
                    No sales, expenses, payouts or supplier payments in these 12 months.
                </div>
            ) : view === 'chart' ? (
                <>
                    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
                        {SERIES.map((s) => (
                            <span key={s.key} className="inline-flex items-center gap-1.5">
                                <span className={cx('h-2.5 w-2.5 rounded-sm', s.cls)} aria-hidden /> {s.label}
                            </span>
                        ))}
                    </div>

                    <div className="relative h-[200px]" onMouseLeave={() => setActive(null)}>
                        {/* Gridlines with their values */}
                        {[1, 0.5].map((f) => (
                            <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-gray-100" style={{ bottom: `${f * 100}%` }}>
                                <span className="absolute left-0 top-0 -translate-y-1/2 bg-white pr-1 text-[10px] tabular-nums text-gray-400">{compactTaka(top * f)}</span>
                            </div>
                        ))}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-gray-200" />

                        <div className="absolute inset-y-0 left-9 right-0 flex items-end gap-0.5 sm:left-11 sm:gap-2">
                            {months.map((m, i) => {
                                const dim = inPeriod && !inPeriod.has(m.month);
                                const on = active === i;
                                return (
                                    <button
                                        key={m.month}
                                        type="button"
                                        onMouseEnter={() => setActive(i)}
                                        onFocus={() => setActive(i)}
                                        onClick={() => setActive(i)}
                                        aria-label={`${fmtMonth(m.month, true)}: sales ${money(m.sales)}, expenses ${money(m.expenses)}`}
                                        className={cx(
                                            'group relative flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] rounded-md outline-none transition focus-visible:ring-2 focus-visible:ring-[rgba(var(--color-primary-rgb),0.35)]',
                                            on && 'bg-gray-50',
                                            dim && !on && 'opacity-35',
                                        )}
                                    >
                                        {SERIES.map((s) => (
                                            <span
                                                key={s.key}
                                                className={cx('w-full max-w-[18px] rounded-t-[4px] transition-all', s.cls)}
                                                style={{ height: pct(m[s.key]) }}
                                            />
                                        ))}
                                        {/* Hover tooltip (desktop); the readout below serves touch */}
                                        <span
                                            className={cx(
                                                'pointer-events-none absolute bottom-full z-10 mb-1 hidden w-max min-w-[150px] rounded-lg bg-gray-900 px-2.5 py-2 text-left text-xs text-white shadow-lg sm:group-hover:block',
                                                i < 6 ? 'left-0' : 'right-0',
                                            )}
                                        >
                                            <span className="mb-1 block font-semibold">{fmtMonth(m.month, true)}</span>
                                            <span className="flex justify-between gap-4"><span className="text-gray-300">Sales</span><span className="font-semibold tabular-nums">{money(m.sales)}</span></span>
                                            <span className="flex justify-between gap-4"><span className="text-gray-300">Expenses</span><span className="font-semibold tabular-nums">{money(m.expenses)}</span></span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="ml-9 mt-1.5 flex gap-0.5 sm:ml-11 sm:gap-2">
                        {months.map((m, i) => (
                            <span key={m.month} className={cx('min-w-0 flex-1 truncate text-center text-[10px] text-gray-400', i % 2 === 1 && 'invisible sm:visible', active === i && 'font-semibold text-gray-700')}>
                                {fmtMonth(m.month)}
                            </span>
                        ))}
                    </div>

                    {shown && (
                        <div className="mt-4 rounded-xl bg-gray-50 px-4 py-3">
                            <p className="mb-2 text-xs font-semibold text-gray-700">
                                {fmtMonth(shown.month, true)}
                                <span className="ml-1 font-normal text-gray-400">{active === null ? '· hover or tap a month' : ''}</span>
                            </p>
                            <Readout m={shown} />
                        </div>
                    )}
                </>
            ) : (
                <div className="-mx-5 overflow-x-auto">
                    <table className="w-full min-w-[560px]">
                        <thead>
                            <tr>
                                <th className={TH}>Month</th>
                                <th className={`${TH} text-right`}>Delivered</th>
                                <th className={`${TH} text-right`}>Sales</th>
                                <th className={`${TH} text-right`}>Expenses</th>
                                <th className={`${TH} text-right`}>Courier payouts</th>
                                <th className={`${TH} text-right`}>Paid to suppliers</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...months].reverse().map((m) => (
                                <tr key={m.month} className={cx('border-t border-gray-100', inPeriod && !inPeriod.has(m.month) && 'text-gray-400')}>
                                    <td className={`${TD} whitespace-nowrap font-medium`}>{fmtMonth(m.month, true)}</td>
                                    <td className={`${TD} text-right tabular-nums`}>{count(m.orders)}</td>
                                    <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{money(m.sales)}</td>
                                    <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{money(m.expenses)}</td>
                                    <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{money(m.payouts)}</td>
                                    <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{money(m.purchasesPaid)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-gray-200 bg-gray-50/60 font-semibold text-gray-900">
                                <td className={TD}>12 months</td>
                                <td className={`${TD} text-right tabular-nums`}>{count(totals.orders)}</td>
                                <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{money(totals.sales)}</td>
                                <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{money(totals.expenses)}</td>
                                <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{money(totals.payouts)}</td>
                                <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{money(totals.purchasesPaid)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </section>
    );
}
