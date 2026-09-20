"use client";

import React from 'react';
import Link from 'next/link';
import {
    LuMail, LuMapPin, LuPhone, LuUser, LuPencil, LuPlus, LuPackage, LuTriangleAlert, LuGlobe,
} from 'react-icons/lu';
import { Modal, Btn, Badge, TH, TD, TR, taka, cx } from '@/components/admin/ui';
import { useGetSupplierDetailQuery, type Supplier } from '@/redux/api/supplierApi';
import { Thumb, qty, unitShort } from '@/app/dashboard/admin/inventory/shared';
import {
    PURCHASES_HREF, purchaseHref, statusMeta, shippingLabel, fmtDay, money,
} from '@/app/dashboard/admin/purchases/_components/shared';

function Figure({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'amber' | 'green' }) {
    return (
        <div className="rounded-xl border border-gray-200 px-3 py-2.5">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={cx('mt-0.5 text-base font-semibold tabular-nums',
                tone === 'amber' ? 'text-amber-600' : tone === 'green' ? 'text-emerald-600' : 'text-gray-900')}
            >
                {value}
            </p>
        </div>
    );
}

/** A supplier at a glance: contact details, totals, what we took from them and recent purchases. */
export default function SupplierDetailModal({ id, onClose, onEdit }: {
    id: string;
    onClose: () => void;
    onEdit: (s: Supplier) => void;
}) {
    const { data: s, isLoading, isError, refetch } = useGetSupplierDetailQuery(id, { refetchOnMountOrArgChange: true });

    const contact = s ? [
        s.contactPerson && { icon: <LuUser size={14} />, text: s.contactPerson },
        s.phone && { icon: <LuPhone size={14} />, text: <a href={`tel:${s.phone.replace(/[^\d+]/g, '')}`} className="hover:text-[var(--color-primary)]">{s.phone}</a> },
        s.email && { icon: <LuMail size={14} />, text: <a href={`mailto:${s.email}`} className="break-all hover:text-[var(--color-primary)]">{s.email}</a> },
        s.country && { icon: <LuGlobe size={14} />, text: s.country },
        s.address && { icon: <LuMapPin size={14} />, text: s.address },
    ].filter(Boolean) as { icon: React.ReactNode; text: React.ReactNode }[] : [];

    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-4xl"
            title={s ? (
                <span className="flex flex-wrap items-center gap-2">
                    {s.name}
                    <Badge tone={s.isActive ? 'green' : 'gray'}>{s.isActive ? 'Active' : 'Inactive'}</Badge>
                </span>
            ) : 'Supplier'}
            subtitle={s ? `Added ${fmtDay(s.createdAt)}${s.lastOrderDate ? ` · last order ${fmtDay(s.lastOrderDate)}` : ''}` : undefined}
            footer={s ? (
                // Wraps on narrow phones instead of pushing "Edit" off the dialog's left edge.
                <div className="flex flex-wrap justify-end gap-2">
                    <Btn icon={<LuPencil size={15} />} onClick={() => onEdit(s)}>Edit</Btn>
                    <Btn href={`${PURCHASES_HREF}?supplier=${s._id}`}>All purchases</Btn>
                    {s.isActive && <Btn variant="primary" icon={<LuPlus size={15} />} href={`${PURCHASES_HREF}/new?supplier=${s._id}`}>New purchase</Btn>}
                </div>
            ) : undefined}
        >
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />)}
                </div>
            ) : isError || !s ? (
                <div className="py-10 text-center text-sm text-gray-500">
                    <LuTriangleAlert size={28} className="mx-auto mb-2 text-amber-500" />
                    Couldn&apos;t load this supplier.
                    <div className="mt-3"><Btn onClick={() => refetch()}>Try again</Btn></div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Contact + figures */}
                    <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
                        <div className="space-y-2 text-sm text-gray-700">
                            {contact.length ? contact.map((c, i) => (
                                <p key={i} className="flex items-start gap-2">
                                    <span className="mt-0.5 shrink-0 text-gray-400">{c.icon}</span>
                                    <span className="min-w-0">{c.text}</span>
                                </p>
                            )) : <p className="text-gray-400">No contact details yet.</p>}
                            {s.note && <p className="whitespace-pre-line rounded-xl bg-gray-50 px-3 py-2 text-gray-600">{s.note}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <Figure label="Purchases" value={`${qty(s.purchaseCount)}${s.openCount ? ` (${s.openCount} open)` : ''}`} />
                            <Figure label="Total purchased" value={taka(s.totalPurchased)} />
                            <Figure label="Due to them" value={taka(s.due)} tone={s.due > 0 ? 'amber' : undefined} />
                            <Figure label="Paid" value={taka(s.totalPaid)} />
                            <Figure label="Products" value={qty(s.productCount)} />
                            <Figure label="Units received" value={`${qty(s.unitsReceived)} / ${qty(s.unitsOrdered)}`} tone={s.unitsOrdered > 0 && s.unitsReceived >= s.unitsOrdered ? 'green' : undefined} />
                        </div>
                    </div>

                    {/* Products taken */}
                    <section>
                        <h4 className="text-sm font-semibold text-gray-900">Products taken</h4>
                        <p className="mb-2 text-xs text-gray-500">
                            From placed purchases (drafts and cancelled ones are left out). Landed cost includes each product&apos;s share of shipping, duty and other costs.
                        </p>
                        {s.productsTaken.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                                <LuPackage size={24} className="mx-auto mb-2 text-gray-300" />
                                Nothing bought from this supplier yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full">
                                    <thead>
                                        <tr>
                                            <th className={TH}>Product</th>
                                            <th className={`${TH} text-right`}>Ordered</th>
                                            <th className={`${TH} text-right`}>Received</th>
                                            <th className={`${TH} text-right`}>Last unit cost</th>
                                            <th className={`${TH} text-right`}>Landed cost</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {s.productsTaken.map((p) => (
                                            <tr key={p.key} className={TR}>
                                                <td className={TD}>
                                                    <div className="flex min-w-[200px] items-center gap-2.5">
                                                        <Thumb src={p.product?.thumbnail} size={32} />
                                                        <div className="min-w-0">
                                                            <p className="line-clamp-1 font-medium text-gray-900">{p.name}</p>
                                                            <p className="text-xs text-gray-400">
                                                                {p.product ? (p.sku || 'No SKU') : 'Not in the catalogue'}
                                                                {p.product?.isDeleted && ' · deleted'}
                                                                {' · '}{p.purchaseCount} PO{p.purchaseCount === 1 ? '' : 's'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={`${TD} whitespace-nowrap text-right tabular-nums`}>{qty(p.qtyOrdered)} {unitShort(p.unit || p.product?.unit)}</td>
                                                <td className={cx(TD, 'whitespace-nowrap text-right tabular-nums', p.qtyReceived < p.qtyOrdered ? 'text-amber-600' : 'text-emerald-600')}>
                                                    {qty(p.qtyReceived)}
                                                </td>
                                                <td className={`${TD} whitespace-nowrap text-right tabular-nums text-gray-500`}>{money(p.lastUnitCost, p.lastCurrency)}</td>
                                                <td className={`${TD} whitespace-nowrap text-right font-medium tabular-nums text-gray-900`}>{taka(p.landedCost)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>

                    {/* Recent purchases */}
                    <section>
                        <div className="mb-2 flex items-end justify-between gap-3">
                            <h4 className="text-sm font-semibold text-gray-900">Recent purchases</h4>
                            {s.purchaseCount > s.recentPurchases.length && (
                                <Link href={`${PURCHASES_HREF}?supplier=${s._id}`} className="text-xs font-medium text-[var(--color-primary)] hover:underline">
                                    See all {s.purchaseCount}
                                </Link>
                            )}
                        </div>
                        {s.recentPurchases.length === 0 ? (
                            <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">No purchases yet.</p>
                        ) : (
                            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                                {s.recentPurchases.map((p) => {
                                    const st = statusMeta(p.status);
                                    return (
                                        <Link key={p._id} href={purchaseHref(p._id)} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm transition hover:bg-gray-50">
                                            <span className="min-w-0 flex-1">
                                                <span className="font-medium text-gray-900">{p.reference}</span>
                                                <span className="block text-xs text-gray-400">
                                                    {[shippingLabel(p.shippingMode), fmtDay(p.orderDate), `${p.itemCount} item${p.itemCount === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                                                </span>
                                            </span>
                                            <Badge tone={st.tone}>{st.label}</Badge>
                                            <span className="w-28 text-right tabular-nums">
                                                <span className="block font-medium text-gray-900">{taka(p.grandTotal)}</span>
                                                <span className={cx('block text-xs', p.due > 0 ? 'text-amber-600' : 'text-gray-400')}>
                                                    {p.status === 'cancelled' ? 'cancelled' : p.due > 0 ? `due ${taka(p.due)}` : 'settled'}
                                                </span>
                                            </span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>
            )}
        </Modal>
    );
}
