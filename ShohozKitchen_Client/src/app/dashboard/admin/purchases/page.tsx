"use client";

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import {
    LuPlus, LuFileText, LuExternalLink, LuPackageCheck, LuWallet, LuPencil, LuBan, LuTrash2, LuTriangleAlert,
    LuTruck, LuShoppingBag, LuHandCoins, LuClock, LuX,
} from 'react-icons/lu';
import {
    PageHeader, Btn, SearchInput, SelectPill, FilterBar, StatTile, Badge, TableCard, TH, TD, TR, EmptyRow,
    SkeletonRows, Pager, RowMenu, taka, cx, type RowMenuItem,
} from '@/components/admin/ui';
import {
    useGetPurchaseListQuery, useDeletePurchaseMutation, PURCHASE_STATUSES, type PurchaseRow, type PurchaseStatus,
} from '@/redux/api/purchaseApi';
import { useGetSupplierListQuery } from '@/redux/api/supplierApi';
import { errorMessage, qty, useDebounced, usePage } from '@/app/dashboard/admin/inventory/shared';
import {
    PURCHASES_HREF, purchaseHref, statusMeta, shippingLabel, fmtDay, money, dhakaDay, periodDays, PERIODS, type Period,
} from './_components/shared';
import ReceiveModal from './_components/ReceiveModal';
import PaymentModal from './_components/PaymentModal';
import CancelModal from './_components/CancelModal';
import PrintBill from './_components/PrintBill';

const PAGE_SIZE = 20;
const COLS = 9;
const DATE_PILL = 'h-9 min-w-0 rounded-full border border-transparent bg-gray-100 px-4 text-sm text-gray-800 outline-none transition focus:border-[var(--color-primary-border)] focus:bg-white';

// useSearchParams needs a Suspense boundary.
export default function PurchasesPage() {
    return (
        <Suspense fallback={null}>
            <PurchasesInner />
        </Suspense>
    );
}

type Status = 'all' | 'open' | PurchaseStatus;
const isStatus = (s: string | null): s is Status => !!s && (s === 'all' || s === 'open' || (PURCHASE_STATUSES as readonly string[]).includes(s));

function PurchasesInner() {
    const params = useSearchParams();
    const router = useRouter();
    // ?supplier=<id> (from Suppliers) and ?status= pre-select the filters.
    const urlSupplier = params.get('supplier') || '';
    const urlStatus = params.get('status') || '';
    const [supplier, setSupplierState] = useState(urlSupplier);
    const [status, setStatus] = useState<Status>(isStatus(urlStatus) ? urlStatus : 'all');
    // Follow the address when it changes while this page stays mounted (the sidebar link,
    // Back, a link from Suppliers): only the part of it that changed is applied.
    const [seenUrl, setSeenUrl] = useState({ supplier: urlSupplier, status: urlStatus });
    if (seenUrl.supplier !== urlSupplier || seenUrl.status !== urlStatus) {
        setSeenUrl({ supplier: urlSupplier, status: urlStatus });
        if (seenUrl.supplier !== urlSupplier) setSupplierState(urlSupplier);
        if (seenUrl.status !== urlStatus) setStatus(isStatus(urlStatus) ? urlStatus : 'all');
    }
    const [search, setSearch] = useState('');
    const q = useDebounced(search.trim());
    const [today] = useState(() => dhakaDay());
    const [period, setPeriod] = useState<Period>('all');
    const [customFrom, setCustomFrom] = useState(() => `${today.slice(0, 8)}01`);
    const [customTo, setCustomTo] = useState(today);
    const range = useMemo(() => periodDays(period, today, customFrom, customTo), [period, today, customFrom, customTo]);
    const [page, setPage] = usePage(`${supplier}|${status}|${q}|${range.from}|${range.to}`);

    const setSupplier = (v: string) => {
        setSupplierState(v);
        // Keep the address in step, so a refresh or a shared link shows the same list.
        const sp = new URLSearchParams(params.toString());
        if (v) sp.set('supplier', v); else sp.delete('supplier');
        router.replace(`${PURCHASES_HREF}${sp.toString() ? `?${sp}` : ''}`, { scroll: false });
    };

    // currentData: never show the previous filter's rows under new filters.
    const { currentData: data, isFetching, isError, refetch } = useGetPurchaseListQuery({
        search: q || undefined,
        status: status === 'all' ? undefined : status,
        supplier: supplier || undefined,
        from: range.from,
        to: range.to,
        page,
        limit: PAGE_SIZE,
    }, { refetchOnMountOrArgChange: true });
    const isLoading = !data && isFetching;
    const failed = !data && !isFetching && isError;
    const rows = data?.purchases || [];
    const summary = data?.summary;
    const meta = data?.meta || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

    const { data: suppliers = [] } = useGetSupplierListQuery({ scope: 'all' });
    const supplierName = suppliers.find((s) => s._id === supplier)?.name;

    const [deletePurchase] = useDeletePurchaseMutation();
    const [receiving, setReceiving] = useState<string | null>(null);
    const [paying, setPaying] = useState<PurchaseRow | null>(null);
    const [cancelling, setCancelling] = useState<PurchaseRow | null>(null);
    const [blankBill, setBlankBill] = useState(false);

    const remove = async (p: PurchaseRow) => {
        if (!window.confirm(`Delete ${p.reference}? This cannot be undone.`)) return;
        try {
            await deletePurchase(p._id).unwrap();
            toast.success(`${p.reference} deleted`);
        } catch (err) {
            toast.error(errorMessage(err, 'Could not delete the purchase'), { duration: 6000 });
        }
    };

    const menu = (p: PurchaseRow): RowMenuItem[] => {
        const hasReceipts = p.receiptCount > 0 || p.receivedQty > 0;
        const open = p.status === 'confirmed' || p.status === 'partially_received';
        return [
            { label: 'Open', icon: <LuExternalLink size={15} />, href: purchaseHref(p._id) },
            { label: 'Receive goods', icon: <LuPackageCheck size={15} />, onClick: () => setReceiving(p._id), hidden: !open },
            { label: 'Record payment', icon: <LuWallet size={15} />, onClick: () => setPaying(p), hidden: p.status === 'cancelled' || p.due <= 0 },
            { label: 'Edit', icon: <LuPencil size={15} />, href: `${purchaseHref(p._id)}?edit=1` },
            { label: 'Cancel', icon: <LuBan size={15} />, onClick: () => setCancelling(p), hidden: p.status === 'cancelled' || hasReceipts, danger: true },
            { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: () => remove(p), hidden: !(p.status === 'draft' || p.status === 'cancelled') || hasReceipts || p.paymentCount > 0, danger: true },
        ];
    };

    const count = (n?: number) => (typeof n === 'number' ? ` (${n.toLocaleString('en-IN')})` : '');
    const filtered = !!q || status !== 'all' || !!supplier || period !== 'all';
    const clearFilters = () => {
        setSearch('');
        setStatus('all');
        setPeriod('all');
        if (supplier) setSupplier('');
    };

    const paidDue = (p: PurchaseRow) => {
        if (p.status === 'cancelled') {
            return p.paid > 0
                ? <span className="block text-xs text-red-600">refund due from supplier</span>
                : <span className="block text-xs text-gray-400">cancelled</span>;
        }
        return p.due > 0
            ? <span className="block text-xs text-amber-600">due {taka(p.due)}</span>
            : <span className="block text-xs text-emerald-600">settled</span>;
    };

    const eta = (p: PurchaseRow) => {
        if (!p.eta) return <span className="text-gray-300">-</span>;
        const late = (p.status === 'confirmed' || p.status === 'partially_received') && dhakaDay(p.eta) < today;
        return (
            <span className={cx('whitespace-nowrap', late ? 'text-red-600' : 'text-gray-600')}>
                {fmtDay(p.eta)}
                {late && <span className="block text-xs">overdue</span>}
            </span>
        );
    };

    const itemsCell = (p: PurchaseRow) => (
        <>
            <span className="tabular-nums">{p.itemCount}</span>
            {p.status === 'partially_received' && (
                <span className="block whitespace-nowrap text-xs text-gray-400">{qty(p.receivedQty)}/{qty(p.totalQty)} in</span>
            )}
        </>
    );

    return (
        <div>
            <PageHeader
                title="Purchases"
                subtitle="Import orders from suppliers, with costs tracked in RMB and BDT."
                actions={<>
                    <Btn icon={<LuFileText size={15} />} onClick={() => setBlankBill(true)}>Blank bill form</Btn>
                    <Btn variant="primary" icon={<LuPlus size={16} />} href={`${PURCHASES_HREF}/new${supplier ? `?supplier=${supplier}` : ''}`}>New purchase</Btn>
                </>}
            />

            {/* ═══ Tiles (follow supplier + period, not status or search) ═══ */}
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                    label="Total purchased"
                    icon={<LuShoppingBag size={16} />}
                    value={summary ? taka(summary.total) : '—'}
                    hint={summary ? `${qty(summary.count)} placed purchase${summary.count === 1 ? '' : 's'}` : undefined}
                />
                <StatTile
                    label="Paid"
                    icon={<LuHandCoins size={16} />}
                    value={summary ? taka(summary.paid) : '—'}
                    hint={summary && summary.total > 0 ? `${Math.round((summary.paid / summary.total) * 100)}% of the total` : undefined}
                />
                <StatTile
                    label="Due"
                    icon={<LuWallet size={16} />}
                    value={summary ? <span className={summary.due > 0 ? 'text-amber-600' : undefined}>{taka(summary.due)}</span> : '—'}
                    hint="Still owed to suppliers"
                />
                <StatTile
                    label="Open POs"
                    icon={<LuTruck size={16} />}
                    value={summary ? qty(summary.open) : '—'}
                    hint="Goods still to arrive"
                    active={status === 'open'}
                    onClick={() => setStatus(status === 'open' ? 'all' : 'open')}
                />
            </div>

            {/* ═══ Filters ═══ */}
            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search PO no, supplier, invoice…" className="sm:w-72" />
                <SelectPill
                    ariaLabel="Status"
                    value={status}
                    onChange={(v) => setStatus(v as Status)}
                    className="sm:w-52"
                    options={[
                        { value: 'all', label: `All statuses${count(summary?.all)}` },
                        { value: 'open', label: `Open — goods to come${count(summary?.open)}` },
                        ...PURCHASE_STATUSES.map((s) => ({ value: s, label: `${statusMeta(s).label}${count(summary?.byStatus?.[s])}` })),
                    ]}
                />
                <SelectPill
                    ariaLabel="Supplier"
                    value={supplier}
                    onChange={setSupplier}
                    className="sm:w-52"
                    options={[
                        { value: '', label: 'All suppliers' },
                        ...suppliers.map((s) => ({ value: s._id, label: s.isActive ? s.name : `${s.name} (inactive)` })),
                        // A supplier id from the address that isn't in the list (yet) still shows.
                        ...(supplier && !supplierName ? [{ value: supplier, label: 'Selected supplier' }] : []),
                    ]}
                />
                <SelectPill ariaLabel="Period" value={period} onChange={(v) => setPeriod(v as Period)} options={PERIODS} className="sm:w-40" />
                {period === 'custom' && (
                    <div className="flex items-center gap-2">
                        <input type="date" aria-label="From" className={cx(DATE_PILL, 'flex-1 sm:flex-none')} value={customFrom} max={customTo || today} onChange={(e) => setCustomFrom(e.target.value)} />
                        <span className="text-sm text-gray-400">to</span>
                        <input type="date" aria-label="To" className={cx(DATE_PILL, 'flex-1 sm:flex-none')} value={customTo} min={customFrom || undefined} max={today} onChange={(e) => setCustomTo(e.target.value)} />
                    </div>
                )}
                {filtered && (
                    <button type="button" onClick={clearFilters} className="inline-flex h-9 items-center gap-1 self-start rounded-full px-3 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 sm:self-auto">
                        <LuX size={14} /> Clear
                    </button>
                )}
            </FilterBar>

            {/* ═══ Desktop / tablet: table ═══ */}
            <div className="hidden md:block">
                <TableCard footer={<Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="purchases" />}>
                    <table className={cx('w-full', isFetching && !isLoading && 'opacity-60')}>
                        <thead>
                            <tr>
                                <th className={`${TH} w-12`}>#</th>
                                <th className={TH}>Reference</th>
                                <th className={TH}>Supplier</th>
                                <th className={TH}>Status</th>
                                <th className={`${TH} text-right`}>Items</th>
                                <th className={`${TH} text-right`}>Grand total</th>
                                <th className={TH}>Paid / due</th>
                                <th className={TH}>ETA</th>
                                <th className={`${TH} w-12`} />
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? <SkeletonRows cols={COLS} rows={8} /> : failed ? (
                                <EmptyRow colSpan={COLS}>
                                    <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
                                    Couldn&apos;t load the purchases.
                                    <div className="mt-3"><Btn onClick={() => refetch()}>Try again</Btn></div>
                                </EmptyRow>
                            ) : rows.length === 0 ? (
                                <EmptyRow colSpan={COLS}>
                                    <LuTruck size={28} className="mx-auto mb-2 text-gray-300" />
                                    {filtered ? 'No purchases match these filters.' : 'No purchases yet.'}
                                    <div className="mt-3">
                                        {filtered
                                            ? <Btn onClick={clearFilters}>Clear filters</Btn>
                                            : <Btn variant="primary" icon={<LuPlus size={15} />} href={`${PURCHASES_HREF}/new`}>Record your first purchase</Btn>}
                                    </div>
                                </EmptyRow>
                            ) : rows.map((p, i) => {
                                const st = statusMeta(p.status);
                                return (
                                    <tr key={p._id} className={TR}>
                                        <td className={`${TD} text-gray-400`}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                        <td className={TD}>
                                            <Link href={purchaseHref(p._id)} className="font-semibold text-gray-900 hover:text-[var(--color-primary)]">{p.reference}</Link>
                                            <p className="whitespace-nowrap text-xs text-gray-400">
                                                {[shippingLabel(p.shippingMode), fmtDay(p.orderDate)].filter(Boolean).join(' · ')}
                                            </p>
                                        </td>
                                        <td className={`${TD} text-gray-600`}>
                                            <p className="max-w-[240px] truncate" title={p.supplier?.name}>{p.supplier?.name || '—'}</p>
                                            {p.supplierInvoice && <p className="max-w-[240px] truncate text-xs text-gray-400">Inv {p.supplierInvoice}</p>}
                                        </td>
                                        <td className={TD}><Badge tone={st.tone}>{st.label}</Badge></td>
                                        <td className={`${TD} text-right`}>{itemsCell(p)}</td>
                                        <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>
                                            <span className={cx('font-medium', p.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-900')}>{taka(p.grandTotal)}</span>
                                            {p.currency !== 'BDT' && <span className="block text-xs text-gray-400">{money(p.subtotal, p.currency)} goods</span>}
                                        </td>
                                        <td className={`${TD} whitespace-nowrap tabular-nums`}>
                                            <span className="text-gray-900">{taka(p.paid)}</span>
                                            {paidDue(p)}
                                        </td>
                                        <td className={TD}>{eta(p)}</td>
                                        <td className={`${TD} text-right`}><RowMenu items={menu(p)} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </TableCard>
            </div>

            {/* ═══ Phone: cards ═══ */}
            <div className={cx('space-y-3 md:hidden', isFetching && !isLoading && 'opacity-60')}>
                {isLoading ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-32 animate-pulse rounded-2xl border border-gray-200 bg-white" />
                )) : failed ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                        <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
                        Couldn&apos;t load the purchases.
                        <div className="mt-3"><Btn onClick={() => refetch()}>Try again</Btn></div>
                    </div>
                ) : rows.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                        <LuTruck size={28} className="mx-auto mb-2 text-gray-300" />
                        {filtered ? 'No purchases match these filters.' : 'No purchases yet.'}
                    </div>
                ) : rows.map((p) => {
                    const st = statusMeta(p.status);
                    return (
                        <div key={p._id} className="rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="flex items-start gap-2">
                                <Link href={purchaseHref(p._id)} className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-900">{p.reference}</p>
                                    <p className="truncate text-xs text-gray-400">
                                        {[p.supplier?.name, shippingLabel(p.shippingMode), fmtDay(p.orderDate)].filter(Boolean).join(' · ')}
                                    </p>
                                </Link>
                                <Badge tone={st.tone}>{st.label}</Badge>
                                <RowMenu items={menu(p)} />
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-sm">
                                <div>
                                    <p className="text-xs text-gray-400">Grand total</p>
                                    <p className="font-medium tabular-nums text-gray-900">{taka(p.grandTotal)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Paid</p>
                                    <p className="tabular-nums text-gray-900">{taka(p.paid)}</p>
                                    {paidDue(p)}
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">Items · ETA</p>
                                    <p className="text-gray-700">{p.itemCount} · {p.eta ? fmtDay(p.eta) : '—'}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {!isLoading && rows.length > 0 && (
                    <Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="purchases" />
                )}
            </div>

            <p className="mt-6 flex items-start gap-2 text-xs text-gray-400">
                <LuClock size={14} className="mt-px shrink-0" />
                <span>
                    Dates are Bangladesh time and filter by order date. The tiles count placed purchases only — drafts and cancelled ones are left out.
                </span>
            </p>

            {receiving && <ReceiveModal id={receiving} onClose={() => setReceiving(null)} />}
            {paying && <PaymentModal purchase={paying} onClose={() => setPaying(null)} />}
            {cancelling && <CancelModal purchase={cancelling} onClose={() => setCancelling(null)} />}
            {blankBill && <PrintBill onClose={() => setBlankBill(false)} />}
        </div>
    );
}
