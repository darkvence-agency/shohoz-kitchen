"use client";

import React, { useState } from 'react';
import { Card, taka, cx } from '@/components/admin/ui';
import type { IExpenseSummary } from '@/redux/api/expenseApi';
import { fmtMonth } from './shared';

const TOP = 7;

/** Where the money went (by category, CSS bars) and the last 12 months (CSS columns). */
export default function Breakdown({ summary, loading, activeCategory, onCategory, periodMonths }: {
    summary?: IExpenseSummary;
    loading: boolean;
    activeCategory: string;
    onCategory: (id: string) => void;
    /** YYYY-MM keys covered by the selected period (highlighted in the trend) */
    periodMonths: Set<string> | null;
}) {
    const [showAll, setShowAll] = useState(false);

    if (loading) {
        return (
            <div className="mb-6 grid gap-3 lg:grid-cols-5">
                <div className="h-[260px] animate-pulse rounded-2xl bg-gray-100 lg:col-span-3" />
                <div className="h-[260px] animate-pulse rounded-2xl bg-gray-100 lg:col-span-2" />
            </div>
        );
    }
    if (!summary || summary.count === 0) return null;

    const cats = summary.byCategory;
    const shown = showAll ? cats : cats.slice(0, TOP);
    const maxCat = Math.max(...cats.map((c) => c.total), 1);
    const maxMonth = Math.max(...summary.months.map((m) => m.total), 1);
    const monthsTotal = summary.months.reduce((s, m) => s + m.total, 0);

    return (
        <div className="mb-6 grid gap-3 lg:grid-cols-5">
            <Card
                title="Where the money went"
                description="Click a category to see only its expenses."
                className="lg:col-span-3"
            >
                <ul className="space-y-2.5">
                    {shown.map((c) => {
                        const on = !!c.categoryId && activeCategory === c.categoryId;
                        return (
                            <li key={c.categoryId || c.name}>
                                <button
                                    type="button"
                                    onClick={() => c.categoryId && onCategory(on ? '' : c.categoryId)}
                                    className={cx(
                                        'group block w-full rounded-lg px-2 py-1.5 text-left transition',
                                        on ? 'bg-[var(--color-primary-lightest)]' : 'hover:bg-gray-50',
                                    )}
                                    aria-pressed={on}
                                >
                                    <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                                        <span className={cx('min-w-0 truncate', on ? 'font-semibold text-gray-900' : 'text-gray-700')}>{c.name}</span>
                                        <span className="shrink-0 tabular-nums">
                                            <span className="font-semibold text-gray-900">{taka(c.total)}</span>
                                            <span className="ml-2 inline-block w-11 text-right text-xs text-gray-400">{c.share.toFixed(c.share < 10 ? 1 : 0)}%</span>
                                        </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                                        <div
                                            className={cx('h-full rounded-full transition-all', on ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-primary)] opacity-70 group-hover:opacity-100')}
                                            style={{ width: `${Math.max(1.5, (c.total / maxCat) * 100)}%` }}
                                        />
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
                {cats.length > TOP && (
                    <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-3 px-2 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]">
                        {showAll ? 'Show fewer' : `Show all ${cats.length} categories`}
                    </button>
                )}
            </Card>

            <Card
                title="Last 12 months"
                description={`${taka(monthsTotal)} spent in these 12 months`}
                className="lg:col-span-2"
            >
                <div className="flex h-[180px] items-end gap-1 sm:gap-1.5" role="list">
                    {summary.months.map((m, i) => {
                        const h = m.total > 0 ? Math.max(3, (m.total / maxMonth) * 100) : 0;
                        const inPeriod = !periodMonths || periodMonths.has(m.month);
                        return (
                            <div key={m.month} role="listitem" className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end">
                                <div className={cx('pointer-events-none absolute top-0 z-10 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs text-white shadow group-hover:block', i < 6 ? 'left-0' : 'right-0')}>
                                    {fmtMonth(m.month, true)}: {taka(m.total)}{m.count ? ` · ${m.count} entr${m.count === 1 ? 'y' : 'ies'}` : ''}
                                </div>
                                <div
                                    className={cx('w-full rounded-t-md transition-all', inPeriod ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-primary)] opacity-30', m.total === 0 && 'bg-gray-100 opacity-100')}
                                    style={{ height: m.total > 0 ? `${h}%` : '3px' }}
                                    aria-label={`${fmtMonth(m.month, true)}: ${taka(m.total)}`}
                                />
                            </div>
                        );
                    })}
                </div>
                <div className="mt-1.5 flex gap-1 sm:gap-1.5">
                    {summary.months.map((m, i) => (
                        <span key={m.month} className={cx('min-w-0 flex-1 truncate text-center text-[10px] text-gray-400', i % 2 === 1 && 'invisible sm:visible')}>
                            {fmtMonth(m.month)}
                        </span>
                    ))}
                </div>
            </Card>
        </div>
    );
}
