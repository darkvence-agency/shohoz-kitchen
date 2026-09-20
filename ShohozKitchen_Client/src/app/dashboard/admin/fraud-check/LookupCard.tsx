"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    LuSearch, LuPhone, LuMail, LuTriangleAlert, LuShoppingBag, LuPackageCheck, LuUndo2, LuBan,
    LuFileText, LuLoader, LuInfo, LuShieldAlert, LuUserRoundSearch,
} from 'react-icons/lu';
import { Btn, Card, StatTile, Badge, taka, cx } from '@/components/admin/ui';
import { useLookupFraudHistoryQuery, type IFraudLookup } from '@/redux/api/fraudApi';
import { errMsg, bdDate, plural, OrderStatusBadge, RiskBadge, RISK } from './shared';

/** Same rules as the server (fraud.rules parseLookupQuery), so obvious typos never hit the API. */
function checkInput(raw: string): string {
    const v = raw.trim();
    if (!v) return 'Enter a phone number or an email';
    if (v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'That email doesn’t look right';
    if (/[a-z]/i.test(v)) return 'Enter a phone number like 01712345678, or an email';
    const digits = v.replace(/\D/g, '');
    if (digits.length < 10) return 'Enter the full phone number, like 01712345678';
    if (digits.length > 15) return 'That phone number is too long';
    return '';
}

export default function LookupCard({ initialQuery = '' }: { initialQuery?: string }) {
    const [input, setInput] = useState(initialQuery);
    const [query, setQuery] = useState(() => (initialQuery && !checkInput(initialQuery) ? initialQuery.trim() : ''));
    const [inputError, setInputError] = useState('');

    // currentData: never show the previous customer's history under a new number.
    const { currentData, isFetching, isError, error, refetch } = useLookupFraudHistoryQuery(query, { skip: !query });
    const result = currentData?.data;

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        const problem = checkInput(input);
        setInputError(problem);
        if (problem) return;
        const v = input.trim();
        if (v === query) refetch();
        else setQuery(v);
    };

    return (
        <div className="mb-10">
            <form onSubmit={submit} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="w-full sm:w-72">
                    <input
                        aria-label="Phone number or email"
                        aria-invalid={!!inputError}
                        inputMode="text"
                        autoComplete="off"
                        value={input}
                        onChange={(e) => { setInput(e.target.value); if (inputError) setInputError(''); }}
                        placeholder="01711295677"
                        className={cx(
                            'h-9 w-full rounded-full border bg-gray-100 px-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]',
                            inputError ? 'border-red-300 focus:border-red-400' : 'border-transparent focus:border-[var(--color-primary-border)]',
                        )}
                    />
                    {inputError && <p className="mt-1.5 px-4 text-xs text-red-600">{inputError}</p>}
                </div>
                <Btn type="submit" variant="primary" icon={isFetching ? <LuLoader size={15} className="animate-spin" /> : <LuSearch size={15} />} disabled={isFetching} className="sm:w-auto">
                    Check
                </Btn>
            </form>
            <p className="mt-2 px-1 text-xs text-gray-400">
                Phone number or email. We look through this store&apos;s own orders and returns.
            </p>

            {query && (
                <div className="mt-4">
                    {isFetching && !result ? <LookupSkeleton /> : isError && !result ? (
                        <Card>
                            <div className="flex flex-col items-center py-6 text-center">
                                <LuTriangleAlert size={28} className="mb-2 text-amber-500" />
                                <p className="text-sm text-gray-700">{errMsg(error, 'Couldn’t look up this customer.')}</p>
                                {(error as { status?: unknown })?.status !== 400 && (
                                    <div className="mt-3"><Btn onClick={() => refetch()}>Try again</Btn></div>
                                )}
                            </div>
                        </Card>
                    ) : result ? <LookupResult r={result} refreshing={isFetching} /> : null}
                </div>
            )}
        </div>
    );
}

/* ─── Result ──────────────────────────────────────────────── */

function LookupResult({ r, refreshing }: { r: IFraudLookup; refreshing: boolean }) {
    const who = r.query.type === 'phone'
        ? <><LuPhone size={14} className="shrink-0" /> {r.query.value}</>
        : <><LuMail size={14} className="shrink-0" /> <span className="truncate">{r.query.value}</span></>;

    if (r.totalOrders === 0) {
        return (
            <Card>
                <div className="flex flex-col items-center py-6 text-center">
                    <LuUserRoundSearch size={30} className="mb-2 text-gray-300" />
                    <p className="text-sm font-medium text-gray-800">No orders on this store for {r.query.value}</p>
                    <p className="mt-1 max-w-md text-xs text-gray-500">
                        A first-time customer. There is nothing to judge them by yet: no deliveries, cancellations or returns.
                    </p>
                </div>
            </Card>
        );
    }

    const others = [...r.customer.phones, ...r.customer.emails].filter((x) => x !== r.query.value);
    const dispatched = r.delivered + r.returned + r.cancelledAfterDispatch;

    return (
        <Card className={cx('transition-opacity', refreshing && 'opacity-60')}>
            {/* Who */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-gray-900">{r.customer.name || 'Unnamed customer'}</p>
                    <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-sm text-gray-500">{who}</p>
                    {others.length > 0 && (
                        <p className="mt-1 break-words text-xs text-gray-400">Also used: {others.join(', ')}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                        {r.firstOrderAt === r.lastOrderAt
                            ? `One order, on ${bdDate(r.lastOrderAt)}`
                            : `Customer since ${bdDate(r.firstOrderAt)} · last order ${bdDate(r.lastOrderAt)}`}
                    </p>
                </div>
                <div className="flex flex-col items-start gap-1 sm:items-end">
                    <RiskBadge risk={r.risk} />
                    <p className="text-xs text-gray-400 sm:text-right">{RISK[r.risk].hint}</p>
                </div>
            </div>

            {r.openFlags > 0 && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                    <LuShieldAlert size={16} className="mt-0.5 shrink-0" />
                    <span>{plural(r.openFlags, 'order')} from this customer {r.openFlags === 1 ? 'is' : 'are'} waiting for review below.</span>
                </div>
            )}

            {/* Numbers */}
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">
                <StatTile label="Orders" icon={<LuShoppingBag size={16} />} value={r.totalOrders.toLocaleString('en-IN')}
                    hint={r.inProgress ? `${r.inProgress} still in progress` : 'All closed'} />
                <StatTile label="Delivered" icon={<LuPackageCheck size={16} />} value={r.delivered.toLocaleString('en-IN')}
                    hint={r.spent ? `Worth ${taka(r.spent)}` : undefined} />
                <StatTile label="Returned" icon={<LuUndo2 size={16} />} value={<span className={r.returned ? 'text-red-600' : undefined}>{r.returned.toLocaleString('en-IN')}</span>}
                    hint="Returned or refunded" />
                <StatTile label="Cancelled" icon={<LuBan size={16} />} value={r.cancelled.toLocaleString('en-IN')}
                    hint={r.cancelledAfterDispatch ? `${r.cancelledAfterDispatch} after it was sent out` : 'None after dispatch'} />
                <StatTile label="Return requests" icon={<LuFileText size={16} />} value={r.returnRequests.total.toLocaleString('en-IN')}
                    hint={r.returnRequests.total
                        ? [r.returnRequests.pending && `${r.returnRequests.pending} pending`, r.returnRequests.rejected && `${r.returnRequests.rejected} rejected`, (r.returnRequests.approved + r.returnRequests.refunded) && `${r.returnRequests.approved + r.returnRequests.refunded} accepted`].filter(Boolean).join(' · ')
                        : 'None filed'} />
            </div>

            {/* Rates */}
            <div className="mt-4 grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
                <RateBar
                    label="Delivery success"
                    value={r.deliverySuccessRate}
                    good
                    caption={dispatched ? `${r.delivered} of ${plural(dispatched, 'parcel')} sent out stayed delivered` : 'Nothing sent out yet'}
                />
                <RateBar
                    label="Return rate"
                    value={r.returnRate}
                    caption={r.delivered + r.returned ? `${r.returned} of ${plural(r.delivered + r.returned, 'delivered order')} came back` : 'Nothing delivered yet'}
                />
            </div>

            {/* Recent orders */}
            <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Recent orders</h3>
                <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                    {r.recentOrders.map((o) => (
                        <li key={o._id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3 py-2.5">
                            <div className="min-w-0">
                                <Link href={`/dashboard/admin/orders/${o._id}`} className="text-sm font-semibold text-gray-900 hover:text-[var(--color-primary)]">
                                    {o.orderId}
                                </Link>
                                <span className="ml-2 text-xs text-gray-400">{bdDate(o.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {o.returned && !['returned', 'refunded'].includes(o.status) && <Badge tone="rose">Items returned</Badge>}
                                <OrderStatusBadge status={o.status} />
                                <span className="w-20 text-right text-sm tabular-nums text-gray-700">{taka(o.total)}</span>
                            </div>
                        </li>
                    ))}
                </ul>
                {r.totalOrders > r.recentOrders.length && (
                    <p className="mt-2 text-xs text-gray-400">Showing the latest {r.recentOrders.length} of {r.totalOrders.toLocaleString('en-IN')} orders.</p>
                )}
            </div>

            <p className="mt-4 flex items-start gap-1.5 text-xs text-gray-400">
                <LuInfo size={13} className="mt-0.5 shrink-0" />
                Based on orders placed on this store only (matched by phone, email or customer account). Steadfast&apos;s API has no
                courier-wide history check, so parcels from other shops are not counted.
            </p>
        </Card>
    );
}

/** A plain CSS bar. `good` = higher is better (green); otherwise higher is worse. */
function RateBar({ label, value, caption, good }: { label: string; value: number | null; caption: string; good?: boolean }) {
    const v = value ?? 0;
    const color = value === null ? 'bg-gray-300'
        : good ? (v >= 80 ? 'bg-emerald-500' : v >= 50 ? 'bg-amber-500' : 'bg-red-500')
            : (v >= 30 ? 'bg-red-500' : v > 0 ? 'bg-amber-500' : 'bg-emerald-500');
    return (
        <div>
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm text-gray-600">{label}</span>
                <span className="text-lg font-semibold tabular-nums text-gray-900">{value === null ? '—' : `${value}%`}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-200" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value ?? undefined}>
                <div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(100, Math.max(value === null ? 0 : 2, v))}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">{caption}</p>
        </div>
    );
}

function LookupSkeleton() {
    return (
        <Card>
            <div className="animate-pulse">
                <div className="h-5 w-40 rounded bg-gray-100" />
                <div className="mt-2 h-4 w-28 rounded bg-gray-100" />
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100" />)}
                </div>
                <div className="mt-4 h-20 rounded-xl bg-gray-100" />
            </div>
        </Card>
    );
}
