"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
    LuPlus, LuPencil, LuTrash2, LuEye, LuEyeOff, LuWarehouse, LuArrowLeftRight, LuMapPin, LuPhone, LuUser,
    LuTriangleAlert, LuTruck,
} from 'react-icons/lu';
import {
    PageHeader, Btn, Segmented, SearchInput, FilterBar, Badge, TableCard, TH, TD, TR, EmptyRow, SkeletonRows,
    RowMenu, type RowMenuItem, cx,
} from '@/components/admin/ui';
import {
    useGetWarehousesQuery, useUpdateWarehouseMutation, useDeleteWarehouseMutation, type Warehouse,
} from '@/redux/api/warehouseApi';
import WarehouseFormModal from './WarehouseFormModal';
import { errMsg, fmtDayTime, plural } from '../transfers/shared';

/**
 * Warehouses — the list of godowns / stock locations. Admin-only bookkeeping: purchases
 * are received into one and transfers move goods between two. Product stock stays one
 * total per product; nothing here changes it.
 */

const transfersHref = (id: string) => `/dashboard/admin/transfers?warehouse=${id}`;

export default function WarehousesPage() {
    const [scope, setScope] = useState<'active' | 'all'>('active');
    const [search, setSearch] = useState('');

    // One list with everything; Active/All and search filter it here (a handful of rows).
    const { data: all = [], isLoading, isError, isFetching, refetch } = useGetWarehousesQuery({ scope: 'all' });
    const [updateWarehouse] = useUpdateWarehouseMutation();
    const [deleteWarehouse] = useDeleteWarehouseMutation();

    const [form, setForm] = useState<{ key: number; warehouse: Warehouse | null } | null>(null);
    // A new key each time, so the form starts fresh.
    const openForm = (warehouse: Warehouse | null) => setForm((f) => ({ key: (f?.key || 0) + 1, warehouse }));

    const activeCount = all.filter((w) => w.isActive).length;
    const onTheWay = all.reduce((n, w) => n + (w.inTransitIn || 0), 0);

    const rows = useMemo(() => {
        const q = search.trim().toLowerCase();
        return all
            .filter((w) => scope === 'all' || w.isActive)
            .filter((w) => !q || [w.name, w.location, w.contactPerson, w.phone].some((v) => (v || '').toLowerCase().includes(q)));
    }, [all, scope, search]);

    const toggleActive = async (w: Warehouse) => {
        const pending = (w.inTransitIn || 0) + (w.inTransitOut || 0);
        if (w.isActive && pending > 0
            && !window.confirm(`${plural(pending, 'transfer')} to or from “${w.name}” ${pending === 1 ? 'is' : 'are'} still in transit. Deactivate it anyway? Those transfers stay as they are.`)) return;
        try {
            await updateWarehouse({ id: w._id, isActive: !w.isActive }).unwrap();
            toast.success(w.isActive ? `“${w.name}” deactivated — it can't be picked for new transfers` : `“${w.name}” activated`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not update the warehouse'));
        }
    };

    const remove = async (w: Warehouse) => {
        if (w.transferCount) {
            toast.error(`“${w.name}” is on ${plural(w.transferCount, 'transfer')}, so it can't be deleted. Deactivate it instead.`, { duration: 6000 });
            return;
        }
        if (w.purchaseCount) {
            toast.error(`Goods from ${plural(w.purchaseCount, 'purchase')} were received into “${w.name}”, so it can't be deleted. Deactivate it instead.`, { duration: 6000 });
            return;
        }
        if (!window.confirm(`Delete the warehouse “${w.name}”? This can't be undone.`)) return;
        try {
            await deleteWarehouse(w._id).unwrap();
            toast.success(`“${w.name}” deleted`);
        } catch (err) {
            toast.error(errMsg(err, 'Could not delete the warehouse'), { duration: 6000 });
        }
    };

    const menu = (w: Warehouse): RowMenuItem[] => [
        { label: 'Edit', icon: <LuPencil size={15} />, onClick: () => openForm(w) },
        { label: 'View transfers', icon: <LuArrowLeftRight size={15} />, href: transfersHref(w._id) },
        w.isActive
            ? { label: 'Deactivate', icon: <LuEyeOff size={15} />, onClick: () => toggleActive(w) }
            : { label: 'Activate', icon: <LuEye size={15} />, onClick: () => toggleActive(w) },
        { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: () => remove(w), danger: true },
    ];

    const failed = isError && !all.length;
    const filtered = !!search.trim();
    const empty = (
        <>
            <LuWarehouse size={28} className="mx-auto mb-2 text-gray-300" />
            {filtered ? (
                <>No warehouse matches “{search.trim()}”.</>
            ) : scope === 'active' && all.length > 0 ? (
                <>No active warehouses. <button type="button" onClick={() => setScope('all')} className="font-medium text-[var(--color-primary)] hover:underline">Show all</button></>
            ) : (
                <>
                    No warehouses yet.
                    <div className="mt-3"><Btn variant="primary" icon={<LuPlus size={15} />} onClick={() => openForm(null)}>Add your first warehouse</Btn></div>
                </>
            )}
        </>
    );
    const errorState = (
        <>
            <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
            Couldn&apos;t load the warehouses.
            <div className="mt-3"><Btn onClick={() => refetch()} disabled={isFetching}>{isFetching ? 'Retrying…' : 'Retry'}</Btn></div>
        </>
    );

    const COLS = 7;

    return (
        <div>
            <PageHeader
                title="Warehouses"
                subtitle="Stock locations — goods are received into a warehouse and moved between them with transfers. For your records only: product stock stays one total."
                actions={<>
                    <Segmented
                        value={scope}
                        onChange={setScope}
                        options={[
                            { value: 'active', label: <>Active{!isLoading && <span className="ml-1.5 text-xs text-gray-400">{activeCount}</span>}</> },
                            { value: 'all', label: <>All{!isLoading && <span className="ml-1.5 text-xs text-gray-400">{all.length}</span>}</> },
                        ]}
                    />
                    <Btn variant="primary" icon={<LuPlus size={16} />} onClick={() => openForm(null)}>Add warehouse</Btn>
                </>}
            />

            {(all.length > 0 || filtered) && (
                <FilterBar>
                    <SearchInput value={search} onChange={setSearch} placeholder="Search name, location, phone…" />
                </FilterBar>
            )}

            {onTheWay > 0 && (
                <Link
                    href="/dashboard/admin/transfers?status=in_transit"
                    className="mb-4 flex items-center gap-2.5 rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-800 transition hover:bg-amber-100"
                >
                    <LuTruck size={16} className="shrink-0" />
                    <span>{plural(onTheWay, 'transfer')} {onTheWay === 1 ? 'is' : 'are'} on the way between warehouses.</span>
                    <span className="ml-auto whitespace-nowrap font-medium">View</span>
                </Link>
            )}

            {/* ═══ Desktop / tablet: table ═══ */}
            <div className="hidden md:block">
                <TableCard>
                    <table className="w-full">
                        <thead>
                            <tr>
                                <th className={`${TH} w-12`}>#</th>
                                <th className={TH}>Name</th>
                                <th className={TH}>Location</th>
                                <th className={`${TH} text-right`}>Transfers</th>
                                <th className={TH}>Status</th>
                                <th className={TH}>Created</th>
                                <th className={`${TH} w-12`} />
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? <SkeletonRows cols={COLS} rows={4} />
                                : failed ? <EmptyRow colSpan={COLS}>{errorState}</EmptyRow>
                                    : rows.length === 0 ? <EmptyRow colSpan={COLS}>{empty}</EmptyRow>
                                        : rows.map((w, i) => (
                                            <tr key={w._id} className={cx(TR, !w.isActive && 'bg-gray-50/60')}>
                                                <td className={`${TD} text-gray-400`}>{i + 1}</td>
                                                <td className={TD}>
                                                    <button type="button" onClick={() => openForm(w)} className="text-left font-semibold text-gray-900 hover:text-[var(--color-primary)]">
                                                        {w.name}
                                                    </button>
                                                    {(w.contactPerson || w.phone) && (
                                                        <p className="mt-0.5 text-xs text-gray-400">
                                                            {[w.contactPerson, w.phone].filter(Boolean).join(' · ')}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className={`${TD} text-gray-500`}>
                                                    <p className="max-w-[280px] truncate" title={w.location || undefined}>{w.location || <span className="text-gray-300">—</span>}</p>
                                                </td>
                                                <td className={`${TD} text-right`}>
                                                    {w.transferCount ? (
                                                        <Link href={transfersHref(w._id)} className="font-medium text-gray-900 hover:text-[var(--color-primary)]">
                                                            {(w.transferCount || 0).toLocaleString('en-IN')}
                                                        </Link>
                                                    ) : <span className="text-gray-300">0</span>}
                                                    {!!w.inTransitIn && <p className="mt-0.5 whitespace-nowrap text-xs text-amber-600">{w.inTransitIn} incoming</p>}
                                                </td>
                                                <td className={TD}><Badge tone={w.isActive ? 'green' : 'gray'}>{w.isActive ? 'Active' : 'Inactive'}</Badge></td>
                                                <td className={`${TD} whitespace-nowrap text-gray-500`}>{fmtDayTime(w.createdAt)}</td>
                                                <td className={`${TD} text-right`}><RowMenu items={menu(w)} /></td>
                                            </tr>
                                        ))}
                        </tbody>
                    </table>
                </TableCard>
            </div>

            {/* ═══ Phone: cards ═══ */}
            <div className="space-y-3 md:hidden">
                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="h-4 w-1/2 animate-pulse rounded bg-gray-100" />
                        <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                    </div>
                )) : failed || rows.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-12 text-center text-sm text-gray-500">
                        {failed ? errorState : empty}
                    </div>
                ) : rows.map((w) => (
                    <div key={w._id} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <button type="button" onClick={() => openForm(w)} className="text-left font-semibold text-gray-900">{w.name}</button>
                                <div className="mt-1"><Badge tone={w.isActive ? 'green' : 'gray'}>{w.isActive ? 'Active' : 'Inactive'}</Badge></div>
                            </div>
                            <RowMenu items={menu(w)} />
                        </div>
                        <div className="mt-3 space-y-1.5 text-sm text-gray-600">
                            {w.location && <p className="flex items-start gap-2"><LuMapPin size={14} className="mt-0.5 shrink-0 text-gray-400" /><span className="min-w-0 break-words">{w.location}</span></p>}
                            {w.contactPerson && <p className="flex items-center gap-2"><LuUser size={14} className="shrink-0 text-gray-400" />{w.contactPerson}</p>}
                            {w.phone && <p className="flex items-center gap-2"><LuPhone size={14} className="shrink-0 text-gray-400" /><a href={`tel:${w.phone.replace(/[\s-]/g, '')}`} className="hover:text-[var(--color-primary)]">{w.phone}</a></p>}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
                            <Link href={transfersHref(w._id)} className="font-medium text-gray-700 hover:text-[var(--color-primary)]">
                                {plural(w.transferCount || 0, 'transfer')}
                                {!!w.inTransitIn && <span className="text-amber-600"> · {w.inTransitIn} incoming</span>}
                            </Link>
                            <span>Added {fmtDayTime(w.createdAt)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {!isLoading && !failed && (
                <p className="mt-4 text-sm text-gray-500">
                    {filtered || scope === 'active'
                        ? `${plural(rows.length, 'warehouse')}${scope === 'active' && all.length > activeCount ? ` · ${all.length - activeCount} inactive hidden` : ''}`
                        : plural(all.length, 'warehouse')}
                </p>
            )}

            {form && <WarehouseFormModal key={form.key} warehouse={form.warehouse} onClose={() => setForm(null)} />}
        </div>
    );
}
