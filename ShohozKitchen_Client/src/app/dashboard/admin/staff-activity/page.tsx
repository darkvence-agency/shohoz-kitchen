'use client';

/**
 * Staff activity — who confirmed which orders, and how many.
 *
 * Only status changes made from the admin panel are counted: the customer's own
 * cancellations and the courier auto-sync carry no actor. Nothing recorded before
 * this report was added can be attributed, so early periods read as empty.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
    useGetStaffActivityQuery,
    useGetStaffHistoryQuery,
    type OrderStatus,
    type StaffRow,
} from '@/redux/api/analyticsApi';
import { ROLE_LABEL } from '@/components/admin/access';
import {
    PRESETS, addDays, daySpan, dhakaToday, fmtPeriod, isDay, MAX_RANGE_DAYS,
} from '../analytics/_components/period';

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ');
const fmtMoney = (n: number) => `৳${(n || 0).toLocaleString()}`;

const fmtWhen = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Dhaka',
    });

const STATUS_FILTER: { label: string; value: OrderStatus | '' }[] = [
    { label: 'All changes', value: '' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
    { label: 'Returned', value: 'returned' },
];

const STATUS_STYLE: Record<string, string> = {
    confirmed: 'bg-blue-50 text-blue-700 ring-blue-200',
    processing: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    shipped: 'bg-violet-50 text-violet-700 ring-violet-200',
    delivered: 'bg-green-50 text-green-700 ring-green-200',
    cancelled: 'bg-red-50 text-red-700 ring-red-200',
    returned: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const StatusPill = ({ value }: { value: string }) => (
    <span
        className={cx(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset',
            STATUS_STYLE[value] || 'bg-gray-50 text-gray-600 ring-gray-200',
        )}
    >
        {(value || '—').replace(/_/g, ' ')}
    </span>
);

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cx('rounded-xl border border-gray-200 bg-white p-4 sm:p-5', className)}>{children}</div>
);

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
    <Card>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}
    </Card>
);

/** Horizontal bar, sized against the busiest person in the list. */
const Bar = ({ value, max }: { value: number; max: number }) => (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
            className="h-full rounded-full bg-[var(--color-primary)]"
            style={{ width: max > 0 ? `${Math.max(2, (value / max) * 100)}%` : '0%' }}
        />
    </div>
);

const DateInput = ({ label, value, min, max, onChange }: {
    label: string; value: string; min?: string; max?: string; onChange: (v: string) => void;
}) => (
    <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <input
            type="date" value={value} min={min} max={max}
            onChange={(e) => isDay(e.target.value) && onChange(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 px-2 text-sm text-gray-800 outline-none focus:border-[var(--color-primary)]"
        />
    </label>
);

export default function StaffActivityPage() {
    const today = dhakaToday();
    const [range, setRange] = useState(() => ({ from: `${today.slice(0, 8)}01`, to: today }));
    const [actor, setActor] = useState('');
    const [status, setStatus] = useState<OrderStatus | ''>('');
    const [page, setPage] = useState(1);

    const tooLong = daySpan(range.from, range.to) > MAX_RANGE_DAYS;

    const { data: report, isFetching: loadingReport } = useGetStaffActivityQuery(range, { skip: tooLong });
    const { data: history, isFetching: loadingHistory } = useGetStaffHistoryQuery(
        { ...range, actor, status, page, limit: 20 },
        { skip: tooLong },
    );

    const rows: StaffRow[] = useMemo(() => report?.data?.rows || [], [report]);
    const totals = report?.data?.totals;
    const maxConfirmed = useMemo(() => Math.max(1, ...rows.map((r) => r.confirmed)), [rows]);
    const activePreset = PRESETS.find((p) => {
        const x = p.range();
        return x.from === range.from && x.to === range.to;
    })?.key;

    const choose = (next: { from: string; to: string }) => { setRange(next); setPage(1); };
    const selected = rows.find((r) => r.actor === actor);

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-semibold text-gray-900">Staff activity</h1>
                <p className="mt-0.5 text-sm text-gray-500">
                    Who confirmed and moved orders — {fmtPeriod(range.from, range.to)}
                </p>
            </div>

            {/* ── Period ─────────────────────────────────────────── */}
            <Card>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="flex gap-2">
                        <DateInput label="From" value={range.from} max={range.to}
                            onChange={(v) => choose({ from: v, to: v > range.to ? v : range.to })} />
                        <DateInput label="To" value={range.to} min={range.from} max={today}
                            onChange={(v) => choose({ from: v < range.from ? v : range.from, to: v })} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 lg:ml-auto">
                        {PRESETS.map((p) => (
                            <button
                                key={p.key} type="button"
                                onClick={() => choose(p.range())}
                                className={cx(
                                    'h-8 rounded-full border px-3 text-xs font-medium transition',
                                    activePreset === p.key
                                        ? 'border-[var(--color-primary-border)] bg-[var(--color-primary-lightest)] text-[var(--color-primary-dark)]'
                                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
                {tooLong && (
                    <p className="mt-3 text-sm text-red-600">
                        A report can cover at most {MAX_RANGE_DAYS} days. Pick a shorter range.
                    </p>
                )}
            </Card>

            {!tooLong && (
                <>
                    {/* ── Totals ─────────────────────────────────── */}
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <Stat label="Orders confirmed" value={(totals?.confirmed ?? 0).toLocaleString()} hint="by staff, in this period" />
                        <Stat label="Value confirmed" value={fmtMoney(totals?.confirmedValue ?? 0)} />
                        <Stat label="Delivered" value={(totals?.delivered ?? 0).toLocaleString()} />
                        <Stat label="All status changes" value={(totals?.total ?? 0).toLocaleString()} />
                    </div>

                    {/* ── Leaderboard ────────────────────────────── */}
                    <Card className="!p-0">
                        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
                            <h2 className="text-sm font-semibold text-gray-900">Leaderboard</h2>
                            <span className="text-xs text-gray-500">Most confirmations first</span>
                        </div>

                        {loadingReport ? (
                            <p className="px-5 py-8 text-center text-sm text-gray-500">Loading…</p>
                        ) : rows.length === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-gray-500">
                                No staff order activity in this period.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[680px] text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                                            <th className="px-5 py-2.5 font-medium">#</th>
                                            <th className="px-3 py-2.5 font-medium">Staff</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Confirmed</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Value</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Delivered</th>
                                            <th className="px-3 py-2.5 text-right font-medium">Cancelled</th>
                                            <th className="px-5 py-2.5 text-right font-medium">All changes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rows.map((r, i) => (
                                            <tr
                                                key={r.actor}
                                                onClick={() => { setActor(actor === r.actor ? '' : r.actor); setPage(1); }}
                                                className={cx(
                                                    'cursor-pointer transition hover:bg-gray-50',
                                                    actor === r.actor && 'bg-[var(--color-primary-lightest)]',
                                                )}
                                            >
                                                <td className="px-5 py-3 text-gray-400">{i + 1}</td>
                                                <td className="px-3 py-3">
                                                    <p className="font-medium text-gray-900">{r.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {ROLE_LABEL[r.role] || r.role || '—'}
                                                        {r.email && ` · ${r.email}`}
                                                    </p>
                                                    <div className="mt-1.5 max-w-[220px]"><Bar value={r.confirmed} max={maxConfirmed} /></div>
                                                </td>
                                                <td className="px-3 py-3 text-right text-base font-semibold text-gray-900">{r.confirmed}</td>
                                                <td className="px-3 py-3 text-right text-gray-700">{fmtMoney(r.confirmedValue)}</td>
                                                <td className="px-3 py-3 text-right text-gray-700">{r.delivered}</td>
                                                <td className="px-3 py-3 text-right text-gray-700">{r.cancelled}</td>
                                                <td className="px-5 py-3 text-right text-gray-500">{r.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>

                    {/* ── History ────────────────────────────────── */}
                    <Card className="!p-0">
                        <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-gray-900">History</h2>
                                <p className="text-xs text-gray-500">
                                    {selected ? `Filtered to ${selected.name}` : 'Every status change, newest first'}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {selected && (
                                    <button
                                        type="button"
                                        onClick={() => { setActor(''); setPage(1); }}
                                        className="h-8 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 hover:bg-gray-50"
                                    >
                                        Clear staff filter
                                    </button>
                                )}
                                <select
                                    value={status}
                                    onChange={(e) => { setStatus(e.target.value as OrderStatus | ''); setPage(1); }}
                                    className="h-8 rounded-lg border border-gray-200 px-2 text-xs text-gray-700 outline-none focus:border-[var(--color-primary)]"
                                >
                                    {STATUS_FILTER.map((s) => (
                                        <option key={s.value || 'all'} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {loadingHistory ? (
                            <p className="px-5 py-8 text-center text-sm text-gray-500">Loading…</p>
                        ) : (history?.data?.length ?? 0) === 0 ? (
                            <p className="px-5 py-8 text-center text-sm text-gray-500">Nothing recorded for these filters.</p>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[640px] text-sm">
                                        <thead>
                                            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                                                <th className="px-5 py-2.5 font-medium">When</th>
                                                <th className="px-3 py-2.5 font-medium">Staff</th>
                                                <th className="px-3 py-2.5 font-medium">Order</th>
                                                <th className="px-3 py-2.5 font-medium">Change</th>
                                                <th className="px-5 py-2.5 text-right font-medium">Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {history?.data?.map((h) => (
                                                <tr key={h.id} className="hover:bg-gray-50">
                                                    <td className="whitespace-nowrap px-5 py-3 text-gray-600">{fmtWhen(h.at)}</td>
                                                    <td className="px-3 py-3">
                                                        <p className="font-medium text-gray-900">{h.name}</p>
                                                        <p className="text-xs text-gray-500">{ROLE_LABEL[h.role] || h.role || '—'}</p>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        {h.orderId ? (
                                                            <Link
                                                                href={`/dashboard/admin/orders/${h.orderId}`}
                                                                className="font-medium text-[var(--color-primary)] hover:underline"
                                                            >
                                                                {h.orderNo || h.orderId.slice(-8)}
                                                            </Link>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <StatusPill value={h.from} />
                                                            <span className="text-gray-400">→</span>
                                                            <StatusPill value={h.to} />
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-5 py-3 text-right text-gray-700">{fmtMoney(h.total)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {(history?.meta?.totalPages ?? 1) > 1 && (
                                    <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
                                        <p className="text-xs text-gray-500">
                                            Page {history?.meta?.page} of {history?.meta?.totalPages} · {history?.meta?.total} changes
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button" disabled={page <= 1}
                                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                className="h-8 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 disabled:opacity-40 hover:enabled:bg-gray-50"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                type="button" disabled={page >= (history?.meta?.totalPages ?? 1)}
                                                onClick={() => setPage((p) => p + 1)}
                                                className="h-8 rounded-lg border border-gray-200 px-3 text-xs font-medium text-gray-600 disabled:opacity-40 hover:enabled:bg-gray-50"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </Card>

                    <p className="text-xs text-gray-400">
                        Only changes made from the admin panel are counted. A customer cancelling their own
                        order, or the courier sync marking one delivered, has no staff member behind it.
                    </p>
                </>
            )}
        </div>
    );
}
