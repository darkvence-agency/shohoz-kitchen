"use client";

import React from 'react';
import Link from 'next/link';
import { LuCircleCheck, LuTriangleAlert } from 'react-icons/lu';
import { Modal, Btn, Badge, TH, TD, TR, EmptyRow, SkeletonRows, taka, fmtDateTime, cx } from '@/components/admin/ui';
import { useGetCourierPayoutQuery, type IPayoutParcel } from '@/redux/api/payoutApi';

/** What we expected Steadfast to collect for this parcel, from our own order. */
const expectedCod = (p: IPayoutParcel) =>
    p.order && p.order.paymentMethod === 'cod' ? p.order.total : null;

/**
 * The parcels on one Steadfast statement, each matched to our order by
 * consignment id (or the invoice we sent), with a flag where the cash they
 * collected differs from the order total.
 */
export default function StatementModal({ id, onClose }: { id: string; onClose: () => void }) {
    const { data, isLoading, isError } = useGetCourierPayoutQuery(id);
    const p = data?.data;
    const parcels = p?.parcels || [];
    const matched = parcels.filter((x) => x.order).length;
    const mismatched = parcels.filter((x) => {
        const exp = expectedCod(x);
        return exp !== null && Math.abs(exp - x.codCollected) > 1;
    }).length;

    return (
        <Modal
            open
            onClose={onClose}
            width="max-w-4xl"
            title={p ? `Statement ${p.reference}` : 'Statement'}
            subtitle={p ? `Received ${fmtDateTime(p.receivedAt)}` : undefined}
            footer={<Btn onClick={onClose}>Close</Btn>}
        >
            {p && (
                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        ['COD collected', taka(p.codCollected)],
                        ['Delivery bills', taka(p.deliveryBills)],
                        ['COD fee', taka(p.codFee)],
                        ['Amount sent', taka(p.amount)],
                    ].map(([label, value], i) => (
                        <div key={label} className="rounded-xl bg-gray-50 px-3 py-2.5">
                            <p className="text-xs text-gray-500">{label}</p>
                            <p className={cx('mt-0.5 text-base font-semibold', i === 3 ? 'text-gray-900' : 'text-gray-700')}>{value}</p>
                        </div>
                    ))}
                </div>
            )}

            {parcels.length > 0 && (
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <span>{matched} of {parcels.length} parcels matched to your orders.</span>
                    {mismatched > 0 && <Badge tone="amber">{mismatched} with a different COD than the order</Badge>}
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-gray-200">
                <div className="max-h-[50vh] overflow-auto">
                    <table className="w-full">
                        <thead className="sticky top-0 bg-white">
                            <tr>
                                <th className={TH}>Parcel</th>
                                <th className={TH}>Order</th>
                                <th className={`${TH} text-right`}>COD collected</th>
                                <th className={`${TH} text-right`}>Delivery</th>
                                <th className={`${TH} text-right`}>COD fee</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? <SkeletonRows rows={4} cols={5} /> : isError ? (
                                <EmptyRow colSpan={5}>Could not load this statement.</EmptyRow>
                            ) : parcels.length === 0 ? (
                                <EmptyRow colSpan={5}>
                                    {p?.source === 'manual' ? 'Manual payouts have no parcel list.' : 'Steadfast’s statement did not list its parcels.'}
                                </EmptyRow>
                            ) : parcels.map((x, i) => {
                                const exp = expectedCod(x);
                                const off = exp !== null && Math.abs(exp - x.codCollected) > 1;
                                return (
                                    <tr key={`${x.consignmentId}-${i}`} className={TR}>
                                        <td className={TD}>
                                            <p className="font-medium text-gray-900">{x.trackingCode || x.consignmentId || '—'}</p>
                                            <p className="mt-0.5 text-xs text-gray-400">{[x.consignmentId && x.trackingCode ? `CID ${x.consignmentId}` : '', x.status].filter(Boolean).join(' · ')}</p>
                                        </td>
                                        <td className={TD}>
                                            {x.order ? (
                                                <Link href={`/dashboard/admin/orders/${x.order._id}`} className="font-medium text-gray-900 hover:text-[var(--color-primary)]">{x.order.orderId}</Link>
                                            ) : <span className="text-gray-400">{x.invoice || 'Not matched'}</span>}
                                        </td>
                                        <td className={`${TD} whitespace-nowrap text-right`}>
                                            <span className="inline-flex items-center gap-1.5">
                                                {exp !== null && (off
                                                    ? <span title={`Order total ${taka(exp)}`}><LuTriangleAlert size={14} className="text-amber-500" /></span>
                                                    : <LuCircleCheck size={14} className="text-emerald-500" />)}
                                                {taka(x.codCollected)}
                                            </span>
                                            {off && <p className="mt-0.5 text-xs text-amber-600">order {taka(exp)}</p>}
                                        </td>
                                        <td className={`${TD} whitespace-nowrap text-right text-gray-500`}>
                                            {taka(x.deliveryCharge)}
                                            {x.order && <p className="mt-0.5 text-xs text-gray-400">charged {taka(x.order.shippingCost)}</p>}
                                        </td>
                                        <td className={`${TD} whitespace-nowrap text-right text-gray-500`}>{taka(x.codFee)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {p?.note && <p className="mt-3 text-sm text-gray-500"><span className="font-medium text-gray-700">Note:</span> {p.note}</p>}
        </Modal>
    );
}
