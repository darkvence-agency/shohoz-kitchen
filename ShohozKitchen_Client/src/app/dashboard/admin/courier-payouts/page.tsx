"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    LuPackage, LuFileText, LuPencilLine, LuPencil, LuTrash2, LuList, LuWallet, LuHandCoins, LuTruck, LuReceipt, LuTriangleAlert,
} from 'react-icons/lu';
import {
    PageHeader, Btn, SearchInput, SelectPill, FilterBar, StatTile, Badge, Card, TableCard,
    TH, TD, TR, EmptyRow, SkeletonRows, Pager, RowMenu, taka, fmtDate, fmtDateTime, cx,
} from '@/components/admin/ui';
import {
    useGetCourierPayoutsQuery,
    usePullSteadfastPayoutMutation,
    useDeleteCourierPayoutMutation,
    type ICourierPayout,
    type PayoutSource,
} from '@/redux/api/payoutApi';
import { useGetCourierBalanceQuery } from '@/redux/api/courierApi';
import PayoutFormModal, { errMsg } from './PayoutFormModal';
import StatementModal from './StatementModal';
import DeliveryEconomics from './DeliveryEconomics';

const PAGE_SIZE = 20;

/* ─── Periods (computed in the browser's own time zone) ─── */

type Period = 'this_month' | 'last_month' | 'last_30' | 'last_90' | 'this_year' | 'all' | 'custom';

const PERIODS: { value: Period; label: string }[] = [
    { value: 'this_month', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
    { value: 'last_30', label: 'Last 30 days' },
    { value: 'last_90', label: 'Last 90 days' },
    { value: 'this_year', label: 'This year' },
    { value: 'all', label: 'All time' },
    { value: 'custom', label: 'Custom range' },
];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseYmd = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return y && m && d ? new Date(y, m - 1, d) : null;
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** [from, to) for a period; both undefined = all time. */
function periodRange(p: Period, today: Date, customFrom: string, customTo: string): { from?: Date; to?: Date } {
    const y = today.getFullYear();
    const m = today.getMonth();
    const start = new Date(y, m, today.getDate());
    switch (p) {
        case 'this_month': return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1) };
        case 'last_month': return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1) };
        case 'last_30': return { from: addDays(start, -29), to: addDays(start, 1) };
        case 'last_90': return { from: addDays(start, -89), to: addDays(start, 1) };
        case 'this_year': return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
        case 'custom': {
            const f = parseYmd(customFrom);
            const t = parseYmd(customTo);
            return { from: f || undefined, to: t ? addDays(t, 1) : undefined };
        }
        default: return {};
    }
}

function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}

const DATE_PILL = 'h-9 rounded-full border border-transparent bg-gray-100 px-4 text-sm text-gray-800 outline-none transition focus:border-[var(--color-primary-border)] focus:bg-white';
const pct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}% of COD` : undefined);

export default function CourierPayoutsPage() {
    /* ─── Filters ─── */
    const [today] = useState(() => new Date());
    const [period, setPeriod] = useState<Period>('this_month');
    const [customFrom, setCustomFrom] = useState(() => ymd(new Date(today.getFullYear(), today.getMonth(), 1)));
    const [customTo, setCustomTo] = useState(() => ymd(today));
    const [source, setSource] = useState<'all' | PayoutSource>('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const q = useDebounced(search);

    const range = useMemo(() => periodRange(period, today, customFrom, customTo), [period, today, customFrom, customTo]);
    // currentData, not data: data keeps the previous period's figures while the new period
    // loads (or after it fails), which would show old money under the new period.
    const { currentData: data, isFetching, isError, refetch } = useGetCourierPayoutsQuery({
        from: range.from?.toISOString(),
        to: range.to?.toISOString(),
        source: source !== 'all' ? source : undefined,
        search: q.trim() || undefined,
        page,
        limit: PAGE_SIZE,
    });
    const isLoading = !data && isFetching;
    const failed = !data && !isFetching && isError;
    const rows = data?.data?.payouts || [];
    const summary = data?.data?.summary;
    const economics = data?.data?.economics;
    const meta = data?.meta || { total: 0, totalPages: 1 };

    const { data: balanceData, isError: balanceError } = useGetCourierBalanceQuery();
    const balance: number | undefined = balanceError ? undefined : balanceData?.data?.current_balance;

    /* ─── Pull from Steadfast ─── */
    const [paymentId, setPaymentId] = useState('');
    const [pull, { isLoading: pulling }] = usePullSteadfastPayoutMutation();

    const handlePull = async (e: React.FormEvent) => {
        e.preventDefault();
        const id = paymentId.trim();
        if (!id) { toast.error('Enter the Steadfast payment id first'); return; }
        try {
            const res = await pull({ paymentId: id }).unwrap();
            const p = res.data.payout;
            toast.success(`${p.reference}: ${taka(p.amount)} received on ${fmtDate(p.receivedAt)}`);
            res.data.warnings?.forEach((w) => toast(w, { duration: 7000 }));
            setPaymentId('');
            // A statement from outside the period would otherwise vanish from view.
            const at = new Date(p.receivedAt);
            if ((range.from && at < range.from) || (range.to && at >= range.to)) { setPeriod('all'); setPage(1); }
        } catch (err) {
            toast.error(errMsg(err, 'Could not pull that statement'), { duration: 7000 });
        }
    };

    /* ─── Record / edit / view / delete ─── */
    const [form, setForm] = useState<{ key: number; payout: ICourierPayout | null } | null>(null);
    const openForm = (payout: ICourierPayout | null) => setForm({ key: Date.now(), payout });
    const [viewing, setViewing] = useState<string | null>(null);
    const [deletePayout] = useDeleteCourierPayoutMutation();

    const handleDelete = async (p: ICourierPayout) => {
        if (!window.confirm(`Delete ${p.reference || 'this payout'} (${taka(p.amount)})? Its figures leave every total on this page.`)) return;
        try {
            await deletePayout(p._id).unwrap();
            toast.success('Payout deleted');
        } catch (err) {
            toast.error(errMsg(err, 'Failed to delete the payout'));
        }
    };

    const filtered = !!q.trim() || source !== 'all';
    const COLS = 9;

    return (
        <div>
            <PageHeader
                title="Courier payouts"
                subtitle="Money Steadfast has sent you. Customers pay cash at the door, and this page tracks that cash reaching your bank."
                actions={<Btn href="/dashboard/admin/courier" icon={<LuPackage size={15} />}>Parcels</Btn>}
            />

            {/* ═══ Pull / record ═══ */}
            <div className="mb-6 grid gap-3 md:grid-cols-2">
                <Card
                    title="Pull from Steadfast"
                    description="Got a payment id from Steadfast? Enter it and we fill in their figures for you. You will find the id on their portal, or on the bank line for the transfer."
                    className="flex flex-col"
                >
                    <form onSubmit={handlePull} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                            aria-label="Steadfast payment id"
                            value={paymentId}
                            onChange={(e) => setPaymentId(e.target.value)}
                            placeholder="SFC-…"
                            className="h-9 w-full rounded-full border border-transparent bg-gray-100 px-4 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[var(--color-primary-border)] focus:bg-white focus:shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)] sm:w-56"
                        />
                        <Btn type="submit" variant="primary" icon={<LuFileText size={15} />} disabled={pulling || !paymentId.trim()}>
                            {pulling ? 'Pulling…' : 'Pull statement'}
                        </Btn>
                    </form>
                    {balance !== undefined && (
                        <p className="mt-3 text-xs text-gray-500">
                            Waiting at Steadfast, not paid out yet: <span className="font-semibold text-gray-800">{taka(balance)}</span>
                        </p>
                    )}
                </Card>
                <Card
                    title="Record manually"
                    description="Money came in that is not on one of their statements? Type it in yourself."
                >
                    <Btn icon={<LuPencilLine size={15} />} onClick={() => openForm(null)}>Record a payout</Btn>
                </Card>
            </div>

            {/* ═══ Period ═══ */}
            <FilterBar className="mb-4">
                <SelectPill
                    ariaLabel="Period"
                    value={period}
                    onChange={(v) => { setPeriod(v as Period); setPage(1); }}
                    options={PERIODS}
                    className="sm:w-44"
                />
                {period === 'custom' && (
                    <div className="flex items-center gap-2">
                        <input type="date" aria-label="From" className={DATE_PILL} value={customFrom} max={customTo || undefined} onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }} />
                        <span className="text-sm text-gray-400">to</span>
                        <input type="date" aria-label="To" className={DATE_PILL} value={customTo} min={customFrom || undefined} onChange={(e) => { setCustomTo(e.target.value); setPage(1); }} />
                    </div>
                )}
                {summary && (
                    <p className="text-sm text-gray-500 sm:ml-2">
                        {summary.count.toLocaleString('en-IN')} payout{summary.count === 1 ? '' : 's'}
                        {summary.lastReceivedAt && <> · last one {fmtDate(summary.lastReceivedAt)}</>}
                    </p>
                )}
            </FilterBar>

            {/* ═══ Summary ═══ */}
            <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                    label="Received"
                    icon={<LuWallet size={16} />}
                    value={summary ? taka(summary.received) : '—'}
                    hint={summary ? `${summary.steadfast} from statements · ${summary.manual} manual` : undefined}
                />
                <StatTile
                    label="COD collected"
                    icon={<LuHandCoins size={16} />}
                    value={summary ? taka(summary.codCollected) : '—'}
                    hint={summary?.parcels ? `${summary.parcels.toLocaleString('en-IN')} parcels on statements` : 'Cash taken at the door'}
                />
                <StatTile
                    label="Delivery bills"
                    icon={<LuTruck size={16} />}
                    value={summary ? taka(summary.deliveryBills) : '—'}
                    hint={summary ? pct(summary.deliveryBills, summary.codCollected) : undefined}
                />
                <StatTile
                    label="COD fees"
                    icon={<LuReceipt size={16} />}
                    value={summary ? taka(summary.codFee) : '—'}
                    hint={summary ? pct(summary.codFee, summary.codCollected) : undefined}
                />
            </div>

            <DeliveryEconomics e={economics} loading={isLoading} />
            <p className="mb-8 text-xs text-gray-400">
                Steadfast pays a few days after it delivers, so a short period may not line up exactly. Only payouts recorded on this page count.
            </p>

            {/* ═══ Payouts received ═══ */}
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h2 className="text-[15px] font-semibold text-gray-900">Payouts received</h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                        COD collected, delivery bills and COD fee are Steadfast&apos;s own numbers, not ours. What they collected, minus the two charges, is the amount they sent.
                    </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search reference or note…" className="sm:w-64" />
                    <SelectPill
                        ariaLabel="Source"
                        value={source}
                        onChange={(v) => { setSource(v as 'all' | PayoutSource); setPage(1); }}
                        className="sm:w-40"
                        options={[
                            { value: 'all', label: 'All sources' },
                            { value: 'steadfast', label: 'Steadfast' },
                            { value: 'manual', label: 'Manual' },
                        ]}
                    />
                </div>
            </div>

            <TableCard footer={<Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="payouts" />}>
                <table className={cx('w-full', isFetching && !isLoading && 'opacity-60')}>
                    <thead>
                        <tr>
                            <th className={TH}>Received</th>
                            <th className={TH}>Source</th>
                            <th className={TH}>Reference</th>
                            <th className={`${TH} text-right`}>COD collected</th>
                            <th className={`${TH} text-right`}>Delivery bills</th>
                            <th className={`${TH} text-right`}>COD fee</th>
                            <th className={`${TH} text-right`}>Amount</th>
                            <th className={TH}>Note</th>
                            <th className={`${TH} w-12`} />
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={COLS} /> : failed ? (
                            <EmptyRow colSpan={COLS}>
                                <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
                                Couldn&apos;t load the payouts for this period.
                                <div className="mt-3"><Btn onClick={() => refetch()}>Try again</Btn></div>
                            </EmptyRow>
                        ) : rows.length === 0 ? (
                            <EmptyRow colSpan={COLS}>
                                <LuWallet size={28} className="mx-auto mb-2 text-gray-300" />
                                {filtered
                                    ? 'No payouts match these filters.'
                                    : 'No payouts in this period yet. Pull a statement from Steadfast, or record one manually.'}
                            </EmptyRow>
                        ) : rows.map((p) => (
                            <tr key={p._id} className={TR}>
                                <td className={`${TD} whitespace-nowrap text-gray-900`}>{fmtDateTime(p.receivedAt)}</td>
                                <td className={TD}>
                                    {p.source === 'steadfast' ? <Badge tone="gray">Steadfast</Badge> : <Badge tone="sky">Manual</Badge>}
                                </td>
                                <td className={`${TD} whitespace-nowrap`}>
                                    {p.reference
                                        ? p.source === 'steadfast'
                                            ? <button type="button" onClick={() => setViewing(p._id)} className="text-gray-500 hover:text-[var(--color-primary)]" title="View the parcels on this statement">{p.reference}</button>
                                            : <span className="text-gray-500">{p.reference}</span>
                                        : <span className="text-gray-300">—</span>}
                                    {p.parcelCount > 0 && <p className="mt-0.5 text-xs text-gray-400">{p.parcelCount} parcel{p.parcelCount === 1 ? '' : 's'}</p>}
                                </td>
                                <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gray-500`}>{p.codCollected ? taka(p.codCollected) : '—'}</td>
                                <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gray-500`}>{p.deliveryBills ? taka(p.deliveryBills) : '—'}</td>
                                <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gray-500`}>{p.codFee ? taka(p.codFee) : '—'}</td>
                                <td className={`${TD} whitespace-nowrap text-right font-semibold tabular-nums text-gray-900`}>{taka(p.amount)}</td>
                                <td className={TD}>
                                    <p className="max-w-[220px] truncate text-gray-500" title={p.note || undefined}>{p.note || ''}</p>
                                </td>
                                <td className={`${TD} text-right`}>
                                    <RowMenu items={[
                                        { label: 'View parcels', icon: <LuList size={15} />, onClick: () => setViewing(p._id), hidden: p.source !== 'steadfast' },
                                        { label: 'Edit', icon: <LuPencil size={15} />, onClick: () => openForm(p) },
                                        { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: () => handleDelete(p), danger: true },
                                    ]} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </TableCard>

            {form && <PayoutFormModal key={form.key} payout={form.payout} onClose={() => setForm(null)} />}
            {viewing && <StatementModal id={viewing} onClose={() => setViewing(null)} />}
        </div>
    );
}
