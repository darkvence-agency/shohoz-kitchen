/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { LuPlus, LuUpload, LuPencil, LuTrash2, LuExternalLink, LuPackage } from 'react-icons/lu';
import { useGetProductsQuery, useGetProductStatsQuery, useDeleteProductMutation } from '@/redux/api/productApi';
import { toast } from 'react-hot-toast';
import BulkUploadModal from './BulkUploadModal';
import {
    PageHeader, Btn, SearchInput, SelectPill, FilterBar, StatTile, Badge, TableCard, TH, TD, TR,
    EmptyRow, SkeletonRows, Pager, RowMenu, taka, fmtDateTime, type Tone,
} from '@/components/admin/ui';

const PAGE_SIZE = 10;

// Until the Units module exists, products carry their unit as a word; show it short.
const UNIT_SHORT: Record<string, string> = {
    piece: 'PC', pcs: 'PC', pc: 'PC', kg: 'KG', gram: 'G', g: 'G', liter: 'L', litre: 'L', l: 'L',
    pack: 'PACK', pair: 'PAIR', box: 'BOX', dozen: 'DZ', set: 'SET',
};
const unitShort = (u?: string) => UNIT_SHORT[(u || 'piece').toLowerCase()] || (u || 'PC').toUpperCase();

const STATUS: Record<string, { label: string; tone: Tone }> = {
    active: { label: 'Active', tone: 'green' },
    draft: { label: 'Draft', tone: 'gray' },
    'out-of-stock': { label: 'Out of stock', tone: 'red' },
};

/** Debounce the search box so every keystroke doesn't hit the API. */
function useDebounced<T>(value: T, ms = 300) {
    const [v, setV] = useState(value);
    useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
    return v;
}

export default function ProductsPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [page, setPage] = useState(1);
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const q = useDebounced(search);

    const { data, isLoading, isFetching } = useGetProductsQuery({
        searchTerm: q || undefined,
        status: status !== 'all' ? status : undefined,
        sort: '-createdAt',
        page,
        limit: PAGE_SIZE,
    });
    const { data: statsData } = useGetProductStatsQuery(undefined);
    const [deleteProduct] = useDeleteProductMutation();

    const products: any[] = data?.data || [];
    const meta = data?.meta || { total: 0, totalPages: 1 };
    const stats = statsData?.data || { total: 0, active: 0, draft: 0, outOfStock: 0 };

    const pick = (s: string) => { setStatus(s); setPage(1); };

    const handleDelete = async (p: any) => {
        if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
        try {
            await deleteProduct(p._id).unwrap();
            toast.success('Product deleted');
        } catch (err: any) {
            toast.error(err?.data?.message || 'Failed to delete product');
        }
    };

    return (
        <div>
            <PageHeader
                title="Products"
                subtitle="Manage the catalog - simple products and attribute-based variants."
                actions={<>
                    <Btn icon={<LuUpload size={15} />} onClick={() => setShowBulkUpload(true)}>Bulk upload</Btn>
                    <Btn variant="primary" icon={<LuPlus size={16} />} href="/dashboard/admin/products/new">Add product</Btn>
                </>}
            />

            {showBulkUpload && <BulkUploadModal onClose={() => setShowBulkUpload(false)} />}

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label="All products" value={stats.total} active={status === 'all'} onClick={() => pick('all')} />
                <StatTile label="Active" value={stats.active} hint="Visible in the store" active={status === 'active'} onClick={() => pick('active')} />
                <StatTile label="Draft" value={stats.draft} hint="Hidden until published" active={status === 'draft'} onClick={() => pick('draft')} />
                <StatTile label="Out of stock" value={stats.outOfStock} active={status === 'out-of-stock'} onClick={() => pick('out-of-stock')} />
            </div>

            <FilterBar>
                <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search products…" />
                <SelectPill
                    ariaLabel="Status"
                    value={status}
                    onChange={pick}
                    className="sm:w-44"
                    options={[
                        { value: 'all', label: 'All statuses' },
                        { value: 'active', label: 'Active' },
                        { value: 'draft', label: 'Draft' },
                        { value: 'out-of-stock', label: 'Out of stock' },
                    ]}
                />
            </FilterBar>

            <TableCard
                footer={<Pager page={page} totalPages={meta.totalPages} total={meta.total} pageSize={PAGE_SIZE} count={products.length} onPage={setPage} noun="products" />}
            >
                <table className={`w-full ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
                    <thead>
                        <tr>
                            <th className={`${TH} w-12`}>#</th>
                            <th className={TH}>Product</th>
                            <th className={TH}>Category</th>
                            <th className={`${TH} text-right`}>Price</th>
                            <th className={`${TH} text-right`}>Stock</th>
                            <th className={TH}>Status</th>
                            <th className={TH}>Created</th>
                            <th className={`${TH} w-12`} />
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? <SkeletonRows cols={8} /> : products.length === 0 ? (
                            <EmptyRow colSpan={8}>
                                <LuPackage size={28} className="mx-auto mb-2 text-gray-300" />
                                {search || status !== 'all' ? 'No products match these filters.' : 'No products yet — add your first one.'}
                            </EmptyRow>
                        ) : products.map((p, i) => {
                            const st = STATUS[p.status] || { label: p.status, tone: 'gray' as Tone };
                            const low = p.stock <= (p.lowStockThreshold ?? 5);
                            const was = p.originalPrice && p.originalPrice > p.price ? p.originalPrice : 0;
                            return (
                                <tr key={p._id} className={TR}>
                                    <td className={`${TD} text-gray-400`}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                                    <td className={TD}>
                                        <div className="flex min-w-[260px] items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                                                {p.thumbnail ? <img src={p.thumbnail} alt="" className="h-full w-full object-cover" /> : <LuPackage className="text-gray-300" />}
                                            </div>
                                            <div className="min-w-0">
                                                <Link href={`/dashboard/admin/products/new?id=${p._id}`} className="line-clamp-1 font-medium text-gray-900 hover:text-[var(--color-primary)]">{p.name}</Link>
                                                <p className="mt-0.5 text-xs text-gray-400">
                                                    {p.sku || 'No SKU'}
                                                    {p.variants?.length > 0 && <> · {p.variants.length} variant{p.variants.length > 1 ? 's' : ''}</>}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={TD}>
                                        <span className="whitespace-nowrap">{p.category?.name || '—'}</span>
                                        {p.subCategory?.name && <span className="block text-xs text-gray-400">{p.subCategory.name}</span>}
                                    </td>
                                    <td className={`${TD} whitespace-nowrap text-right`}>
                                        <span className="font-medium text-gray-900">{taka(p.price)}</span>
                                        {was > 0 && <span className="block text-xs text-gray-400 line-through">{taka(was)}</span>}
                                    </td>
                                    <td className={`${TD} whitespace-nowrap text-right`}>
                                        <span className={p.stock === 0 ? 'font-medium text-red-600' : low ? 'font-medium text-amber-600' : ''}>
                                            {Number(p.stock || 0).toLocaleString('en-IN')} {unitShort(p.unit)}
                                        </span>
                                        {p.stock > 0 && low && <span className="block text-xs text-amber-600">Low</span>}
                                    </td>
                                    <td className={TD}><Badge tone={st.tone}>{st.label}</Badge></td>
                                    <td className={`${TD} whitespace-nowrap text-gray-500`}>{fmtDateTime(p.createdAt)}</td>
                                    <td className={`${TD} text-right`}>
                                        <RowMenu items={[
                                            { label: 'Edit', icon: <LuPencil size={15} />, href: `/dashboard/admin/products/new?id=${p._id}` },
                                            { label: 'View in store', icon: <LuExternalLink size={15} />, href: `/product/${p.slug}`, hidden: !p.slug || p.status !== 'active' },
                                            { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: () => handleDelete(p), danger: true },
                                        ]} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </TableCard>
        </div>
    );
}
