"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { LuChevronDown, LuHistory, LuPackage, LuPackagePlus, LuPencil, LuSlidersHorizontal } from 'react-icons/lu';
import {
    SearchInput, SelectPill, FilterBar, Badge, Btn, TableCard, TH, TD, TR, EmptyRow, SkeletonRows, Pager, RowMenu, taka, cx,
} from '@/components/admin/ui';
import {
    useGetInventoryStockQuery, type StockFilter, type StockSort, type StockRow, type InventorySummary,
} from '@/redux/api/inventoryApi';
import { unitShort, qty, PRODUCT_STATUS, editProductHref, errorMessage, useDebounced, usePage, Thumb } from './shared';

const PAGE_SIZE = 20;
const COLS = 7;

export default function StockTab({ filter, onFilter, summary, onAddStock, onAdjust, onHistory, onNewProduct }: {
    filter: StockFilter;
    onFilter: (f: StockFilter) => void;
    summary?: InventorySummary;
    onAddStock: (row: StockRow, variantId?: string) => void;
    onAdjust: (row: StockRow, variantId?: string) => void;
    onHistory: (row: StockRow) => void;
    onNewProduct: () => void;
}) {
    const [search, setSearch] = useState('');
    const q = useDebounced(search.trim());
    const [sort, setSort] = useState<StockSort>('name');
    const [page, setPage] = usePage(`${filter}|${q}|${sort}`);
    const [open, setOpen] = useState<Record<string, boolean>>({});

    const { data, isLoading, isFetching, isError, error, refetch } = useGetInventoryStockQuery(
        { search: q || undefined, filter, sort, page, limit: PAGE_SIZE },
        { refetchOnMountOrArgChange: true },
    );
    const rows = data?.data || [];
    const meta = data?.meta || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

    const count = (n?: number) => (typeof n === 'number' ? ` (${n.toLocaleString('en-IN')})` : '');

    return (
        <>
            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search product / SKU…" />
                {/* Warehouses come later: a "All warehouses" picker goes here (as in the client's
                    design), and the table below gets a Warehouse column. Stock is per product today. */}
                <SelectPill
                    ariaLabel="Stock level"
                    value={filter}
                    onChange={(v) => onFilter(v as StockFilter)}
                    className="sm:w-48"
                    options={[
                        { value: 'all', label: 'All products' },
                        { value: 'low', label: `Low stock${count(summary?.low)}` },
                        { value: 'out', label: `Out of stock${count(summary?.out)}` },
                        { value: 'draft', label: `Drafts${count(summary?.drafts)}` },
                    ]}
                />
                <SelectPill
                    ariaLabel="Sort"
                    value={sort}
                    onChange={(v) => setSort(v as StockSort)}
                    className="sm:w-52"
                    options={[
                        { value: 'name', label: 'Name A–Z' },
                        { value: 'stock', label: 'Quantity: low to high' },
                        { value: '-stock', label: 'Quantity: high to low' },
                        { value: '-value', label: 'Stock value: high to low' },
                        { value: '-updatedAt', label: 'Recently updated' },
                    ]}
                />
            </FilterBar>

            <TableCard
                footer={<Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={rows.length} onPage={setPage} noun="products" />}
            >
                <table className={cx('w-full', isFetching && !isLoading && 'opacity-60')}>
                    <thead>
                        <tr>
                            <th className={`${TH} w-12`}>#</th>
                            <th className={TH}>Product</th>
                            {/* Warehouse column goes here once warehouses exist. */}
                            <th className={TH}>Status</th>
                            <th className={`${TH} text-right`}>Qty</th>
                            <th className={`${TH} text-right`}>Avg cost</th>
                            <th className={`${TH} text-right`}>Stock value</th>
                            <th className={`${TH} w-12`} />
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={COLS} /> : isError ? (
                            <EmptyRow colSpan={COLS}>
                                <p>{errorMessage(error, 'Could not load stock.')}</p>
                                <Btn className="mt-3" onClick={() => refetch()}>Try again</Btn>
                            </EmptyRow>
                        ) : rows.length === 0 ? (
                            <EmptyRow colSpan={COLS}>
                                <LuPackage size={28} className="mx-auto mb-2 text-gray-300" />
                                {q || filter !== 'all' ? 'No products match these filters.' : (
                                    <>
                                        <p>No products yet.</p>
                                        <Btn variant="primary" className="mt-3" icon={<LuPackagePlus size={15} />} onClick={onNewProduct}>Add a product with stock</Btn>
                                    </>
                                )}
                            </EmptyRow>
                        ) : rows.map((r, i) => {
                            const st = PRODUCT_STATUS[r.status] || { label: r.status, tone: 'gray' as const };
                            const unit = unitShort(r.unit);
                            const expanded = !!open[r._id];
                            const hasVariants = r.variants.length > 0;
                            return (
                                <React.Fragment key={r._id}>
                                    <tr className={TR}>
                                        <td className={`${TD} text-gray-400`}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                        <td className={TD}>
                                            <div className="flex min-w-[240px] items-center gap-3">
                                                <Thumb src={r.thumbnail} />
                                                <div className="min-w-0">
                                                    <Link href={editProductHref(r._id)} className="line-clamp-1 font-medium text-gray-900 hover:text-[var(--color-primary)]">
                                                        {r.name}
                                                    </Link>
                                                    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-gray-400">
                                                        <span>{r.sku || 'No SKU'}</span>
                                                        {hasVariants && (
                                                            <button
                                                                type="button"
                                                                aria-expanded={expanded}
                                                                onClick={() => setOpen((o) => ({ ...o, [r._id]: !o[r._id] }))}
                                                                className="inline-flex items-center gap-0.5 font-medium text-[var(--color-primary)] hover:underline"
                                                            >
                                                                · {r.variants.length} variant{r.variants.length > 1 ? 's' : ''}
                                                                <LuChevronDown size={13} className={cx('transition', expanded && 'rotate-180')} />
                                                            </button>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className={TD}><Badge tone={st.tone}>{st.label}</Badge></td>
                                        <td className={`${TD} whitespace-nowrap text-right`}>
                                            <span className={r.isOut ? 'font-semibold text-red-600' : r.isLow ? 'font-semibold text-amber-600' : 'font-medium text-gray-900'}>
                                                {qty(r.stock)}
                                            </span>{' '}
                                            <span className="text-xs text-gray-400">{unit}</span>
                                            {r.isLow && <span className="block text-xs text-amber-600">Low</span>}
                                            {r.isOut && <span className="block text-xs text-red-600">Out of stock</span>}
                                        </td>
                                        <td className={`${TD} whitespace-nowrap text-right text-gray-500`}>
                                            {r.costPrice > 0 ? taka(r.costPrice, 2) : <span className="text-gray-300" title="No cost recorded yet — add stock with a unit cost">—</span>}
                                        </td>
                                        <td className={`${TD} whitespace-nowrap text-right font-medium text-gray-900`}>
                                            {r.costPrice > 0 ? taka(r.value, 2) : <span className="font-normal text-gray-300">—</span>}
                                        </td>
                                        <td className={`${TD} text-right`}>
                                            <RowMenu items={[
                                                { label: 'Add stock', icon: <LuPackagePlus size={15} />, onClick: () => onAddStock(r) },
                                                { label: 'Adjust', icon: <LuSlidersHorizontal size={15} />, onClick: () => onAdjust(r) },
                                                { label: 'Movements', icon: <LuHistory size={15} />, onClick: () => onHistory(r) },
                                                { label: r.status === 'draft' ? 'Finish product' : 'Edit product', icon: <LuPencil size={15} />, href: editProductHref(r._id) },
                                            ]} />
                                        </td>
                                    </tr>

                                    {expanded && r.variants.map((v) => (
                                        <tr key={v._id} className="border-t border-gray-100 bg-gray-50/60">
                                            <td />
                                            <td className="px-4 py-2.5 text-sm">
                                                <div className="flex items-center gap-2 pl-12 text-gray-700">
                                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gray-300" />
                                                    <span>{v.label}</span>
                                                    {v.sku && <span className="text-xs text-gray-400">{v.sku}</span>}
                                                </div>
                                            </td>
                                            <td />
                                            <td className="whitespace-nowrap px-4 py-2.5 text-right text-sm">
                                                <span className={v.stock <= 0 ? 'text-red-600' : 'text-gray-800'}>{qty(v.stock)}</span>{' '}
                                                <span className="text-xs text-gray-400">{unit}</span>
                                            </td>
                                            <td colSpan={2} />
                                            <td className="px-4 py-1.5 text-right">
                                                <RowMenu label={`Actions for ${v.label}`} items={[
                                                    { label: 'Add stock', icon: <LuPackagePlus size={15} />, onClick: () => onAddStock(r, v._id) },
                                                    { label: 'Adjust', icon: <LuSlidersHorizontal size={15} />, onClick: () => onAdjust(r, v._id) },
                                                ]} />
                                            </td>
                                        </tr>
                                    ))}
                                    {expanded && r.variantTotal !== r.stock && (
                                        <tr className="bg-gray-50/60">
                                            <td />
                                            <td colSpan={COLS - 1} className="px-4 pb-3 pt-0 text-xs text-amber-700">
                                                <span className="pl-12">
                                                    Variants add up to {qty(r.variantTotal)} {unit}; {qty(r.stock)} {unit} can be sold.
                                                    Count each variant with Adjust — that sets the total to the sum of the variants.
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </TableCard>
        </>
    );
}
