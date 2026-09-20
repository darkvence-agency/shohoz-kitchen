"use client";

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { LuBoxes, LuPackagePlus, LuPackageX, LuTriangleAlert, LuWallet } from 'react-icons/lu';
import { PageHeader, Btn, Segmented, StatTile, taka } from '@/components/admin/ui';
import { useGetInventorySummaryQuery, type StockFilter, type StockRow } from '@/redux/api/inventoryApi';
import StockTab from './StockTab';
import MovementsTab from './MovementsTab';
import AddStockModal, { type AddStockInit } from './AddStockModal';
import AdjustStockModal from './AdjustStockModal';
import { qty } from './shared';

/**
 * Inventory — stock on hand per product, its moving-average cost, and a ledger of every
 * stock movement (stock-in, sales, cancellations, returns, adjustments).
 *
 * Warehouses come later: the client's design shows a warehouse picker and a Warehouse
 * column; stock is tracked per product until then (see StockTab / MovementsTab).
 */
const STOCK_FILTERS: StockFilter[] = ['all', 'low', 'out', 'draft'];

// useSearchParams needs a Suspense boundary (Next.js falls back to client rendering up to it).
export default function InventoryPage() {
    return (
        <Suspense fallback={null}>
            <InventoryPageInner />
        </Suspense>
    );
}

function InventoryPageInner() {
    // ?stock=low|out|draft pre-selects the level filter (the Dashboard's "Needs attention" rows link here).
    const stockParam = useSearchParams().get('stock') as StockFilter | null;
    const [tab, setTab] = useState<'stock' | 'movements'>('stock');
    const [filter, setFilter] = useState<StockFilter>(
        stockParam && STOCK_FILTERS.includes(stockParam) ? stockParam : 'all',
    );
    const [historyFor, setHistoryFor] = useState<{ _id: string; name: string } | null>(null);
    const [adding, setAdding] = useState<AddStockInit | null>(null);
    const [adjusting, setAdjusting] = useState<{ row: StockRow; variantId?: string } | null>(null);

    const { data: summary, isLoading } = useGetInventorySummaryQuery(undefined, { refetchOnMountOrArgChange: true });
    const s = summary || { products: 0, units: 0, value: 0, low: 0, out: 0, drafts: 0, uncosted: 0 };
    const dash = (v: React.ReactNode) => (isLoading ? '—' : v);

    const showStock = (f: StockFilter) => {
        setTab('stock');
        setFilter(f);
    };

    return (
        <div>
            <PageHeader
                title="Inventory"
                subtitle="Stock on hand, moving-average cost and every stock movement."
                actions={<>
                    <Segmented
                        value={tab}
                        onChange={setTab}
                        options={[{ value: 'stock', label: 'Stock' }, { value: 'movements', label: 'Movements' }]}
                    />
                    <Btn variant="primary" icon={<LuPackagePlus size={16} />} onClick={() => setAdding({})}>Add stock</Btn>
                </>}
            />

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                    label="Units in stock"
                    icon={<LuBoxes size={18} />}
                    value={dash(qty(s.units))}
                    hint={`Across ${qty(s.products)} product${s.products === 1 ? '' : 's'}`}
                    active={tab === 'stock' && filter === 'all'}
                    onClick={() => showStock('all')}
                />
                <StatTile
                    label="Stock value"
                    icon={<LuWallet size={18} />}
                    value={dash(taka(s.value))}
                    hint={s.uncosted > 0 ? `${qty(s.uncosted)} in-stock product${s.uncosted === 1 ? ' has' : 's have'} no cost yet` : 'At moving-average cost'}
                />
                <StatTile
                    label="Low stock"
                    icon={<LuTriangleAlert size={18} />}
                    value={dash(<span className={s.low > 0 ? 'text-amber-600' : undefined}>{qty(s.low)}</span>)}
                    hint="At or below the alert level"
                    active={tab === 'stock' && filter === 'low'}
                    onClick={() => showStock('low')}
                />
                <StatTile
                    label="Out of stock"
                    icon={<LuPackageX size={18} />}
                    value={dash(<span className={s.out > 0 ? 'text-red-600' : undefined}>{qty(s.out)}</span>)}
                    hint={s.drafts > 0 ? `${qty(s.drafts)} draft${s.drafts === 1 ? '' : 's'} waiting to be finished` : 'Nothing left to sell'}
                    active={tab === 'stock' && filter === 'out'}
                    onClick={() => showStock('out')}
                />
            </div>

            {tab === 'stock' ? (
                <StockTab
                    filter={filter}
                    onFilter={setFilter}
                    summary={summary}
                    onAddStock={(row, variantId) => setAdding({ product: row, variantId })}
                    onAdjust={(row, variantId) => setAdjusting({ row, variantId })}
                    onHistory={(row) => { setHistoryFor({ _id: row._id, name: row.name }); setTab('movements'); }}
                    onNewProduct={() => setAdding({ mode: 'new' })}
                />
            ) : (
                <MovementsTab product={historyFor} onClearProduct={() => setHistoryFor(null)} />
            )}

            {adding && <AddStockModal init={adding} onClose={() => setAdding(null)} />}
            {adjusting && <AdjustStockModal row={adjusting.row} variantId={adjusting.variantId} onClose={() => setAdjusting(null)} />}
        </div>
    );
}
