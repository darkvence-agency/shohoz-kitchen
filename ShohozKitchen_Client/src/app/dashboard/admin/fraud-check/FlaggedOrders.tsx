"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
    LuShieldAlert, LuShieldCheck, LuBan, LuRefreshCw, LuExternalLink, LuUndo2, LuChevronDown,
    LuTriangleAlert, LuShieldQuestion,
} from 'react-icons/lu';
import {
    Btn, SearchInput, Segmented, StatTile, TableCard, TH, TD, TR, EmptyRow, SkeletonRows, Pager,
    RowMenu, taka, cx, type RowMenuItem,
} from '@/components/admin/ui';
import {
    useGetFraudFlagsQuery, useGetFraudSummaryQuery, useReviewFraudFlagMutation, useScanFraudOrdersMutation,
    type FraudFlagStatus, type IFraudFlag,
} from '@/redux/api/fraudApi';
import { ClearFlagModal, CancelOrderModal } from './FlagModals';
import {
    errMsg, bdDate, bdDateTime, plural, OrderStatusBadge, FlagStatusBadge, MatchChips, ReturnStatusBadge, orderClosed, closedHint,
} from './shared';

const PAGE_SIZE = 20;
const COLS = 8;
export type StatusFilter = FraudFlagStatus | 'all';

function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}

const orderHref = (id: string) => `/dashboard/admin/orders/${id}`;
const reviewer = (f: IFraudFlag) => [f.reviewedBy?.firstName, f.reviewedBy?.lastName].filter(Boolean).join(' ');

export default function FlaggedOrders({ initialSearch = '', initialStatus = 'review' }: { initialSearch?: string; initialStatus?: StatusFilter }) {
    const [status, setStatus] = useState<StatusFilter>(initialStatus);
    const [search, setSearch] = useState(initialSearch);
    const [page, setPage] = useState(1);
    const q = useDebounced(search);

    const { currentData, isFetching, isError, refetch } = useGetFraudFlagsQuery({
        status, search: q.trim() || undefined, page, limit: PAGE_SIZE,
    });
    const isLoading = !currentData && isFetching;
    const failed = !currentData && !isFetching && isError;
    const rows = currentData?.data || [];
    const meta = currentData?.meta || { total: 0, totalPages: 1 };

    const { data: summaryRes, isLoading: summaryLoading } = useGetFraudSummaryQuery();
    const s = summaryRes?.data;
    const count = (n?: number) => (summaryLoading || n === undefined ? '—' : n.toLocaleString('en-IN'));

    const [scan, { isLoading: scanning }] = useScanFraudOrdersMutation();
    const [review] = useReviewFraudFlagMutation();
    const [clearing, setClearing] = useState<IFraudFlag | null>(null);
    const [cancelling, setCancelling] = useState<IFraudFlag | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
    const toggle = (id: string) => setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });

    const pickStatus = (v: StatusFilter) => { setStatus(v); setPage(1); };

    const runScan = async () => {
        try {
            const { data } = await scan().unwrap();
            if (!data.scanned) toast.success('Every open order has already been checked');
            else toast.success(data.flagged
                ? `Checked ${plural(data.scanned, 'open order')}: ${data.flagged} newly flagged`
                : `Checked ${plural(data.scanned, 'open order')}: no new flags`);
            if (data.closed) toast.success(`Closed ${plural(data.closed, 'flag')} whose order was already cancelled or delivered`);
            if (data.errors) toast.error(`${plural(data.errors, 'order')} couldn’t be checked. Try again later.`);
            if (data.limited) toast('Only the newest open orders were checked this time. Run it again for the rest.', { duration: 6000 });
            if (data.flagged && status !== 'review' && status !== 'all') pickStatus('review');
        } catch (err) {
            toast.error(errMsg(err, 'Couldn’t check the open orders'));
        }
    };

    const backToReview = async (f: IFraudFlag) => {
        try {
            await review({ id: f._id, status: 'review' }).unwrap();
            toast.success(`${f.orderRef} is back in review`);
        } catch (err) {
            toast.error(errMsg(err, 'Couldn’t move the flag back to review'));
        }
    };

    const menu = (f: IFraudFlag): RowMenuItem[] => [
        { label: 'Open order', icon: <LuExternalLink size={15} />, href: f.order ? orderHref(f.order._id) : '#', hidden: !f.order },
        { label: orderClosed(f) ? 'Close flag' : 'Mark cleared', icon: <LuShieldCheck size={15} />, onClick: () => setClearing(f), hidden: f.status !== 'review' },
        { label: 'Back to review', icon: <LuUndo2 size={15} />, onClick: () => backToReview(f), hidden: f.status !== 'cleared' },
        { label: 'Cancel order', icon: <LuBan size={15} />, onClick: () => setCancelling(f), hidden: !f.cancellable, danger: true },
    ];

    const filtered = !!q.trim();
    const emptyText = filtered
        ? 'No flagged orders match this search.'
        : status === 'review'
            ? 'Nothing to review. Orders from customers who returned an order before will show up here.'
            : status === 'cleared' ? 'No cleared flags yet.'
                : status === 'cancelled' ? 'No flagged orders have been cancelled.'
                    : 'No flagged orders yet.';

    const errorBlock = (
        <>
            <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
            Couldn&apos;t load the flagged orders.
            <div className="mt-3"><Btn onClick={() => refetch()}>Try again</Btn></div>
        </>
    );
    const emptyBlock = (
        <>
            <LuShieldCheck size={28} className="mx-auto mb-2 text-gray-300" />
            {emptyText}
        </>
    );

    return (
        <section>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-[17px] font-semibold text-gray-900">Flagged orders</h2>
                    <p className="mt-0.5 max-w-2xl text-sm text-gray-500">
                        New orders from a customer who returned an order before (same phone, email or account) land here as soon as they are placed.
                        A parcel cancelled after it went to the courier (refused at the door) counts as a return.
                        A rejected or still-pending return request doesn&apos;t count.
                    </p>
                </div>
                <Btn icon={<LuRefreshCw size={15} className={scanning ? 'animate-spin' : undefined} />} onClick={runScan} disabled={scanning} className="self-start sm:self-auto">
                    {scanning ? 'Checking…' : 'Re-scan open orders'}
                </Btn>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
                <StatTile label="Needs review" icon={<LuShieldAlert size={16} className="text-amber-500" />} value={count(s?.review)}
                    active={status === 'review'} onClick={() => pickStatus('review')} />
                <StatTile label="Cleared" icon={<LuShieldCheck size={16} className="text-emerald-500" />} value={count(s?.cleared)}
                    active={status === 'cleared'} onClick={() => pickStatus('cleared')} />
                <StatTile label="Cancelled" icon={<LuBan size={16} className="text-red-500" />} value={count(s?.cancelled)}
                    active={status === 'cancelled'} onClick={() => pickStatus('cancelled')} />
            </div>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="max-w-full overflow-x-auto">
                    <Segmented<StatusFilter>
                        value={status}
                        onChange={pickStatus}
                        options={[
                            { value: 'review', label: 'Review' },
                            { value: 'cleared', label: 'Cleared' },
                            { value: 'cancelled', label: 'Cancelled' },
                            { value: 'all', label: 'All' },
                        ]}
                    />
                </div>
                <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search order, name, phone or email…" />
            </div>

            {/* ─── Phones: cards ─── */}
            <div className="space-y-3 md:hidden">
                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-40 animate-pulse rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="h-4 w-24 rounded bg-gray-100" /><div className="mt-3 h-4 w-40 rounded bg-gray-100" /><div className="mt-2 h-4 w-32 rounded bg-gray-100" />
                    </div>
                )) : failed ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">{errorBlock}</div>
                ) : rows.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">{emptyBlock}</div>
                ) : rows.map((f) => (
                    <FlagCard key={f._id} f={f} open={expanded.has(f._id)} onToggle={() => toggle(f._id)} menu={menu(f)} dim={isFetching} />
                ))}
            </div>

            {/* ─── Tablets and up: table ─── */}
            <TableCard className="hidden md:block">
                <table className={cx('w-full', isFetching && !isLoading && 'opacity-60')}>
                    <thead>
                        <tr>
                            <th className={TH}>Order</th>
                            <th className={TH}>Customer</th>
                            <th className={TH}>Previous returns</th>
                            <th className={`${TH} text-right`}>Order total</th>
                            <th className={TH}>Order status</th>
                            <th className={TH}>Flag</th>
                            <th className={TH}>Flagged at</th>
                            <th className={`${TH} w-12`} />
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={COLS} /> : failed ? (
                            <EmptyRow colSpan={COLS}>{errorBlock}</EmptyRow>
                        ) : rows.length === 0 ? (
                            <EmptyRow colSpan={COLS}>{emptyBlock}</EmptyRow>
                        ) : rows.map((f) => {
                            const open = expanded.has(f._id);
                            return (
                                <React.Fragment key={f._id}>
                                    <tr className={cx(TR, open && 'bg-gray-50/70')}>
                                        <td className={`${TD} whitespace-nowrap`}>
                                            <OrderRef f={f} />
                                        </td>
                                        <td className={TD}>
                                            <Customer f={f} />
                                        </td>
                                        <td className={`${TD} whitespace-nowrap`}>
                                            <ReturnsToggle f={f} open={open} onToggle={() => toggle(f._id)} />
                                        </td>
                                        <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gray-900`}>
                                            {f.order ? taka(f.order.total) : '—'}
                                        </td>
                                        <td className={TD}>
                                            {f.order ? <OrderStatusBadge status={f.order.status} /> : <span className="text-xs text-gray-400">Deleted</span>}
                                        </td>
                                        <td className={TD}>
                                            <FlagState f={f} />
                                        </td>
                                        <td className={`${TD} whitespace-nowrap text-gray-500`}>{bdDateTime(f.createdAt)}</td>
                                        <td className={`${TD} text-right`}><RowMenu items={menu(f)} /></td>
                                    </tr>
                                    {open && (
                                        <tr className="bg-gray-50/70">
                                            <td colSpan={COLS} className="px-4 pb-4 pt-0">
                                                <ReturnsList f={f} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </TableCard>

            <Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="flagged orders" />

            {clearing && <ClearFlagModal key={clearing._id} flag={clearing} onClose={() => setClearing(null)} />}
            {cancelling && <CancelOrderModal key={cancelling._id} flag={cancelling} onClose={() => setCancelling(null)} />}
        </section>
    );
}

/* ─── Cells ───────────────────────────────────────────────── */

function OrderRef({ f }: { f: IFraudFlag }) {
    return (
        <div>
            {f.order ? (
                <Link href={orderHref(f.order._id)} className="font-semibold text-gray-900 hover:text-[var(--color-primary)]">{f.orderRef}</Link>
            ) : (
                <span className="font-semibold text-gray-500">{f.orderRef}</span>
            )}
            <p className="mt-0.5 text-xs text-gray-400">
                {f.order ? `Placed ${bdDate(f.order.createdAt)}` : 'Order deleted'}
            </p>
        </div>
    );
}

function Customer({ f }: { f: IFraudFlag }) {
    return (
        <div className="min-w-[180px] max-w-[240px]">
            <p className="truncate font-medium text-gray-900">{f.customer.name || 'Unnamed customer'}</p>
            {f.customer.phone && <p className="text-xs tabular-nums text-gray-500">{f.customer.phone}</p>}
            {f.customer.email && <p className="truncate text-xs text-gray-500" title={f.customer.email}>{f.customer.email}</p>}
            <MatchChips kinds={f.matchedBy} />
        </div>
    );
}

function ReturnsToggle({ f, open, onToggle }: { f: IFraudFlag; open: boolean; onToggle: () => void }) {
    const last = f.previousReturns[0];
    return (
        <button type="button" onClick={onToggle} aria-expanded={open} className="group text-left">
            <span className="inline-flex items-center gap-1 font-semibold text-red-600 group-hover:underline">
                {plural(f.returnCount, 'return')}
                <LuChevronDown size={14} className={cx('transition-transform', open && 'rotate-180')} />
            </span>
            <span className="block text-xs text-gray-400">
                {last?.date ? `Last on ${bdDate(last.date)}` : 'Show details'}
                {f.previousOrderCount > 0 && ` · ${plural(f.previousOrderCount, 'earlier order')}`}
            </span>
        </button>
    );
}

function ReturnsList({ f }: { f: IFraudFlag }) {
    const hidden = f.returnCount - f.previousReturns.length;
    return (
        <div className="rounded-xl border border-gray-200 bg-white">
            <ul className="divide-y divide-gray-100">
                {f.previousReturns.map((r) => (
                    <li key={r.order} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                        <Link href={orderHref(r.order)} className="font-medium text-gray-900 hover:text-[var(--color-primary)]">{r.orderRef}</Link>
                        <ReturnStatusBadge status={r.status} />
                        <span className="text-xs text-gray-500">{bdDate(r.date)}</span>
                        {r.reason && <span className="text-xs text-gray-500">· {r.reason}</span>}
                    </li>
                ))}
            </ul>
            {hidden > 0 && <p className="border-t border-gray-100 px-3 py-2 text-xs text-gray-400">+ {plural(hidden, 'older return')} not listed</p>}
        </div>
    );
}

function FlagState({ f }: { f: IFraudFlag }) {
    const by = reviewer(f);
    return (
        <div className="max-w-[220px]">
            <FlagStatusBadge status={f.status} />
            {orderClosed(f) && <p className="mt-1 text-xs text-gray-500">{closedHint(f)}</p>}
            {f.reviewNote && <p className="mt-1 truncate text-xs text-gray-600" title={f.reviewNote}>{f.reviewNote}</p>}
            {f.reviewedAt && f.status !== 'review' && (
                <p className="mt-0.5 text-xs text-gray-400">{by ? `${by} · ` : ''}{bdDate(f.reviewedAt)}</p>
            )}
        </div>
    );
}

function FlagCard({ f, open, onToggle, menu, dim }: { f: IFraudFlag; open: boolean; onToggle: () => void; menu: RowMenuItem[]; dim: boolean }) {
    return (
        <div className={cx('rounded-2xl border border-gray-200 bg-white p-4 transition-opacity', dim && 'opacity-60')}>
            <div className="flex items-start justify-between gap-2">
                <OrderRef f={f} />
                <div className="flex items-center gap-1">
                    <FlagStatusBadge status={f.status} />
                    <RowMenu items={menu} />
                </div>
            </div>
            <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="truncate font-medium text-gray-900">{f.customer.name || 'Unnamed customer'}</p>
                <p className="break-words text-xs text-gray-500">
                    {[f.customer.phone, f.customer.email].filter(Boolean).join(' · ')}
                </p>
                <MatchChips kinds={f.matchedBy} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {f.order ? <OrderStatusBadge status={f.order.status} /> : <span className="text-xs text-gray-400">Order deleted</span>}
                <span className="text-sm font-semibold tabular-nums text-gray-900">{f.order ? taka(f.order.total) : '—'}</span>
            </div>
            <div className="mt-3">
                <ReturnsToggle f={f} open={open} onToggle={onToggle} />
                {open && <div className="mt-2"><ReturnsList f={f} /></div>}
            </div>
            {orderClosed(f) && <p className="mt-3 text-xs text-gray-500">{closedHint(f)}</p>}
            {f.reviewNote && <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">{f.reviewNote}</p>}
            <p className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                <LuShieldQuestion size={12} /> Flagged {bdDateTime(f.createdAt)}
            </p>
        </div>
    );
}
