"use client";

import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    LuPlus, LuPencil, LuTrash2, LuEye, LuEyeOff, LuStore, LuList, LuTriangleAlert, LuWallet, LuShoppingBag, LuInfo,
} from 'react-icons/lu';
import {
    PageHeader, Btn, Segmented, SearchInput, FilterBar, StatTile, Badge, TableCard, TH, TD, TR, EmptyRow, SkeletonRows,
    RowMenu, taka, cx, type RowMenuItem,
} from '@/components/admin/ui';
import {
    useGetSupplierListQuery, useUpdateSupplierMutation, useDeleteSupplierMutation, type Supplier,
} from '@/redux/api/supplierApi';
import { errorMessage, qty, useDebounced } from '@/app/dashboard/admin/inventory/shared';
import { PURCHASES_HREF, fmtStamp } from '@/app/dashboard/admin/purchases/_components/shared';
import SupplierFormModal from './_components/SupplierFormModal';
import SupplierDetailModal from './_components/SupplierDetailModal';

const COLS = 10;

/**
 * Suppliers — the companies we buy stock from, with what we bought from each and
 * what we still owe. Admin-only bookkeeping: suppliers never log in.
 */
export default function SuppliersPage() {
    const [scope, setScope] = useState<'active' | 'all'>('active');
    const [search, setSearch] = useState('');
    const q = useDebounced(search.trim());
    const { data: suppliers = [], isLoading, isFetching, isError, refetch } = useGetSupplierListQuery(
        { scope, search: q || undefined },
        { refetchOnMountOrArgChange: true },
    );
    const [updateSupplier] = useUpdateSupplierMutation();
    const [deleteSupplier] = useDeleteSupplierMutation();

    // The modal is mounted only while open, so each opening starts from fresh values.
    const [form, setForm] = useState<{ supplier: Supplier | null } | null>(null);
    const [viewing, setViewing] = useState<string | null>(null);
    const openForm = (supplier: Supplier | null) => setForm({ supplier });

    const totals = useMemo(() => suppliers.reduce(
        (t, s) => ({ purchased: t.purchased + s.totalPurchased, due: t.due + s.due, owing: t.owing + (s.due > 0 ? 1 : 0), active: t.active + (s.isActive ? 1 : 0) }),
        { purchased: 0, due: 0, owing: 0, active: 0 },
    ), [suppliers]);

    const toggleActive = async (s: Supplier) => {
        try {
            await updateSupplier({ id: s._id, isActive: !s.isActive }).unwrap();
            toast.success(s.isActive ? `“${s.name}” deactivated — it stays on its purchases` : `“${s.name}” is active again`);
        } catch (err) {
            toast.error(errorMessage(err, 'Could not update the supplier'));
        }
    };

    const remove = async (s: Supplier) => {
        if (s.purchaseCount > 0) {
            const msg = `${s.purchaseCount} purchase${s.purchaseCount === 1 ? ' refers' : 's refer'} to “${s.name}”, so it can’t be deleted.`;
            if (s.isActive && window.confirm(`${msg}\n\nDeactivate it instead? It stays on its purchases but can’t be chosen for new ones.`)) {
                await toggleActive(s);
            } else if (!s.isActive) {
                toast.error(msg);
            }
            return;
        }
        if (!window.confirm(`Delete the supplier “${s.name}”? This cannot be undone.`)) return;
        try {
            await deleteSupplier(s._id).unwrap();
            toast.success('Supplier deleted');
        } catch (err) {
            toast.error(errorMessage(err, 'Could not delete the supplier'), { duration: 6000 });
        }
    };

    const menu = (s: Supplier): RowMenuItem[] => [
        { label: 'View details', icon: <LuStore size={15} />, onClick: () => setViewing(s._id) },
        { label: 'Edit', icon: <LuPencil size={15} />, onClick: () => openForm(s) },
        { label: 'View purchases', icon: <LuList size={15} />, href: `${PURCHASES_HREF}?supplier=${s._id}` },
        { label: 'New purchase', icon: <LuPlus size={15} />, href: `${PURCHASES_HREF}/new?supplier=${s._id}`, hidden: !s.isActive },
        s.isActive
            ? { label: 'Deactivate', icon: <LuEyeOff size={15} />, onClick: () => toggleActive(s) }
            : { label: 'Activate', icon: <LuEye size={15} />, onClick: () => toggleActive(s) },
        { label: 'Delete', icon: <LuTrash2 size={15} />, onClick: () => remove(s), danger: true },
    ];

    const failed = isError && !isFetching && suppliers.length === 0;
    const emptyText = q
        ? `No supplier matches “${q}”.`
        : scope === 'active' ? 'No active suppliers.' : 'No suppliers yet.';

    const productsLine = (s: Supplier) => s.productCount > 0
        ? `${qty(s.productCount)} product${s.productCount === 1 ? '' : 's'} · ${qty(s.unitsOrdered)} units`
        : '';
    /** "Pan ×100, Pot ×50 +2 more" — what we take from them, most first. */
    const takes = (s: Supplier) => s.topProducts.length
        ? s.topProducts.map((p) => `${p.name} ×${qty(p.qty)}`).join(', ') + (s.productCount > s.topProducts.length ? ` +${s.productCount - s.topProducts.length} more` : '')
        : '';

    return (
        <div>
            <PageHeader
                title="Suppliers"
                subtitle="Companies you import from — referenced by purchases."
                actions={<>
                    <Segmented value={scope} onChange={setScope} options={[{ value: 'active', label: 'Active' }, { value: 'all', label: 'All' }]} />
                    <Btn variant="primary" icon={<LuPlus size={16} />} onClick={() => openForm(null)}>Add supplier</Btn>
                </>}
            />

            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
                <StatTile
                    label="Suppliers"
                    icon={<LuStore size={16} />}
                    value={isLoading ? '—' : qty(suppliers.length)}
                    hint={scope === 'all' ? `${qty(totals.active)} active` : 'Active only'}
                />
                <StatTile
                    label="Total purchased"
                    icon={<LuShoppingBag size={16} />}
                    value={isLoading ? '—' : taka(totals.purchased)}
                    hint="Placed purchases, in BDT"
                />
                <div className="col-span-2 lg:col-span-1">
                    <StatTile
                        label="Due to suppliers"
                        icon={<LuWallet size={16} />}
                        value={isLoading ? '—' : <span className={totals.due > 0 ? 'text-amber-600' : undefined}>{taka(totals.due)}</span>}
                        hint={totals.owing > 0 ? `Owed to ${totals.owing} supplier${totals.owing === 1 ? '' : 's'}` : 'Nothing owed'}
                    />
                </div>
            </div>

            <FilterBar>
                <SearchInput value={search} onChange={setSearch} placeholder="Search name, contact, phone, country…" className="sm:w-80" />
            </FilterBar>

            {/* ═══ Desktop / tablet: table ═══ */}
            <div className="hidden md:block">
                <TableCard footer={<p className="mt-4 text-sm text-gray-500">{suppliers.length} {suppliers.length === 1 ? 'supplier' : 'suppliers'}</p>}>
                    <table className={cx('w-full', isFetching && !isLoading && 'opacity-60')}>
                        <thead>
                            <tr>
                                <th className={`${TH} w-12`}>#</th>
                                <th className={TH}>Supplier</th>
                                <th className={TH}>Contact</th>
                                <th className={TH}>Country</th>
                                <th className={`${TH} text-right`}>Purchases</th>
                                <th className={`${TH} text-right`}>Total purchased</th>
                                <th className={`${TH} text-right`}>Due</th>
                                <th className={TH}>Status</th>
                                <th className={TH}>Created</th>
                                <th className={`${TH} w-12`} />
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? <SkeletonRows cols={COLS} rows={5} /> : failed ? (
                                <EmptyRow colSpan={COLS}>
                                    <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
                                    Couldn&apos;t load the suppliers.
                                    <div className="mt-3"><Btn onClick={() => refetch()}>Try again</Btn></div>
                                </EmptyRow>
                            ) : suppliers.length === 0 ? (
                                <EmptyRow colSpan={COLS}>
                                    <LuStore size={28} className="mx-auto mb-2 text-gray-300" />
                                    {emptyText}
                                    {!q && scope === 'active' && (
                                        <div className="mt-3"><Btn variant="primary" icon={<LuPlus size={15} />} onClick={() => openForm(null)}>Add your first supplier</Btn></div>
                                    )}
                                </EmptyRow>
                            ) : suppliers.map((s, i) => (
                                <tr key={s._id} className={TR}>
                                    <td className={`${TD} text-gray-400`}>{i + 1}</td>
                                    <td className={TD}>
                                        <button type="button" onClick={() => setViewing(s._id)} className="max-w-[260px] text-left font-semibold text-gray-900 hover:text-[var(--color-primary)]">
                                            {s.name}
                                        </button>
                                        {s.contactPerson && <p className="mt-0.5 max-w-[260px] truncate text-xs text-gray-500">{s.contactPerson}</p>}
                                        {takes(s) && (
                                            <p className="mt-0.5 max-w-[260px] truncate text-xs text-gray-400" title={takes(s)}>
                                                Takes: {takes(s)}
                                            </p>
                                        )}
                                    </td>
                                    <td className={`${TD} text-gray-500`}>
                                        {s.phone || s.email ? (
                                            <>
                                                {s.phone && <p className="whitespace-nowrap">{s.phone}</p>}
                                                {s.email && <p className="max-w-[200px] truncate text-xs text-gray-400">{s.email}</p>}
                                            </>
                                        ) : <span className="text-gray-300">-</span>}
                                    </td>
                                    <td className={`${TD} text-gray-500`}>{s.country || <span className="text-gray-300">-</span>}</td>
                                    <td className={`${TD} text-right`}>
                                        <span className="tabular-nums">{s.purchaseCount}</span>
                                        {productsLine(s) && <p className="whitespace-nowrap text-xs text-gray-400">{productsLine(s)}</p>}
                                    </td>
                                    <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gray-900`}>{taka(s.totalPurchased)}</td>
                                    <td className={cx(TD, 'whitespace-nowrap text-right tabular-nums', s.due > 0 ? 'font-medium text-amber-600' : 'text-gray-400')}>
                                        {s.due > 0 ? taka(s.due) : s.totalPurchased > 0 ? 'settled' : '—'}
                                    </td>
                                    <td className={TD}><Badge tone={s.isActive ? 'green' : 'gray'}>{s.isActive ? 'Active' : 'Inactive'}</Badge></td>
                                    <td className={`${TD} whitespace-nowrap text-gray-500`}>{fmtStamp(s.createdAt)}</td>
                                    <td className={`${TD} text-right`}><RowMenu items={menu(s)} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </TableCard>
            </div>

            {/* ═══ Phone: cards ═══ */}
            <div className={cx('space-y-3 md:hidden', isFetching && !isLoading && 'opacity-60')}>
                {isLoading ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-white" />
                )) : failed ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                        <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
                        Couldn&apos;t load the suppliers.
                        <div className="mt-3"><Btn onClick={() => refetch()}>Try again</Btn></div>
                    </div>
                ) : suppliers.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                        <LuStore size={28} className="mx-auto mb-2 text-gray-300" />
                        {emptyText}
                    </div>
                ) : suppliers.map((s) => (
                    <div key={s._id} className="rounded-2xl border border-gray-200 bg-white p-4">
                        <div className="flex items-start gap-2">
                            <button type="button" onClick={() => setViewing(s._id)} className="min-w-0 flex-1 text-left">
                                <p className="font-semibold text-gray-900">{s.name}</p>
                                <p className="mt-0.5 text-xs text-gray-400">
                                    {[s.country, s.contactPerson, s.phone].filter(Boolean).join(' · ') || 'No contact details'}
                                </p>
                            </button>
                            <Badge tone={s.isActive ? 'green' : 'gray'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
                            <RowMenu items={menu(s)} />
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-sm">
                            <div>
                                <p className="text-xs text-gray-400">Purchases</p>
                                <p className="font-medium tabular-nums text-gray-900">{s.purchaseCount}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Purchased</p>
                                <p className="font-medium tabular-nums text-gray-900">{taka(s.totalPurchased)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-400">Due</p>
                                <p className={cx('font-medium tabular-nums', s.due > 0 ? 'text-amber-600' : 'text-gray-400')}>{s.due > 0 ? taka(s.due) : 'settled'}</p>
                            </div>
                        </div>
                        {takes(s) && <p className="mt-2 line-clamp-2 text-xs text-gray-400">Takes: {takes(s)}</p>}
                    </div>
                ))}
                {!isLoading && suppliers.length > 0 && (
                    <p className="text-sm text-gray-500">{suppliers.length} {suppliers.length === 1 ? 'supplier' : 'suppliers'}</p>
                )}
            </div>

            <p className="mt-6 flex items-start gap-2 text-xs text-gray-400">
                <LuInfo size={14} className="mt-px shrink-0" />
                <span>
                    Totals count placed purchases only (confirmed, partially received and received) — drafts and cancelled ones are left out.
                    A supplier on a purchase can&apos;t be deleted; deactivate it instead.
                </span>
            </p>

            {form && (
                <SupplierFormModal
                    key={form.supplier?._id || 'new'}
                    supplier={form.supplier}
                    onClose={() => setForm(null)}
                />
            )}
            {viewing && (
                <SupplierDetailModal
                    id={viewing}
                    onClose={() => setViewing(null)}
                    onEdit={(s) => { setViewing(null); openForm(s); }}
                />
            )}
        </div>
    );
}

