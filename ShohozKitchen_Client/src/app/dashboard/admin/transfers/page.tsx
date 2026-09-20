"use client";

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
    LuPlus, LuArrowRight, LuArrowLeftRight, LuChevronDown, LuEye, LuPencil, LuPackageCheck, LuUndo2, LuBan,
    LuTrash2, LuTruck, LuCircleCheck, LuCircleX, LuTriangleAlert, LuX,
} from 'react-icons/lu';
import {
    PageHeader, Btn, SearchInput, SelectPill, FilterBar, StatTile, Badge, TableCard, TH, TD, TR, EmptyRow,
    SkeletonRows, Pager, RowMenu, type RowMenuItem, cx,
} from '@/components/admin/ui';
import { useGetWarehousesQuery } from '@/redux/api/warehouseApi';
import {
    useGetTransferListQuery, useUpdateTransferMutation, useDeleteTransferMutation,
    type Transfer, type TransferStatus,
} from '@/redux/api/transferApi';
import TransferFormModal from './TransferFormModal';
import ReceiveModal from './ReceiveModal';
import TransferDetailModal from './TransferDetailModal';
import TransferItems from './TransferItems';
import {
    DATE_PILL, PERIODS, TRANSFER_STATUS, daysBetween, dhakaDayOf, dhakaToday, errMsg, fmtDay, periodDays, plural, qty,
    useDebounced, type Period,
} from './shared';

/**
 * Transfers — goods sent from one warehouse to another. Admin-only bookkeeping and a
 * record only: product stock and the Inventory ledger never change here.
 *
 * ?warehouse=<id> pre-selects a warehouse (Warehouses → View transfers);
 * ?status=in_transit|received|cancelled pre-selects a status.
 */

const PAGE_SIZE = 20;
const STATUSES: TransferStatus[] = ['in_transit', 'received', 'cancelled'];
type Direction = 'any' | 'out' | 'in';

// useSearchParams needs a Suspense boundary (Next.js falls back to client rendering up to it).
export default function TransfersPage() {
    return (
        <Suspense fallback={null}>
            <TransfersFromUrl />
        </Suspense>
    );
}

function TransfersFromUrl() {
    const params = useSearchParams();
    const warehouse = params.get('warehouse') || '';
    const status = params.get('status') as TransferStatus | null;
    // A new link (another warehouse) starts the page afresh.
    return (
        <TransfersPageInner
            key={`${warehouse}|${status || ''}`}
            initialWarehouse={/^[a-f\d]{24}$/i.test(warehouse) ? warehouse : ''}
            initialStatus={status && STATUSES.includes(status) ? status : 'all'}
        />
    );
}

function TransfersPageInner({ initialWarehouse, initialStatus }: { initialWarehouse: string; initialStatus: TransferStatus | 'all' }) {
    const [today] = useState(() => dhakaToday());

    /* ─── Filters ─── */
    const [search, setSearch] = useState('');
    const [warehouse, setWarehouse] = useState(initialWarehouse);
    const [direction, setDirection] = useState<Direction>('any');
    const [status, setStatus] = useState<TransferStatus | 'all'>(initialStatus);
    const [period, setPeriod] = useState<Period>('all');
    const [customFrom, setCustomFrom] = useState(() => `${today.slice(0, 7)}-01`);
    const [customTo, setCustomTo] = useState(today);
    const q = useDebounced(search.trim());
    const days = useMemo(() => periodDays(period, today, customFrom, customTo), [period, today, customFrom, customTo]);

    // The page snaps back to 1 whenever a filter changes.
    const filterKey = [q, warehouse, direction, status, days.dateFrom, days.dateTo].join('|');
    const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
    const page = pageState.key === filterKey ? pageState.page : 1;
    const setPage = (p: number) => setPageState({ key: filterKey, page: p });

    const { data: warehouses = [] } = useGetWarehousesQuery({ scope: 'all' });
    // currentData, not data: data keeps the previous filter's rows while the new ones load.
    const { currentData: data, isFetching, isError, refetch } = useGetTransferListQuery({
        search: q || undefined,
        warehouse: warehouse || undefined,
        direction: warehouse && direction !== 'any' ? direction : undefined,
        status: status !== 'all' ? status : undefined,
        dateFrom: days.dateFrom,
        dateTo: days.dateTo,
        page,
        limit: PAGE_SIZE,
    });
    const isLoading = !data && isFetching;
    const failed = !data && !isFetching && isError;
    const rows = data?.data?.transfers || [];
    const summary = data?.data?.summary;
    const meta = data?.meta || { total: 0, totalPages: 1 };

    const filtered = !!q || !!warehouse || period !== 'all' || status !== 'all';
    const clearFilters = () => {
        setSearch(''); setWarehouse(''); setDirection('any'); setStatus('all'); setPeriod('all');
    };

    const warehouseOptions = useMemo(() => {
        const opts = [{ value: '', label: 'All warehouses' }, ...warehouses.map((w) => ({ value: w._id, label: w.isActive ? w.name : `${w.name} (inactive)` }))];
        if (warehouse && !warehouses.some((w) => w._id === warehouse) && warehouses.length) opts.push({ value: warehouse, label: 'Unknown warehouse' });
        return opts;
    }, [warehouses, warehouse]);
    const selectedName = warehouses.find((w) => w._id === warehouse)?.name;

    /* ─── Modals & actions ─── */
    const [form, setForm] = useState<{ key: number; transfer: Transfer | null } | null>(null);
    const [receiving, setReceiving] = useState<Transfer | null>(null);
    const [viewing, setViewing] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
    const [update] = useUpdateTransferMutation();
    const [remove] = useDeleteTransferMutation();

    // A new key each time, so the form starts fresh.
    const openForm = (transfer: Transfer | null) => { setViewing(null); setForm((f) => ({ key: (f?.key || 0) + 1, transfer })); };
    const openReceive = (t: Transfer) => { setViewing(null); setReceiving(t); };
    const toggle = (id: string) => setExpanded((s) => {
        const n = new Set(s);
        if (n.has(id)) n.delete(id); else n.add(id);
        return n;
    });

    const cancelTransfer = async (t: Transfer) => {
        if (!window.confirm(`Cancel ${t.reference}? A cancelled transfer is final — it stays on record but can't be received or edited.`)) return;
        try {
            await update({ id: t._id, status: 'cancelled' }).unwrap();
            toast.success(`${t.reference} cancelled`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not cancel the transfer'));
        }
    };

    const undoReceive = async (t: Transfer) => {
        if (!window.confirm(`Undo receive on ${t.reference}? It goes back to “In transit”.`)) return;
        try {
            await update({ id: t._id, status: 'in_transit' }).unwrap();
            toast.success(`${t.reference} is back in transit`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not update the transfer'));
        }
    };

    const deleteTransfer = async (t: Transfer) => {
        if (!window.confirm(`Delete ${t.reference} (${t.from?.name || '?'} → ${t.to?.name || '?'})? This can't be undone.`)) return;
        try {
            await remove(t._id).unwrap();
            toast.success(`${t.reference} deleted`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not delete the transfer'), { duration: 6000 });
        }
    };

    const menu = (t: Transfer): RowMenuItem[] => [
        { label: 'View details', icon: <LuEye size={15} />, onClick: () => setViewing(t._id) },
        { label: 'Mark received', icon: <LuPackageCheck size={15} />, onClick: () => openReceive(t), hidden: t.status !== 'in_transit' },
        { label: 'Edit', icon: <LuPencil size={15} />, onClick: () => openForm(t), hidden: t.status !== 'in_transit' },
        { label: 'Undo receive', icon: <LuUndo2 size={15} />, onClick: () => undoReceive(t), hidden: t.status !== 'received' },
        { label: 'Cancel transfer', icon: <LuBan size={15} />, onClick: () => cancelTransfer(t), hidden: t.status !== 'in_transit', danger: true },
        { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: () => deleteTransfer(t), hidden: t.status === 'received', danger: true },
    ];

    /* ─── Cells ─── */
    const route = (t: Transfer) => (
        <span className="inline-flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className={cx('min-w-0 [overflow-wrap:anywhere]', t.from?._id === warehouse ? 'font-semibold text-gray-900' : 'text-gray-700')}>{t.from?.name || 'Deleted warehouse'}</span>
            <LuArrowRight size={14} className="shrink-0 text-gray-400" />
            <span className={cx('min-w-0 [overflow-wrap:anywhere]', t.to?._id === warehouse ? 'font-semibold text-gray-900' : 'text-gray-700')}>{t.to?.name || 'Deleted warehouse'}</span>
        </span>
    );

    const itemsToggle = (t: Transfer) => (
        <button
            type="button"
            onClick={() => toggle(t._id)}
            aria-expanded={expanded.has(t._id)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-1 text-sm text-gray-700 transition hover:bg-gray-100"
        >
            <span className="font-medium text-gray-900">{plural(t.items.length, 'item')}</span>
            <span className="text-gray-400">· {qty(t.totalQty)} units</span>
            <LuChevronDown size={14} className={cx('text-gray-400 transition-transform', expanded.has(t._id) && 'rotate-180')} />
        </button>
    );

    const when = (t: Transfer) => {
        if (t.status === 'received') return <span className="text-emerald-600">Received {fmtDay(t.receivedAt)}</span>;
        if (t.status === 'cancelled') return <span className="text-gray-400">Cancelled {fmtDay(t.cancelledAt)}</span>;
        const d = daysBetween(dhakaDayOf(t.transferredAt), today);
        return <span className="text-amber-600">{d <= 0 ? 'Sent today' : `${plural(d, 'day')} on the way`}</span>;
    };

    const emptyContent = (
        <>
            <LuArrowLeftRight size={28} className="mx-auto mb-2 text-gray-300" />
            {filtered ? (
                <>
                    No transfers match these filters.
                    <div className="mt-3"><Btn onClick={clearFilters} icon={<LuX size={14} />}>Clear filters</Btn></div>
                </>
            ) : (
                <>
                    No transfers yet.
                    <div className="mt-3"><Btn variant="primary" icon={<LuPlus size={15} />} onClick={() => openForm(null)}>New transfer</Btn></div>
                </>
            )}
        </>
    );
    const errorContent = (
        <>
            <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
            Couldn&apos;t load the transfers.
            <div className="mt-3"><Btn onClick={() => refetch()}>Retry</Btn></div>
        </>
    );

    const COLS = 7;
    const dash = (v: React.ReactNode) => (summary ? v : '—');
    const pickStatus = (s: TransferStatus | 'all') => setStatus((cur) => (cur === s && s !== 'all' ? 'all' : s));

    return (
        <div>
            <PageHeader
                title="Transfers"
                subtitle="Move stock between warehouses. A transfer is a record only — product stock and the inventory ledger don't change."
                actions={<Btn variant="primary" icon={<LuPlus size={16} />} onClick={() => openForm(null)}>New transfer</Btn>}
            />

            {/* ═══ Status tiles (they filter the table) ═══ */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                    label="All transfers"
                    icon={<LuArrowLeftRight size={16} />}
                    value={dash(qty(summary?.total))}
                    hint={summary ? `${qty(summary.units)} units moved or moving` : undefined}
                    active={status === 'all'}
                    onClick={() => pickStatus('all')}
                />
                <StatTile
                    label="In transit"
                    icon={<LuTruck size={16} />}
                    value={dash(<span className={summary?.inTransit ? 'text-amber-600' : undefined}>{qty(summary?.inTransit)}</span>)}
                    hint={summary ? `${qty(summary.unitsInTransit)} units on the way` : undefined}
                    active={status === 'in_transit'}
                    onClick={() => pickStatus('in_transit')}
                />
                <StatTile
                    label="Received"
                    icon={<LuCircleCheck size={16} />}
                    value={dash(qty(summary?.received))}
                    hint={summary ? `${qty(summary.unitsReceived)} units arrived` : undefined}
                    active={status === 'received'}
                    onClick={() => pickStatus('received')}
                />
                <StatTile
                    label="Cancelled"
                    icon={<LuCircleX size={16} />}
                    value={dash(qty(summary?.cancelled))}
                    hint="Kept on record"
                    active={status === 'cancelled'}
                    onClick={() => pickStatus('cancelled')}
                />
            </div>

            {/* ═══ Filters ═══ */}
            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search reference or product…" />
                <SelectPill ariaLabel="Warehouse" value={warehouse} onChange={(v) => { setWarehouse(v); if (!v) setDirection('any'); }} options={warehouseOptions} className="sm:w-52" />
                {warehouse && (
                    <SelectPill
                        ariaLabel="Direction"
                        value={direction}
                        onChange={(v) => setDirection(v as Direction)}
                        className="sm:w-44"
                        options={[
                            { value: 'any', label: 'In and out' },
                            { value: 'out', label: 'Sent from here' },
                            { value: 'in', label: 'Sent here' },
                        ]}
                    />
                )}
                <SelectPill ariaLabel="Period" value={period} onChange={(v) => setPeriod(v as Period)} options={PERIODS} className="sm:w-40" />
                {period === 'custom' && (
                    <div className="flex items-center gap-2">
                        <input type="date" aria-label="From date" className={cx(DATE_PILL, 'flex-1 sm:flex-none')} value={customFrom} max={today} onChange={(e) => setCustomFrom(e.target.value)} />
                        <span className="text-sm text-gray-400">to</span>
                        <input type="date" aria-label="To date" className={cx(DATE_PILL, 'flex-1 sm:flex-none')} value={customTo} max={today} onChange={(e) => setCustomTo(e.target.value)} />
                    </div>
                )}
                {filtered && (
                    <Btn variant="ghost" icon={<LuX size={14} />} onClick={clearFilters}>Clear</Btn>
                )}
            </FilterBar>

            {selectedName && (
                <p className="-mt-2 mb-4 text-sm text-gray-500">
                    Showing transfers {direction === 'out' ? 'sent from' : direction === 'in' ? 'sent to' : 'to or from'}{' '}
                    <span className="font-medium text-gray-800">{selectedName}</span>.
                </p>
            )}

            {/* ═══ Desktop / tablet: table ═══ */}
            <div className="hidden md:block">
                <TableCard>
                    <table className={cx('w-full', isFetching && !isLoading && 'opacity-60')}>
                        <thead>
                            <tr>
                                <th className={`${TH} w-12`}>#</th>
                                <th className={TH}>Reference</th>
                                <th className={TH}>Route</th>
                                <th className={TH}>Items</th>
                                <th className={TH}>Status</th>
                                <th className={TH}>Transferred</th>
                                <th className={`${TH} w-12`} />
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? <SkeletonRows cols={COLS} />
                                : failed ? <EmptyRow colSpan={COLS}>{errorContent}</EmptyRow>
                                    : rows.length === 0 ? <EmptyRow colSpan={COLS}>{emptyContent}</EmptyRow>
                                        : rows.map((t, i) => (
                                            <React.Fragment key={t._id}>
                                                <tr className={TR}>
                                                    <td className={`${TD} text-gray-400`}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                                    <td className={`${TD} whitespace-nowrap`}>
                                                        <button type="button" onClick={() => setViewing(t._id)} className="font-semibold text-gray-900 hover:text-[var(--color-primary)]">
                                                            {t.reference}
                                                        </button>
                                                        {t.note && <p className="mt-0.5 max-w-[180px] truncate text-xs text-gray-400" title={t.note}>{t.note}</p>}
                                                    </td>
                                                    <td className={`${TD} min-w-[200px]`}>{route(t)}</td>
                                                    <td className={TD}>{itemsToggle(t)}</td>
                                                    <td className={TD}><Badge tone={TRANSFER_STATUS[t.status].tone}>{TRANSFER_STATUS[t.status].label}</Badge></td>
                                                    <td className={`${TD} whitespace-nowrap`}>
                                                        <p className="text-gray-900">{fmtDay(t.transferredAt)}</p>
                                                        <p className="mt-0.5 text-xs">{when(t)}</p>
                                                    </td>
                                                    <td className={`${TD} text-right`}><RowMenu items={menu(t)} /></td>
                                                </tr>
                                                {expanded.has(t._id) && (
                                                    <tr className="bg-gray-50/60">
                                                        <td />
                                                        <td colSpan={COLS - 1} className="px-4 pb-4 pt-1">
                                                            <div className="max-w-2xl"><TransferItems items={t.items} /></div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                        </tbody>
                    </table>
                </TableCard>
            </div>

            {/* ═══ Phone: cards ═══ */}
            <div className={cx('space-y-3 md:hidden', isFetching && !isLoading && 'opacity-60')}>
                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
                        <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                        <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                    </div>
                )) : failed || rows.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
                        {failed ? errorContent : emptyContent}
                    </div>
                ) : rows.map((t) => (
                    <div key={t._id} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <button type="button" onClick={() => setViewing(t._id)} className="font-semibold text-gray-900">{t.reference}</button>
                                <div className="mt-1"><Badge tone={TRANSFER_STATUS[t.status].tone}>{TRANSFER_STATUS[t.status].label}</Badge></div>
                            </div>
                            <RowMenu items={menu(t)} />
                        </div>
                        <div className="mt-3 text-sm">{route(t)}</div>
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-gray-500">
                            <span>Sent {fmtDay(t.transferredAt)}</span>
                            {when(t)}
                        </div>
                        <div className="-mx-2 mt-2 border-t border-gray-100 pt-2">{itemsToggle(t)}</div>
                        {expanded.has(t._id) && <div className="mt-2"><TransferItems items={t.items} /></div>}
                    </div>
                ))}
            </div>

            <Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="transfers" />

            {form && (
                <TransferFormModal
                    key={form.key}
                    transfer={form.transfer}
                    onClose={() => setForm(null)}
                    onCreated={() => {
                        // Make sure the new transfer is visible.
                        if (status !== 'all' && status !== 'in_transit') setStatus('all');
                        if (period !== 'all') setPeriod('all');
                    }}
                />
            )}
            {receiving && <ReceiveModal transfer={receiving} onClose={() => setReceiving(null)} />}
            {viewing && (
                <TransferDetailModal
                    id={viewing}
                    onClose={() => setViewing(null)}
                    onEdit={(t) => openForm(t)}
                    onReceive={(t) => openReceive(t)}
                />
            )}
        </div>
    );
}
