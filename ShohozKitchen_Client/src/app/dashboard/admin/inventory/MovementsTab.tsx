"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { LuHistory, LuX } from 'react-icons/lu';
import {
    SearchInput, SelectPill, FilterBar, Badge, Btn, TableCard, TH, TD, TR, EmptyRow, SkeletonRows, Pager, taka, fmtDateTime, cx,
} from '@/components/admin/ui';
import { useGetStockMovementsQuery, MOVEMENT_TYPES, type MovementType, type StockMovement } from '@/redux/api/inventoryApi';
import { MOVEMENT, unitShort, qty, signed, editProductHref, errorMessage, useDebounced, usePage } from './shared';

const PAGE_SIZE = 25;
const COLS = 8;

// Styled like SelectPill so the date range sits in the same filter row.
const DATE_PILL = 'h-9 rounded-full border border-transparent bg-gray-100 px-4 text-sm text-gray-800 outline-none transition focus:border-[var(--color-primary-border)] focus:bg-white';

/** Order rows are noted "Order SK-1042 cancelled by the customer"; the order number is already a link. */
const noteText = (m: StockMovement) => (m.order ? (m.note || '').replace(/^Order\s+\S+\s*/, '') : m.note || '');

function byLabel(m: StockMovement) {
    const u = m.createdBy;
    if (!u) return <span className="text-gray-400">System</span>;
    const name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown';
    return (
        <span className="whitespace-nowrap">
            {name}
            {u.role === 'user' && <span className="block text-xs text-gray-400">Customer</span>}
        </span>
    );
}

export default function MovementsTab({ product, onClearProduct }: {
    /** Set from a Stock row's "Movements" action — shows only that product. */
    product: { _id: string; name: string } | null;
    onClearProduct: () => void;
}) {
    const [search, setSearch] = useState('');
    const q = useDebounced(search.trim());
    const [type, setType] = useState<'' | MovementType>('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [page, setPage] = usePage(`${product?._id}|${q}|${type}|${from}|${to}`);

    const { data, isLoading, isFetching, isError, error, refetch } = useGetStockMovementsQuery(
        {
            product: product?._id,
            search: product ? undefined : q || undefined,
            type: type || undefined,
            from: from || undefined,
            to: to || undefined,
            page,
            limit: PAGE_SIZE,
        },
        { refetchOnMountOrArgChange: true },
    );
    const rows = data?.data || [];
    const meta = data?.meta || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };
    const filtered = !!(product || q || type || from || to);

    const clearAll = () => {
        setSearch('');
        setType('');
        setFrom('');
        setTo('');
        if (product) onClearProduct();
    };

    return (
        <>
            <FilterBar>
                {product ? (
                    <span className="inline-flex h-9 max-w-full items-center gap-2 rounded-full bg-[var(--color-primary-lightest)] pl-4 pr-1.5 text-sm text-gray-800">
                        <span className="truncate">{product.name}</span>
                        <button type="button" aria-label="Show all products" onClick={onClearProduct}
                            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-white hover:text-gray-800">
                            <LuX size={14} />
                        </button>
                    </span>
                ) : (
                    <SearchInput value={search} onChange={setSearch} placeholder="Search product / SKU…" />
                )}
                <SelectPill
                    ariaLabel="Movement type"
                    value={type}
                    onChange={(v) => setType(v as '' | MovementType)}
                    className="sm:w-48"
                    options={[{ value: '', label: 'All movements' }, ...MOVEMENT_TYPES.map((t) => ({ value: t, label: MOVEMENT[t].label }))]}
                />
                <div className="flex items-center gap-2">
                    <input type="date" aria-label="From date" className={DATE_PILL} value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                    <span className="text-gray-400">–</span>
                    <input type="date" aria-label="To date" className={DATE_PILL} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                </div>
                {filtered && <Btn variant="ghost" onClick={clearAll}>Clear</Btn>}
            </FilterBar>

            <TableCard
                footer={<Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="movements" />}
            >
                <table className={cx('w-full', isFetching && !isLoading && 'opacity-60')}>
                    <thead>
                        <tr>
                            <th className={TH}>Date</th>
                            <th className={TH}>Product</th>
                            {/* Warehouse column goes here once warehouses exist. */}
                            <th className={TH}>Type</th>
                            <th className={`${TH} text-right`}>Qty</th>
                            <th className={`${TH} text-right`}>Balance</th>
                            <th className={`${TH} text-right`}>Unit cost</th>
                            <th className={TH}>Note</th>
                            <th className={TH}>By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={COLS} /> : isError ? (
                            <EmptyRow colSpan={COLS}>
                                <p>{errorMessage(error, 'Could not load stock movements.')}</p>
                                <Btn className="mt-3" onClick={() => refetch()}>Try again</Btn>
                            </EmptyRow>
                        ) : rows.length === 0 ? (
                            <EmptyRow colSpan={COLS}>
                                <LuHistory size={28} className="mx-auto mb-2 text-gray-300" />
                                {filtered ? 'No movements match these filters.' : (
                                    <span className="mx-auto block max-w-md">
                                        No stock movements yet. From now on every stock-in, sale, cancellation, return and adjustment is recorded here.
                                    </span>
                                )}
                            </EmptyRow>
                        ) : rows.map((m) => {
                            const kind = MOVEMENT[m.type] || { label: m.type, tone: 'gray' as const };
                            const unit = unitShort(m.product?.unit);
                            return (
                                <tr key={m._id} className={TR}>
                                    <td className={`${TD} whitespace-nowrap text-gray-500`}>{fmtDateTime(m.createdAt)}</td>
                                    <td className={TD}>
                                        <div className="min-w-[200px]">
                                            {m.product ? (
                                                <Link href={editProductHref(m.product._id)} className="line-clamp-1 font-medium text-gray-900 hover:text-[var(--color-primary)]">
                                                    {m.product.name}
                                                </Link>
                                            ) : <span className="text-gray-400">Deleted product</span>}
                                            <p className="mt-0.5 text-xs text-gray-400">
                                                {[m.variant?.label, m.product?.sku].filter(Boolean).join(' · ') || '—'}
                                            </p>
                                        </div>
                                    </td>
                                    <td className={TD}><Badge tone={kind.tone}>{kind.label}</Badge></td>
                                    <td className={cx(TD, 'whitespace-nowrap text-right font-semibold',
                                        m.quantity > 0 ? 'text-emerald-600' : m.quantity < 0 ? 'text-red-600' : 'text-gray-400')}>
                                        {signed(m.quantity)}
                                    </td>
                                    <td className={`${TD} whitespace-nowrap text-right`}>
                                        <span className="text-gray-900">{qty(m.balanceAfter)}</span>{' '}
                                        <span className="text-xs text-gray-400">{unit}</span>
                                        {m.variant && typeof m.variantBalanceAfter === 'number' && (
                                            <span className="block text-xs text-gray-400">{m.variant.label}: {qty(m.variantBalanceAfter)}</span>
                                        )}
                                    </td>
                                    <td className={`${TD} whitespace-nowrap text-right text-gray-500`}>
                                        {typeof m.unitCost === 'number' && m.unitCost > 0 ? taka(m.unitCost, 2) : <span className="text-gray-300">—</span>}
                                    </td>
                                    <td className={TD}>
                                        <div className="max-w-[280px]">
                                            {m.order && (
                                                <Link href={`/dashboard/admin/orders/${m.order._id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                                                    {m.order.orderId ? `Order ${m.order.orderId}` : 'View order'}
                                                </Link>
                                            )}
                                            {noteText(m) ? (
                                                <p className={cx('line-clamp-2', m.order ? 'text-xs text-gray-400' : 'text-gray-600')} title={m.note}>{noteText(m)}</p>
                                            ) : !m.order && <span className="text-gray-300">—</span>}
                                        </div>
                                    </td>
                                    <td className={`${TD} text-gray-700`}>{byLabel(m)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TableCard>
        </>
    );
}
