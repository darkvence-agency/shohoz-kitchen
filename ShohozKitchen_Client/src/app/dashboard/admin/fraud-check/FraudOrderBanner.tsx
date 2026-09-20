"use client";

import React from 'react';
import Link from 'next/link';
import { LuShieldAlert, LuShieldCheck, LuBan, LuArrowRight } from 'react-icons/lu';
import { cx } from '@/components/admin/ui';
import { useGetFraudFlagForOrderQuery } from '@/redux/api/fraudApi';
import { bdDate, plural, orderClosed, closedHint } from './shared';

/**
 * A small warning on the admin order page when Fraud check flagged this order.
 * Self-contained: it renders nothing while loading, when the order isn't flagged,
 * or if the fraud API fails, so it can never break the order page.
 */
export default function FraudOrderBanner({ orderId }: { orderId?: string }) {
    const { data, isError } = useGetFraudFlagForOrderQuery(orderId || '', { skip: !orderId });
    const f = data?.data;
    if (!orderId || isError || !f) return null;

    const tone = f.status === 'review'
        ? { box: 'border-amber-200 bg-amber-50', text: 'text-amber-900', sub: 'text-amber-800/80', icon: <LuShieldAlert size={20} className="text-amber-600" /> }
        : f.status === 'cleared'
            ? { box: 'border-emerald-200 bg-emerald-50', text: 'text-emerald-900', sub: 'text-emerald-800/80', icon: <LuShieldCheck size={20} className="text-emerald-600" /> }
            : { box: 'border-red-200 bg-red-50', text: 'text-red-900', sub: 'text-red-800/80', icon: <LuBan size={20} className="text-red-600" /> };

    const by = [f.reviewedBy?.firstName, f.reviewedBy?.lastName].filter(Boolean).join(' ');
    const last = f.previousReturns[0];
    const matched = f.matchedBy.map((k) => (k === 'account' ? 'same account' : `same ${k}`)).join(', ');
    const state = f.status === 'review'
        ? (orderClosed(f) ? `Flag still open · ${closedHint(f)}` : 'Needs review')
        : f.status === 'cleared'
            ? `Cleared${by ? ` by ${by}` : ''}${f.reviewedAt ? ` on ${bdDate(f.reviewedAt)}` : ''}`
            : 'Order cancelled';
    const params = new URLSearchParams({ search: f.orderRef, status: 'all' });
    if (f.customer.phone) params.set('q', f.customer.phone);

    return (
        <div role="status" className={cx('flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between', tone.box)}>
            <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 shrink-0">{tone.icon}</span>
                <div className="min-w-0">
                    <p className={cx('text-sm font-semibold', tone.text)}>
                        This customer returned {plural(f.returnCount, 'order')} before
                    </p>
                    <p className={cx('mt-0.5 text-xs', tone.sub)}>
                        {[
                            matched && `Matched by ${matched}`,
                            last && `last return ${last.orderRef}${last.date ? ` on ${bdDate(last.date)}` : ''}`,
                            state,
                        ].filter(Boolean).join(' · ')}
                    </p>
                    {f.reviewNote && <p className={cx('mt-1 break-words text-xs', tone.sub)}>Note: {f.reviewNote}</p>}
                </div>
            </div>
            <Link
                href={`/dashboard/admin/fraud-check?${params.toString()}`}
                className={cx('inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs font-semibold hover:bg-white/70 sm:self-auto', tone.text)}
            >
                Open in Fraud check <LuArrowRight size={13} />
            </Link>
        </div>
    );
}
