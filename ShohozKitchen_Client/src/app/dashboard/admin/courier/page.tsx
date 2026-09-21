/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * Courier — every parcel from "just ordered" to "delivered" or "came back".
 *
 * Each parcel is in exactly one tab, decided on the API (courier.service.ts,
 * TAB_EXPR) for both the list and the counts, so a tab's number always matches
 * what the tab shows. The tabs follow the parcel's life: before the courier
 * (New, Ready to ship), with the courier (Sent, In transit, On hold), finished
 * (Delivered, Returned, Cancelled).
 */
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
    LuTruck, LuRefreshCw, LuPackage, LuExternalLink, LuTriangleAlert, LuX, LuPhone, LuUndo2, LuWallet,
} from 'react-icons/lu';
import {
    useGetCourierPackagesQuery,
    useGetCourierCountsQuery,
    useSyncActiveCourierMutation,
    useBulkBookCourierMutation,
    useBulkRefreshCourierMutation,
    useBookCourierPackageMutation,
    useRefreshCourierStatusMutation,
    useGetCourierBalanceQuery,
    type CourierTab,
    type ICourierPackage,
} from '@/redux/api/courierApi';
import { getStatusConfig, paymentMethodLabel } from '@/lib/orderStatus';
import OrderItemsPreview from '@/components/shared/OrderItemsPreview';
import BookCourierModal from '@/components/admin/courier/BookCourierModal';
import {
    PageHeader, Btn, SearchInput, FilterBar, Badge, TableCard, TH, TD, TR, EmptyRow, SkeletonRows, Pager, cx, taka,
} from '@/components/admin/ui';

const PAGE_SIZE = 20;

type TabKey = CourierTab | 'all';

/** The tabs, in the order a parcel moves through them. */
const TABS: { key: TabKey; label: string; group: string; about: string }[] = [
    { key: 'new', label: 'New', group: 'Before courier', about: 'Placed but not confirmed yet. Call the customer and confirm the order first — only confirmed orders go to the courier.' },
    { key: 'ready', label: 'Ready to ship', group: 'Before courier', about: 'Confirmed and waiting to go out. Book them with Steadfast — the longest-waiting first.' },
    { key: 'sent', label: 'Sent to courier', group: 'With courier', about: 'Booked with Steadfast, waiting for the courier to pick them up.' },
    { key: 'in_transit', label: 'In transit', group: 'With courier', about: 'On the way to the customer. Parcels shipped by hand, without a Steadfast booking, are here too.' },
    { key: 'on_hold', label: 'On hold', group: 'With courier', about: 'The courier is holding these — usually the customer could not be reached. Call them.' },
    { key: 'delivered', label: 'Delivered', group: 'Finished', about: 'Delivered to the customer. Cash on delivery is marked paid automatically.' },
    { key: 'returned', label: 'Returned', group: 'Finished', about: 'Came back from the courier. Any marked “Confirm return” still has to be closed on its order.' },
    { key: 'cancelled', label: 'Cancelled', group: 'Finished', about: 'Cancelled before reaching a courier.' },
    { key: 'all', label: 'All', group: 'Everything', about: 'Every parcel, newest first.' },
];

/** Tabs where parcels can be ticked for a bulk action (book, or sync). */
const BULK_TABS: TabKey[] = ['ready', 'sent', 'in_transit', 'on_hold'];

const FINISHED = ['delivered', 'cancelled', 'returned', 'refunded'];

const daysWaiting = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    return d <= 0 ? 'today' : d === 1 ? '1 day' : `${d} days`;
};

const errMsg = (e: any, fallback: string) => e?.data?.errorMessages?.[0]?.message || e?.data?.message || fallback;

export default function CourierPage() {
    const [tab, setTab] = useState<TabKey>('ready');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selected, setSelected] = useState<Record<string, ICourierPackage>>({});

    const { data, isLoading, isFetching, refetch } = useGetCourierPackagesQuery({
        tab: tab !== 'all' ? tab : undefined,
        search: search || undefined,
        page,
        limit: PAGE_SIZE,
    });
    const { data: countsData, refetch: refetchCounts } = useGetCourierCountsQuery(search ? { search } : undefined);
    const counts = countsData?.data?.counts;
    const attention = countsData?.data?.attention;
    const setup = countsData?.data?.setup;
    const connected = setup?.configured ?? true;   // assume yes until we know, so nothing flashes

    const { data: balanceData } = useGetCourierBalanceQuery(undefined, { skip: !setup?.configured });
    const balance = balanceData?.data?.current_balance;

    const [syncAll, { isLoading: syncingAll }] = useSyncActiveCourierMutation();
    const [bulkBook, { isLoading: booking }] = useBulkBookCourierMutation();
    const [bulkRefresh, { isLoading: refreshing }] = useBulkRefreshCourierMutation();
    const [bookOne, { isLoading: bookingOne }] = useBookCourierPackageMutation();
    const [refreshOne] = useRefreshCourierStatusMutation();
    const [bookTarget, setBookTarget] = useState<ICourierPackage | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);

    const rows: ICourierPackage[] = data?.data || [];
    const meta = data?.meta || { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };
    const active = TABS.find((t) => t.key === tab)!;

    /* ─── Selection ─── */
    const canTick = (p: ICourierPackage) =>
        BULK_TABS.includes(tab) && ((p.tab === 'ready' && !p.booked) || (p.booked && !FINISHED.includes(p.status)));
    const tickable = rows.filter(canTick);
    const selectedList = useMemo(() => Object.values(selected), [selected]);
    const allTicked = tickable.length > 0 && tickable.every((r) => selected[r.packageId]);
    const toggle = (p: ICourierPackage) => setSelected((prev) => {
        const next = { ...prev };
        if (next[p.packageId]) delete next[p.packageId]; else next[p.packageId] = p;
        return next;
    });
    const toggleAll = () => setSelected((prev) => {
        const next = { ...prev };
        if (allTicked) tickable.forEach((r) => delete next[r.packageId]);
        else tickable.forEach((r) => (next[r.packageId] = r));
        return next;
    });
    const clearSelection = () => setSelected({});
    const toBook = selectedList.filter((p) => !p.booked);
    const toSync = selectedList.filter((p) => p.booked);

    const pickTab = (k: TabKey) => { setTab(k); setPage(1); clearSelection(); };

    /* ─── Actions ─── */
    const reload = () => { refetch(); refetchCounts(); };

    const doSyncAll = async () => {
        try {
            const res = await syncAll().unwrap();
            const r = res.data;
            if (!r.total) toast('Nothing is with the courier right now', { icon: 'ℹ️' });
            else toast.success(`Updated ${r.ok} of ${r.total} parcel${r.total === 1 ? '' : 's'} from Steadfast`);
            if (r.failed) toast(`${r.failed} could not be updated — ${r.results.find((x) => !x.ok)?.error || 'try again'}`, { icon: '⚠️', duration: 6000 });
        } catch (e: any) {
            toast.error(errMsg(e, 'Sync failed'));
        }
    };

    const doBulkBook = async () => {
        if (!toBook.length) return;
        try {
            const r = (await bulkBook({ items: toBook.map((p) => ({ orderId: p.orderId, packageId: p.packageId })) }).unwrap()).data;
            toast.success(`Booked ${r.booked} of ${r.total} with Steadfast`);
            if (r.failed) toast(`${r.failed} failed — ${r.results.find((x) => !x.ok)?.error || 'see the order'}`, { icon: '⚠️', duration: 6000 });
            clearSelection();
        } catch (e: any) {
            toast.error(errMsg(e, 'Booking failed'));
        }
    };

    const doBulkSync = async () => {
        if (!toSync.length) return;
        try {
            const r = (await bulkRefresh({ items: toSync.map((p) => ({ orderId: p.orderId, packageId: p.packageId })) }).unwrap()).data;
            toast.success(`Updated ${r.ok} of ${r.total} from Steadfast`);
            const back = r.results.filter((x) => x.needsConfirmation).length;
            if (back) toast(`${back} coming back — confirm the return on each order`, { icon: '↩️', duration: 7000 });
            clearSelection();
        } catch (e: any) {
            toast.error(errMsg(e, 'Sync failed'));
        }
    };

    const confirmBook = async (p: ICourierPackage) => {
        try {
            await bookOne({ orderId: p.orderId, packageId: p.packageId }).unwrap();
            toast.success(`${p.orderNo} booked with Steadfast`);
            setBookTarget(null);
        } catch (e: any) {
            toast.error(errMsg(e, 'Booking failed'));
        }
    };

    const syncOne = async (p: ICourierPackage) => {
        setSyncingId(p.packageId);
        try {
            const res: any = await refreshOne({ orderId: p.orderId, packageId: p.packageId }).unwrap();
            const d = res?.data || res;
            if (d?.needsConfirmation) toast(`${p.orderNo} is coming back — confirm the return on the order`, { icon: '↩️', duration: 7000 });
            else toast.success(`${p.orderNo}: ${d?.courierStatus || 'updated'}`);
        } catch (e: any) {
            toast.error(errMsg(e, 'Sync failed'));
        } finally {
            setSyncingId(null);
        }
    };

    /* ─── One parcel's action, depending on where it is ─── */
    const action = (p: ICourierPackage) => {
        if (p.attention === 'confirm_return') {
            return (
                <Link href={`/dashboard/admin/orders/${p.orderId}`} className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100">
                    <LuUndo2 size={13} /> Confirm return
                </Link>
            );
        }
        if (p.tab === 'new') {
            return (
                <Link href={`/dashboard/admin/orders/${p.orderId}`} className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    <LuPhone size={13} /> Confirm order
                </Link>
            );
        }
        if (p.tab === 'ready') {
            return (
                <Btn
                    variant="primary" icon={<LuTruck size={14} />} className="!h-8 !px-3 !text-xs"
                    disabled={!connected}
                    title={connected ? 'Book with Steadfast' : 'Connect Steadfast first'}
                    onClick={() => setBookTarget(p)}
                >
                    Book courier
                </Btn>
            );
        }
        if (p.booked) {
            return (
                <div className="flex items-center gap-2">
                    <div className="leading-tight">
                        <p className="font-mono text-xs font-semibold text-gray-800">{p.trackingNumber || p.consignmentId}</p>
                        <p className="text-[11px] text-gray-400">Steadfast</p>
                    </div>
                    {!FINISHED.includes(p.status) && (
                        <button
                            type="button"
                            onClick={() => syncOne(p)}
                            disabled={!connected || syncingId === p.packageId}
                            title={connected ? 'Get the latest status from Steadfast' : 'Connect Steadfast first'}
                            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
                        >
                            <LuRefreshCw size={14} className={syncingId === p.packageId ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>
            );
        }
        if (p.tab === 'in_transit') return <span className="text-xs text-gray-400">Sent without a Steadfast booking</span>;
        return <span className="text-xs text-gray-300">—</span>;
    };

    const statusCell = (p: ICourierPackage) => {
        const cfg = getStatusConfig(p.status);
        return (
            <div className="flex flex-col items-start gap-1">
                <span className={cx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', cfg.badgeBg, cfg.badgeText)}>{cfg.label}</span>
                {p.attention === 'on_hold' && <Badge tone="amber">On hold — call customer</Badge>}
                {p.booked && p.courierStatus && p.attention !== 'on_hold' && (
                    <span className="text-[11px] text-gray-400">Courier: {p.courierStatus.replace(/_/g, ' ')}</span>
                )}
                {(p.tab === 'new' || p.tab === 'ready') && (
                    <span className="text-[11px] text-gray-400">Waiting {daysWaiting(p.createdAt)}</span>
                )}
            </div>
        );
    };

    const amountCell = (p: ICourierPackage) => (
        <div className="whitespace-nowrap">
            <p className="font-semibold text-gray-900">{taka(p.subtotal)}</p>
            {p.codAmount > 0
                ? <p className="text-[11px] font-semibold text-emerald-600">Collect {taka(p.codAmount)}</p>
                : <p className="text-[11px] text-gray-400">{paymentMethodLabel(p.paymentMethod)} · paid</p>}
        </div>
    );

    const showTicks = BULK_TABS.includes(tab);
    const COLS = showTicks ? 8 : 7;

    return (
        <div className="space-y-5">
            <PageHeader
                title="Courier"
                subtitle="Every parcel, from a new order to delivered — book with Steadfast and follow each one."
                actions={<>
                    {connected && typeof balance === 'number' && (
                        <span className="inline-flex h-9 items-center gap-2 rounded-full bg-emerald-50 px-4 text-sm font-semibold text-emerald-700">
                            <LuWallet size={15} /> Steadfast {taka(balance)}
                        </span>
                    )}
                    <Btn icon={<LuRefreshCw size={15} className={syncingAll ? 'animate-spin' : ''} />} onClick={doSyncAll} disabled={!connected || syncingAll}
                        title={connected ? 'Get the latest status of every parcel with the courier' : 'Connect Steadfast first'}>
                        {syncingAll ? 'Syncing…' : 'Sync all'}
                    </Btn>
                    <Btn variant="ghost" icon={<LuRefreshCw size={15} className={isFetching ? 'animate-spin' : ''} />} onClick={reload}>Refresh</Btn>
                </>}
            />

            {/* ── Setup: nothing can be booked or tracked without Steadfast ── */}
            {setup && !setup.configured && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <LuTriangleAlert size={18} className="mt-0.5 shrink-0" />
                    <p>
                        <b>Steadfast is not connected.</b> Booking parcels and tracking deliveries will not work until the
                        Steadfast <b>API key</b> and <b>secret key</b> are added to the server. Parcels marked shipped by hand still show here.
                    </p>
                </div>
            )}

            {/* ── What needs someone right now ── */}
            {!!(attention?.confirmReturn || attention?.onHold) && (
                <div className="flex flex-wrap gap-2">
                    {!!attention?.confirmReturn && (
                        <button type="button" onClick={() => pickTab('returned')} className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100">
                            <LuUndo2 size={15} /> {attention.confirmReturn} coming back — confirm the return
                        </button>
                    )}
                    {!!attention?.onHold && (
                        <button type="button" onClick={() => pickTab('on_hold')} className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100">
                            <LuPhone size={15} /> {attention.onHold} on hold — call the customer
                        </button>
                    )}
                </div>
            )}

            {/* ── Tabs, with how many parcels are in each ── */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
                {TABS.map((t) => {
                    const on = tab === t.key;
                    const n = counts?.[t.key];
                    const flag = (t.key === 'returned' && attention?.confirmReturn) || (t.key === 'on_hold' && attention?.onHold);
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => pickTab(t.key)}
                            className={cx(
                                'relative rounded-2xl border bg-white px-3 py-2.5 text-left transition',
                                on ? 'border-[var(--color-primary)] shadow-[0_0_0_3px_rgba(var(--color-primary-rgb),0.12)]' : 'border-gray-200 hover:border-gray-300',
                            )}
                        >
                            <p className="truncate text-[10px] font-medium uppercase tracking-wide text-gray-400">{t.group}</p>
                            <p className={cx('mt-0.5 text-xl font-semibold tabular-nums', on ? 'text-[var(--color-primary)]' : 'text-gray-900')}>
                                {n === undefined ? '–' : n.toLocaleString('en-IN')}
                            </p>
                            <p className="truncate text-xs font-medium text-gray-600">{t.label}</p>
                            {!!flag && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-amber-500" aria-label="Needs attention" />}
                        </button>
                    );
                })}
            </div>
            <p className="-mt-2 text-sm text-gray-500">{active.about}</p>

            <FilterBar>
                <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); clearSelection(); }} placeholder="Search order no, customer, phone, tracking…" />
            </FilterBar>

            {/* ── Bulk actions for ticked parcels ── */}
            {selectedList.length > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl bg-gray-900 px-5 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4 text-sm">
                        <span className="font-semibold">{selectedList.length} selected</span>
                        <span className="text-gray-300">To collect: <b className="text-white">{taka(selectedList.reduce((s, p) => s + (p.codAmount || 0), 0))}</b></span>
                        <button type="button" onClick={clearSelection} className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white"><LuX size={13} /> clear</button>
                    </div>
                    <div className="flex items-center gap-2">
                        {toBook.length > 0 && (
                            <Btn variant="primary" icon={<LuPackage size={15} />} onClick={doBulkBook} disabled={!connected || booking}>
                                {booking ? 'Booking…' : `Book ${toBook.length} with Steadfast`}
                            </Btn>
                        )}
                        {toSync.length > 0 && (
                            <Btn icon={<LuRefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />} onClick={doBulkSync} disabled={!connected || refreshing} className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
                                {refreshing ? 'Syncing…' : `Sync ${toSync.length}`}
                            </Btn>
                        )}
                    </div>
                </div>
            )}

            <TableCard footer={<Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="parcels" />}>
                {/* Desktop */}
                <table className={cx('hidden w-full lg:table', isFetching && !isLoading && 'opacity-60')}>
                    <thead>
                        <tr>
                            {showTicks && (
                                <th className={cx(TH, 'w-10')}>
                                    <input type="checkbox" checked={allTicked} onChange={toggleAll} disabled={!tickable.length} className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]" aria-label="Select all on this page" />
                                </th>
                            )}
                            <th className={TH}>Order</th>
                            <th className={TH}>Items</th>
                            <th className={TH}>Customer</th>
                            <th className={TH}>Amount</th>
                            <th className={TH}>Status</th>
                            <th className={TH}>Courier</th>
                            <th className={cx(TH, 'w-12')} />
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={COLS} /> : rows.length === 0 ? (
                            <EmptyRow colSpan={COLS}>
                                <LuTruck size={28} className="mx-auto mb-2 text-gray-300" />
                                {search ? 'No parcel matches this search.' : 'Nothing here right now.'}
                            </EmptyRow>
                        ) : rows.map((p) => (
                            <tr key={p.packageId} className={cx(TR, selected[p.packageId] && 'bg-[var(--color-primary-lightest)]')}>
                                {showTicks && (
                                    <td className={TD}>
                                        {canTick(p) && <input type="checkbox" checked={!!selected[p.packageId]} onChange={() => toggle(p)} className="h-4 w-4 cursor-pointer accent-[var(--color-primary)]" aria-label={`Select ${p.orderNo}`} />}
                                    </td>
                                )}
                                <td className={TD}>
                                    <Link href={`/dashboard/admin/orders/${p.orderId}`} className="font-semibold text-gray-900 hover:text-[var(--color-primary)]">{p.orderNo}</Link>
                                    <p className="text-[11px] text-gray-400">{new Date(p.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {p.itemCount} item{p.itemCount === 1 ? '' : 's'}</p>
                                </td>
                                <td className={TD}><OrderItemsPreview items={p.items} totalCount={p.itemCount} /></td>
                                <td className={TD}>
                                    <p className="font-medium text-gray-900">{p.customer}</p>
                                    <p className="text-xs text-gray-400">{p.phone}{p.city ? ` · ${p.city}` : ''}</p>
                                </td>
                                <td className={TD}>{amountCell(p)}</td>
                                <td className={TD}>{statusCell(p)}</td>
                                <td className={TD}>{action(p)}</td>
                                <td className={cx(TD, 'text-right')}>
                                    <Link href={`/dashboard/admin/orders/${p.orderId}`} title="Open order" className="inline-flex rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
                                        <LuExternalLink size={15} />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Phone and tablet */}
                <div className="divide-y divide-gray-100 lg:hidden">
                    {showTicks && tickable.length > 0 && (
                        <label className="flex cursor-pointer items-center gap-2 bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-600">
                            <input type="checkbox" checked={allTicked} onChange={toggleAll} className="h-4 w-4 accent-[var(--color-primary)]" /> Select all on this page
                        </label>
                    )}
                    {isLoading ? (
                        [...Array(4)].map((_, i) => <div key={i} className="p-4"><div className="h-24 animate-pulse rounded-xl bg-gray-100" /></div>)
                    ) : rows.length === 0 ? (
                        <div className="px-6 py-12 text-center text-sm text-gray-500">
                            <LuTruck size={28} className="mx-auto mb-2 text-gray-300" />
                            {search ? 'No parcel matches this search.' : 'Nothing here right now.'}
                        </div>
                    ) : rows.map((p) => (
                        <div key={p.packageId} className={cx('space-y-3 p-4', selected[p.packageId] && 'bg-[var(--color-primary-lightest)]')}>
                            <div className="flex items-start gap-3">
                                {showTicks && canTick(p) && (
                                    <input type="checkbox" checked={!!selected[p.packageId]} onChange={() => toggle(p)} className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-primary)]" aria-label={`Select ${p.orderNo}`} />
                                )}
                                <div className="flex min-w-0 flex-1 items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <Link href={`/dashboard/admin/orders/${p.orderId}`} className="font-semibold text-gray-900">{p.orderNo}</Link>
                                        <p className="truncate text-xs text-gray-500">{p.customer} · {p.phone}{p.city ? ` · ${p.city}` : ''}</p>
                                    </div>
                                    {amountCell(p)}
                                </div>
                            </div>
                            <OrderItemsPreview items={p.items} totalCount={p.itemCount} />
                            <div className="flex items-end justify-between gap-3">
                                {statusCell(p)}
                                {action(p)}
                            </div>
                        </div>
                    ))}
                </div>
            </TableCard>

            <BookCourierModal pkg={bookTarget} isBooking={bookingOne} onClose={() => setBookTarget(null)} onConfirm={confirmBook} />
        </div>
    );
}
