"use client";

import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    LuPlus, LuArrowDownLeft, LuArrowUpRight, LuBookOpen, LuPencil, LuEye, LuEyeOff, LuTrash2,
    LuTriangleAlert, LuUsers, LuPiggyBank, LuHandCoins, LuLandmark, LuX,
} from 'react-icons/lu';
import {
    PageHeader, Btn, SearchInput, SelectPill, Segmented, FilterBar, StatTile, Badge, TableCard,
    TH, TD, TR, EmptyRow, SkeletonRows, RowMenu, taka, cx,
} from '@/components/admin/ui';
import {
    useGetInvestorListQuery, useGetInvestorSummaryQuery, useUpdateInvestorMutation, useDeleteInvestorMutation,
    type IInvestor, type IInvestorRow, type IInvestorTx, type InvestorTxType,
} from '@/redux/api/investorApi';
import {
    dhakaToday, fmtDay, fmtRange, presetRange, PERIOD_OPTIONS, type PeriodKey,
    errMsg, useDebounced, DATE_PILL, round2,
} from '../expenses/_components/shared';
import InvestorFormModal from './_components/InvestorFormModal';
import TransactionModal from './_components/TransactionModal';
import LedgerModal from './_components/LedgerModal';

/**
 * Investors — capital put into the business and taken back out. Admin only; it is
 * capital, not income, so nothing here counts as profit.
 */

type Sort = 'name' | 'balance' | 'in' | 'recent';
const SORTS: { value: Sort; label: string }[] = [
    { value: 'name', label: 'Name A–Z' },
    { value: 'balance', label: 'Balance: high to low' },
    { value: 'in', label: 'Money in: high to low' },
    { value: 'recent', label: 'Recent activity' },
];

const money = (n: number) => taka(n, n % 1 ? 2 : 0);

const sorters: Record<Sort, (a: IInvestorRow, b: IInvestorRow) => number> = {
    name: (a, b) => a.name.localeCompare(b.name),
    balance: (a, b) => b.balance - a.balance || a.name.localeCompare(b.name),
    in: (a, b) => b.moneyIn - a.moneyIn || a.name.localeCompare(b.name),
    recent: (a, b) => String(b.lastTransactionAt || '').localeCompare(String(a.lastTransactionAt || '')) || a.name.localeCompare(b.name),
};

type TxState = { investor: { _id: string; name: string }; type: InvestorTxType; tx?: IInvestorTx | null; key: number };

export default function InvestorsPage() {
    /* ─── Filters ─── */
    const [today] = useState(dhakaToday);
    const [period, setPeriod] = useState<PeriodKey>('all');
    const [range, setRange] = useState<{ from?: string; to?: string }>({});
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
    const [sort, setSort] = useState<Sort>('name');
    const q = useDebounced(search);

    const badRange = !!(range.from && range.to && range.from > range.to);
    const hasRange = !!(range.from || range.to);
    const periodLabel = fmtRange(range.from, range.to);

    const list = useGetInvestorListQuery(
        { search: q.trim() || undefined, status, from: range.from, to: range.to },
        { skip: badRange },
    );
    const sum = useGetInvestorSummaryQuery({ from: range.from, to: range.to }, { skip: badRange });

    const rows = useMemo(() => [...(list.currentData || [])].sort(sorters[sort]), [list.currentData, sort]);
    const loading = !list.currentData && list.isFetching;
    const failed = !list.currentData && !list.isFetching && list.isError;
    const summary = sum.currentData;
    const sumLoading = !summary && sum.isFetching;
    const sumFailed = !summary && !sum.isFetching && sum.isError;
    const noSum = sumLoading || sumFailed;
    const retrySum = <button type="button" onClick={() => sum.refetch()} className="font-medium text-[var(--color-primary)] hover:underline">Couldn&apos;t load totals · Retry</button>;

    const totals = useMemo(() => rows.reduce(
        (t, r) => ({ in: round2(t.in + r.moneyIn), out: round2(t.out + r.moneyOut), balance: round2(t.balance + r.balance) }),
        { in: 0, out: 0, balance: 0 },
    ), [rows]);
    const capitalBase = totals.balance > 0 ? totals.balance : 0;

    const choosePeriod = (p: PeriodKey) => {
        setPeriod(p);
        if (p !== 'custom') setRange(presetRange(p, today));
    };
    const setDay = (k: 'from' | 'to', v: string) => {
        setPeriod('custom');
        setRange((r) => ({ ...r, [k]: v || undefined }));
    };
    const filtered = !!q.trim() || status !== 'all';

    /* ─── Modals ─── */
    const [form, setForm] = useState<{ key: number; investor: IInvestor | null } | null>(null);
    const [ledgerId, setLedgerId] = useState<string | null>(null);
    const [txModal, setTxModal] = useState<TxState | null>(null);

    const openTx = (inv: { _id: string; name: string }, type: InvestorTxType, tx?: IInvestorTx | null) =>
        setTxModal((prev) => ({ investor: inv, type, tx, key: (prev?.key ?? 0) + 1 }));

    const openTxFromRow = (r: IInvestorRow, type: InvestorTxType) => {
        // With a period chosen the row balance is as at its end, not today, so only check without one.
        if (!hasRange && type === 'out' && r.balance <= 0) {
            toast.error(`${r.name} has nothing left in the business to pay back`);
            return;
        }
        openTx({ _id: r._id, name: r.name }, type);
    };

    /* ─── Status / delete ─── */
    const [updateInvestor] = useUpdateInvestorMutation();
    const [deleteInvestor] = useDeleteInvestorMutation();

    const toggleActive = async (r: IInvestorRow) => {
        try {
            await updateInvestor({ id: r._id, isActive: !r.isActive }).unwrap();
            toast.success(r.isActive ? `${r.name} marked inactive` : `${r.name} marked active`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not update the investor'));
        }
    };

    const remove = async (r: IInvestorRow) => {
        if (r.totalTransactions > 0) {
            toast.error(`${r.name} has ${r.totalTransactions} transaction${r.totalTransactions === 1 ? '' : 's'} on record. Deactivate instead, or delete them from the ledger first.`, { duration: 6000 });
            return;
        }
        if (!window.confirm(`Delete the investor "${r.name}"? This cannot be undone.`)) return;
        try {
            await deleteInvestor(r._id).unwrap();
            toast.success(`${r.name} deleted`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not delete the investor'));
        }
    };

    const menu = (r: IInvestorRow) => (
        <RowMenu items={[
            { label: 'Add money in', icon: <LuArrowDownLeft size={15} />, onClick: () => openTxFromRow(r, 'in') },
            { label: 'Record money out', icon: <LuArrowUpRight size={15} />, onClick: () => openTxFromRow(r, 'out') },
            { label: 'View ledger', icon: <LuBookOpen size={15} />, onClick: () => setLedgerId(r._id) },
            { label: 'Edit', icon: <LuPencil size={15} />, onClick: () => setForm({ key: Date.now(), investor: r }) },
            r.isActive
                ? { label: 'Deactivate', icon: <LuEyeOff size={15} />, onClick: () => toggleActive(r) }
                : { label: 'Activate', icon: <LuEye size={15} />, onClick: () => toggleActive(r) },
            { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: () => remove(r), danger: true },
        ]} />
    );

    const share = (r: IInvestorRow) => (capitalBase > 0 && r.balance > 0 ? (r.balance / capitalBase) * 100 : 0);

    const emptyState = failed ? (
        <>
            <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
            Couldn&apos;t load the investors.
            <div className="mt-3"><Btn onClick={() => { list.refetch(); sum.refetch(); }}>Retry</Btn></div>
        </>
    ) : badRange ? (
        <>
            <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
            The start date is after the end date.
        </>
    ) : filtered ? (
        <>
            <LuUsers size={28} className="mx-auto mb-2 text-gray-300" />
            No investors match. <button type="button" onClick={() => { setSearch(''); setStatus('all'); }} className="font-medium text-[var(--color-primary)] hover:underline">Clear filters</button>
        </>
    ) : (
        <>
            <LuUsers size={28} className="mx-auto mb-2 text-gray-300" />
            No investors yet. Add the people who have put money into the business.
            <div className="mt-3"><Btn variant="primary" icon={<LuPlus size={15} />} onClick={() => setForm({ key: Date.now(), investor: null })}>Add investor</Btn></div>
        </>
    );

    const COLS = 9;

    return (
        <div>
            <PageHeader
                title="Investors"
                subtitle="Who has put money into the business, and what they have taken back out. This is capital, so none of it counts as profit."
                actions={<Btn variant="primary" icon={<LuPlus size={16} />} onClick={() => setForm({ key: Date.now(), investor: null })}>Add investor</Btn>}
            />

            {/* ═══ Tiles ═══ */}
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <StatTile
                    label="Total put in"
                    icon={<LuPiggyBank size={16} />}
                    value={noSum ? '—' : money(summary?.moneyIn || 0)}
                    hint={sumFailed ? retrySum : hasRange ? periodLabel : 'Since the start'}
                />
                <StatTile
                    label="Total taken out"
                    icon={<LuHandCoins size={16} />}
                    value={noSum ? '—' : money(summary?.moneyOut || 0)}
                    hint={hasRange ? periodLabel : 'Paid back to investors'}
                />
                {hasRange ? (
                    <StatTile
                        label="Net capital added"
                        icon={<LuLandmark size={16} />}
                        value={noSum ? '—' : money(summary?.capital || 0)}
                        hint={summary ? `Capital on ${fmtDay(range.to || today)}: ${money(summary.closingBalance)}` : undefined}
                    />
                ) : (
                    <StatTile
                        label="Capital in the business"
                        icon={<LuLandmark size={16} />}
                        value={noSum ? '—' : money(summary?.closingBalance || 0)}
                        hint={summary ? `${summary.investors} investor${summary.investors === 1 ? '' : 's'} · ${summary.activeInvestors} active` : undefined}
                    />
                )}
            </div>

            {/* ═══ Filters ═══ */}
            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone or email" className="sm:w-64" />
                <Segmented
                    value={status}
                    onChange={setStatus}
                    options={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                />
                <SelectPill ariaLabel="Sort" value={sort} onChange={(v) => setSort(v as Sort)} options={SORTS} className="sm:w-52" />
                <SelectPill
                    ariaLabel="Period"
                    value={period}
                    onChange={(v) => choosePeriod(v as PeriodKey)}
                    options={[{ value: 'all', label: 'All time' }, ...PERIOD_OPTIONS.filter((o) => o.value !== 'all')]}
                    className="sm:w-40"
                />
                {period !== 'all' && (
                    <div className="flex items-center gap-2">
                        <input type="date" aria-label="From" className={DATE_PILL} value={range.from || ''} max={range.to || undefined} onChange={(e) => setDay('from', e.target.value)} />
                        <span className="text-sm text-gray-400">to</span>
                        <input type="date" aria-label="To" className={DATE_PILL} value={range.to || ''} min={range.from || undefined} onChange={(e) => setDay('to', e.target.value)} />
                        <button type="button" aria-label="Clear dates" onClick={() => choosePeriod('all')} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><LuX size={15} /></button>
                    </div>
                )}
            </FilterBar>
            {hasRange && !badRange && (
                <p className="-mt-2 mb-4 text-xs text-gray-500">
                    Money in and out are for {periodLabel}; balances are as on {fmtDay(range.to || today)}.
                </p>
            )}

            {/* ═══ Phone: cards ═══ */}
            <div className="space-y-2 md:hidden">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />)
                ) : rows.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">{emptyState}</div>
                ) : rows.map((r) => (
                    <div key={r._id} className={cx('rounded-2xl border border-gray-200 bg-white p-4', list.isFetching && 'opacity-60')}>
                        <div className="flex items-start justify-between gap-3">
                            <button type="button" onClick={() => setLedgerId(r._id)} className="min-w-0 text-left">
                                <p className="truncate font-medium text-gray-900">{r.name}</p>
                                <p className="mt-0.5 text-xs text-gray-500">{r.phone || 'No phone'}</p>
                            </button>
                            <div className="flex shrink-0 items-center gap-1">
                                <Badge tone={r.isActive ? 'green' : 'gray'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>
                                {menu(r)}
                            </div>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                            <div><p className="text-gray-400">In</p><p className="font-medium tabular-nums text-gray-700">{money(r.moneyIn)}</p></div>
                            <div><p className="text-gray-400">Out</p><p className="font-medium tabular-nums text-gray-700">{money(r.moneyOut)}</p></div>
                            <div className="text-right"><p className="text-gray-400">Balance</p><p className="text-sm font-semibold tabular-nums text-gray-900">{money(r.balance)}</p></div>
                        </div>
                    </div>
                ))}
                {!loading && rows.length > 0 && (
                    <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 text-sm">
                        <span className="text-gray-500">{rows.length} investor{rows.length === 1 ? '' : 's'}</span>
                        <span className="font-semibold tabular-nums text-gray-900">{money(totals.balance)}</span>
                    </div>
                )}
            </div>

            {/* ═══ Desktop / tablet: table ═══ */}
            <div className="hidden md:block">
                <TableCard footer={!loading && rows.length > 0 ? <p className="mt-4 text-sm text-gray-500">{rows.length} investor{rows.length === 1 ? '' : 's'}{filtered ? ' shown' : ''}</p> : undefined}>
                    <table className={cx('w-full', list.isFetching && !loading && 'opacity-60')}>
                        <thead>
                            <tr>
                                <th className={`${TH} w-12`}>#</th>
                                <th className={TH}>Investor</th>
                                <th className={TH}>Phone</th>
                                <th className={`${TH} text-right`}>Money in</th>
                                <th className={`${TH} text-right`}>Money out</th>
                                <th className={`${TH} text-right`}>Balance</th>
                                <th className={`${TH} hidden lg:table-cell`}>Last activity</th>
                                <th className={TH}>Status</th>
                                <th className={`${TH} w-12`} />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <SkeletonRows cols={COLS} rows={6} /> : rows.length === 0 ? (
                                <EmptyRow colSpan={COLS}>{emptyState}</EmptyRow>
                            ) : rows.map((r, i) => {
                                const pct = share(r);
                                return (
                                    <tr key={r._id} className={TR}>
                                        <td className={`${TD} text-gray-400`}>{i + 1}</td>
                                        <td className={TD}>
                                            <button type="button" onClick={() => setLedgerId(r._id)} className="text-left font-medium text-gray-900 hover:text-[var(--color-primary)]">{r.name}</button>
                                            {r.email && <p className="max-w-[240px] truncate text-xs text-gray-400">{r.email}</p>}
                                        </td>
                                        <td className={`${TD} whitespace-nowrap text-gray-500`}>{r.phone || <span className="text-gray-300">—</span>}</td>
                                        <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gray-500`}>{money(r.moneyIn)}</td>
                                        <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gray-500`}>{money(r.moneyOut)}</td>
                                        <td className={`${TD} whitespace-nowrap text-right`}>
                                            <p className="font-semibold tabular-nums text-gray-900">{money(r.balance)}</p>
                                            {pct > 0 && (
                                                <div className="mt-1 flex items-center justify-end gap-1.5" title={`${pct.toFixed(1)}% of the capital shown`}>
                                                    <span className="h-1 w-14 overflow-hidden rounded-full bg-gray-100">
                                                        <span className="block h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.max(3, pct)}%` }} />
                                                    </span>
                                                    <span className="w-9 text-right text-[11px] text-gray-400">{pct.toFixed(pct < 10 ? 1 : 0)}%</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className={`${TD} hidden whitespace-nowrap text-gray-500 lg:table-cell`}>{r.lastTransactionDay ? fmtDay(r.lastTransactionDay) : <span className="text-gray-300">—</span>}</td>
                                        <td className={TD}><Badge tone={r.isActive ? 'green' : 'gray'}>{r.isActive ? 'Active' : 'Inactive'}</Badge></td>
                                        <td className={`${TD} text-right`}>{menu(r)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {!loading && rows.length > 1 && (
                            <tfoot>
                                <tr className="border-t border-gray-200 bg-gray-50/60">
                                    <td className={TD} />
                                    <td className={`${TD} font-medium text-gray-700`} colSpan={2}>Total{filtered ? ' (shown)' : ''}</td>
                                    <td className={`${TD} whitespace-nowrap text-right font-semibold tabular-nums text-gray-700`}>{money(totals.in)}</td>
                                    <td className={`${TD} whitespace-nowrap text-right font-semibold tabular-nums text-gray-700`}>{money(totals.out)}</td>
                                    <td className={`${TD} whitespace-nowrap text-right font-bold tabular-nums text-gray-900`}>{money(totals.balance)}</td>
                                    <td className={`${TD} hidden lg:table-cell`} />
                                    <td className={TD} colSpan={2} />
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </TableCard>
            </div>

            {form && <InvestorFormModal key={form.key} investor={form.investor} onClose={() => setForm(null)} />}
            {ledgerId && (
                <LedgerModal
                    investorId={ledgerId}
                    onClose={() => setLedgerId(null)}
                    onAdd={(type, name) => openTx({ _id: ledgerId, name }, type)}
                    onEdit={(tx, name) => openTx({ _id: ledgerId, name }, tx.type, tx)}
                />
            )}
            {txModal && (
                <TransactionModal
                    key={txModal.key}
                    investor={txModal.investor}
                    type={txModal.type}
                    tx={txModal.tx}
                    onClose={() => setTxModal(null)}
                />
            )}
        </div>
    );
}
