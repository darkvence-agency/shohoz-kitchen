"use client";

import React, { useState } from 'react';
import { taka } from '@/components/admin/ui';
import { bucketLabel } from './period';

type Point = { key: string; orders: number; value: number };

/** Plot height in px — keep in step with the h-44 classes below. */
const CHART_H = 176;
type Granularity = 'hour' | 'day' | 'month';

/** Round up to a tidy axis maximum (1, 2, 2.5, 5 × 10ⁿ). */
function niceMax(v: number): number {
    if (v <= 0) return 1;
    const exp = Math.pow(10, Math.floor(Math.log10(v)));
    for (const m of [1, 2, 2.5, 5, 10]) if (m * exp >= v) return m * exp;
    return 10 * exp;
}

const compactTaka = (n: number) =>
    n >= 100000 ? `৳${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L` : n >= 1000 ? `৳${(n / 1000).toFixed(n % 1000 ? 1 : 0)}k` : taka(n);

/**
 * Single-series bar chart (plain CSS): orders or order value per hour/day/month.
 * Each column is a full-height hover target; the tooltip names the bucket and
 * shows both measures.
 */
export default function TrendChart({ points, granularity, metric }: {
    points: Point[]; granularity: Granularity; metric: 'orders' | 'value';
}) {
    const [hover, setHover] = useState<number | null>(null);
    const values = points.map((p) => (metric === 'orders' ? p.orders : p.value));
    const max = niceMax(Math.max(0, ...values));
    const ticks = [max, max / 2, 0];
    const fmtTick = (n: number) => (metric === 'orders' ? (Number.isInteger(n) ? String(n) : '') : compactTaka(n));

    // Show at most ~8 x-axis labels.
    const n = points.length;
    const every = granularity === 'hour' ? 3 : Math.max(1, Math.ceil(n / 8));
    const h = hover !== null ? points[hover] : null;
    const edge = hover === null ? 'center' : hover < n * 0.15 ? 'start' : hover > n * 0.85 ? 'end' : 'center';

    return (
        <div className="relative select-none">
            <div className="flex gap-2">
                {/* y-axis labels */}
                <div className="relative h-44 w-12 shrink-0 text-right text-[11px] text-gray-400">
                    {ticks.map((t, i) => (
                        <span key={i} className="absolute right-0 -translate-y-1/2" style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}>
                            {fmtTick(t)}
                        </span>
                    ))}
                </div>

                <div className="relative min-w-0 flex-1">
                    {/* gridlines */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-44">
                        {ticks.map((_, i) => (
                            <div key={i} className={i === ticks.length - 1 ? 'absolute inset-x-0 border-t border-gray-300' : 'absolute inset-x-0 border-t border-dashed border-gray-100'}
                                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }} />
                        ))}
                    </div>

                    {/* bars */}
                    <div
                        className="relative flex h-44 items-end gap-[2px]"
                        role="img"
                        aria-label={`${metric === 'orders' ? 'Orders' : 'Order value'} per ${granularity}`}
                        onMouseLeave={() => setHover(null)}
                    >
                        {points.map((p, i) => {
                            const v = values[i];
                            const pct = max ? (v / max) * 100 : 0;
                            return (
                                <div key={p.key} className="flex h-full min-w-0 flex-1 items-end justify-center" onMouseEnter={() => setHover(i)}>
                                    <div
                                        className="w-full max-w-[28px] rounded-t-[4px] transition-colors"
                                        style={{
                                            height: v > 0 ? `max(${pct}%, 3px)` : 0,
                                            background: hover === null || hover === i ? 'var(--color-primary)' : 'rgba(var(--color-primary-rgb),0.35)',
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* x labels */}
                    <div className="mt-2 flex gap-[2px] text-[11px] text-gray-400">
                        {points.map((p, i) => (
                            <div key={p.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
                                {i % every === 0 ? bucketLabel(p.key, granularity) : ''}
                            </div>
                        ))}
                    </div>

                    {/* tooltip */}
                    {h && hover !== null && (
                        <div
                            className="pointer-events-none absolute z-10 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg"
                            style={{
                                left: `${((hover + 0.5) / n) * 100}%`,
                                // sit just above the hovered bar (the plot is 176px tall)
                                top: Math.round(CHART_H * (1 - (max ? values[hover] / max : 0))) - 8,
                                transform: edge === 'start' ? 'translate(-12px,-100%)' : edge === 'end' ? 'translate(calc(-100% + 12px),-100%)' : 'translate(-50%,-100%)',
                            }}
                        >
                            <p className="whitespace-nowrap font-medium text-gray-900">{bucketLabel(h.key, granularity, true)}</p>
                            <p className="mt-0.5 whitespace-nowrap text-gray-600">
                                {h.orders} order{h.orders === 1 ? '' : 's'} · {taka(h.value)}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* the same data as a table, for screen readers */}
            <table className="sr-only">
                <caption>{metric === 'orders' ? 'Orders' : 'Order value'} per {granularity}</caption>
                <thead><tr><th>Period</th><th>Orders</th><th>Order value</th></tr></thead>
                <tbody>
                    {points.map((p) => (
                        <tr key={p.key}><td>{bucketLabel(p.key, granularity, true)}</td><td>{p.orders}</td><td>{taka(p.value)}</td></tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
