"use client";

/**
 * Daily column chart in plain HTML/CSS (no chart library).
 * One series in the brand colour, bars capped at 24px with 4px rounded tops and a
 * 2px gap, faint gridlines on clean numbers, dates at both ends, and a tooltip on
 * hover, tap or keyboard (focus the chart, then ←/→, Home, End). A hidden table
 * carries every value for screen readers.
 */

import React, { useState } from 'react';
import { cx } from '@/components/admin/ui';
import { fmtDay, fmtWeekday, niceMax } from './format';

export interface BarDatum {
    key: string;   // 'YYYY-MM-DD'
    value: number;
}

export function BarChart({ data, label, format, axisFormat, detail, todayKey, emptyText = 'Nothing yet', height = 176 }: {
    data: BarDatum[];
    /** Accessible name, e.g. "Revenue, last 30 days". */
    label: string;
    /** Value in the tooltip and table. */
    format: (n: number) => string;
    /** Value on the gridlines. */
    axisFormat: (n: number) => string;
    /** Extra tooltip line for bar i. */
    detail?: (i: number) => React.ReactNode;
    todayKey?: string;
    emptyText?: string;
    height?: number;
}) {
    const [active, setActive] = useState<number | null>(null);
    const n = data.length;
    const max = niceMax(Math.max(0, ...data.map((d) => d.value || 0)));
    const isEmpty = data.every((d) => !(d.value > 0));
    const ticks = [max, max / 2, 0];

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!n) return;
        const cur = active ?? n - 1;
        let next = cur;
        if (e.key === 'ArrowLeft') next = Math.max(0, cur - 1);
        else if (e.key === 'ArrowRight') next = Math.min(n - 1, cur + 1);
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = n - 1;
        else if (e.key === 'Escape') { setActive(null); return; }
        else return;
        e.preventDefault();
        setActive(next);
    };

    const a = active != null ? data[active] : null;
    // The tooltip sits beside the active bar (never on top of it), flipping sides at the midpoint.
    const tipStyle: React.CSSProperties | undefined = active == null ? undefined
        : active < n / 2
            ? { left: `calc(${((active + 1) / n) * 100}% + 6px)` }
            : { right: `calc(${(1 - active / n) * 100}% + 6px)` };

    return (
        <div>
            <div className="flex gap-2">
                {/* Gridline values */}
                <div aria-hidden className="relative w-9 shrink-0 text-right text-[10px] leading-none text-gray-400" style={{ height }}>
                    {ticks.map((t) => (
                        <span key={t} className="absolute right-0 -translate-y-1/2 tabular-nums" style={{ top: `${(1 - t / max) * 100}%` }}>
                            {axisFormat(t)}
                        </span>
                    ))}
                </div>

                {/* Plot */}
                <div
                    role="group"
                    tabIndex={0}
                    aria-label={`${label}. Use the arrow keys to read each day.`}
                    onKeyDown={onKeyDown}
                    onFocus={() => setActive((cur) => cur ?? (n ? n - 1 : null))}
                    onBlur={() => setActive(null)}
                    onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(null); }}
                    className="relative min-w-0 flex-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--color-primary-rgb),0.25)]"
                    style={{ height }}
                >
                    {ticks.map((t) => (
                        <div
                            key={t}
                            aria-hidden
                            className={cx('pointer-events-none absolute inset-x-0 border-t', t === 0 ? 'border-gray-200' : 'border-dashed border-gray-100')}
                            style={{ top: `${(1 - t / max) * 100}%` }}
                        />
                    ))}

                    <div aria-hidden className="absolute inset-0 flex items-end gap-[2px]">
                        {data.map((d, i) => {
                            const pct = d.value > 0 ? (d.value / max) * 100 : 0;
                            return (
                                <div
                                    key={d.key}
                                    className="flex h-full min-w-0 flex-1 cursor-default items-end justify-center"
                                    onPointerEnter={() => setActive(i)}
                                    onPointerDown={() => setActive(i)}
                                >
                                    <div
                                        className={cx(
                                            'w-full max-w-6 rounded-t-[4px] transition-[background-color,opacity] duration-150',
                                            active === i ? 'bg-[var(--color-primary-dark)]' : 'bg-[var(--color-primary)]',
                                            active != null && active !== i && 'opacity-50',
                                        )}
                                        style={{ height: `${pct}%`, minHeight: d.value > 0 ? 2 : 0 }}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {isEmpty && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-400">{emptyText}</div>
                    )}

                    {a && active != null && (
                        <div
                            aria-hidden
                            className="pointer-events-none absolute top-0 z-10 whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg"
                            style={tipStyle}
                        >
                            <p className="text-sm font-semibold tabular-nums text-gray-900">{format(a.value)}</p>
                            <p className="mt-0.5 text-xs text-gray-500">
                                {fmtWeekday(a.key)}, {fmtDay(a.key)}{a.key === todayKey ? ' · today so far' : ''}
                            </p>
                            {detail?.(active)}
                        </div>
                    )}
                    <span className="sr-only" aria-live="polite">{a ? `${fmtDay(a.key)}: ${format(a.value)}` : ''}</span>
                </div>
            </div>

            <div className="mt-2 flex justify-between pl-11 text-xs text-gray-500">
                <span>{n ? fmtDay(data[0].key) : ''}</span>
                <span>{n ? fmtDay(data[n - 1].key) : ''}</span>
            </div>

            <table className="sr-only">
                <caption>{label}</caption>
                <thead><tr><th scope="col">Date</th><th scope="col">Value</th></tr></thead>
                <tbody>
                    {data.map((d) => <tr key={d.key}><td>{fmtDay(d.key)}</td><td>{format(d.value)}</td></tr>)}
                </tbody>
            </table>
        </div>
    );
}

/** Placeholder bars while the numbers load (fixed heights — no hydration mismatch). */
const SKELETON = [38, 62, 70, 84, 96, 76, 88, 80, 74, 66, 30, 48, 12, 26, 58, 44, 18, 8, 16, 10, 20, 14, 8, 22, 12, 6, 10, 24, 34, 22];

export function BarChartSkeleton({ height = 176 }: { height?: number }) {
    return (
        <div aria-hidden>
            <div className="flex gap-2">
                <div className="w-9 shrink-0" />
                <div className="flex flex-1 items-end gap-[2px] border-b border-gray-200" style={{ height }}>
                    {SKELETON.map((h, i) => (
                        <div key={i} className="flex h-full min-w-0 flex-1 items-end justify-center">
                            <div className="w-full max-w-6 animate-pulse rounded-t-[4px] bg-gray-100" style={{ height: `${h}%` }} />
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-2 flex justify-between pl-11">
                <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
            </div>
        </div>
    );
}
