"use client";

import React from 'react';
import Link from 'next/link';
import { LuArrowUpRight } from 'react-icons/lu';
import { cx } from '@/components/admin/ui';

/**
 * One headline figure that opens its own page, like the client's Accounts screen:
 * label, big amount, one line saying what it counts, and an optional detail line.
 */
export default function OverviewTile({ href, label, icon, value, hint, detail, tone }: {
    href: string;
    label: string;
    icon: React.ReactNode;
    value: React.ReactNode;
    /** what the figure counts */
    hint: React.ReactNode;
    /** a second, smaller line (breakdown or a warning) */
    detail?: React.ReactNode;
    /** colours the detail line: amber for a warning */
    tone?: 'amber';
}) {
    return (
        <Link
            href={href}
            className="group flex min-w-0 flex-col rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[var(--color-primary-border)] hover:shadow-[0_1px_8px_rgba(var(--color-primary-rgb),0.08)] focus:outline-none focus-visible:border-[var(--color-primary)] focus-visible:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.15)]"
        >
            <div className="flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm text-gray-500">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-lightest)] text-[var(--color-primary)]">{icon}</span>
                    <span className="truncate">{label}</span>
                </span>
                <LuArrowUpRight size={16} className="shrink-0 text-gray-300 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--color-primary)]" aria-hidden />
            </div>
            <p className="mt-3 break-words text-[26px] font-semibold leading-tight tracking-tight text-gray-900 tabular-nums">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{hint}</p>
            {detail && (
                <p className={cx('mt-2 border-t border-gray-100 pt-2 text-xs', tone === 'amber' ? 'text-amber-700' : 'text-gray-400')}>
                    {detail}
                </p>
            )}
        </Link>
    );
}

export function TileSkeleton() {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2">
                <div className="h-7 w-7 animate-pulse rounded-full bg-gray-100" />
                <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="mt-4 h-7 w-40 animate-pulse rounded bg-gray-100" />
            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-gray-100" />
            <div className="mt-4 h-3 w-36 animate-pulse rounded bg-gray-100" />
        </div>
    );
}
