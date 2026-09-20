"use client";

import React from 'react';
import { LuMinus, LuEqual, LuArrowRight } from 'react-icons/lu';
import { taka, cx } from '@/components/admin/ui';
import type { IDeliveryEconomics } from '@/redux/api/payoutApi';

function Op({ children }: { children: React.ReactNode }) {
    return (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full bg-gray-100 text-gray-500" aria-hidden>
            {children}
        </span>
    );
}

function Figure({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
    return (
        <div className={cx('min-w-0 flex-1', className)}>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900">{value}</p>
            {hint && <p className="mt-0.5 text-xs text-gray-400">{hint}</p>}
        </div>
    );
}

/** Two thin bars on one scale, so "who paid more" reads at a glance. */
function Bars({ rows }: { rows: { label: string; value: number; tone: 'brand' | 'gray' }[] }) {
    const max = Math.max(1, ...rows.map((r) => r.value));
    return (
        <div className="mt-4 space-y-1.5">
            {rows.map((r) => (
                <div key={r.label} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-xs text-gray-500">{r.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                        <div
                            className={cx('h-full rounded-full', r.tone === 'brand' ? 'bg-[var(--color-primary)]' : 'bg-gray-400')}
                            style={{ width: `${Math.max(r.value > 0 ? 2 : 0, (r.value / max) * 100)}%` }}
                        />
                    </div>
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums text-gray-600">{taka(r.value)}</span>
                </div>
            ))}
        </div>
    );
}

const PANEL = 'rounded-2xl border border-gray-200 bg-white p-5';
const ROW = 'flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4';

/**
 * The money story for the period, in two sums:
 *  delivery — what customers paid us for delivery vs what Steadfast billed us;
 *  cash — what Steadfast collected at the door vs what actually reached us.
 */
export default function DeliveryEconomics({ e, loading }: { e?: IDeliveryEconomics; loading?: boolean }) {
    if (!e) {
        return (
            <div className="mb-3 grid gap-3 lg:grid-cols-2">
                {[0, 1].map((i) => <div key={i} className={cx(PANEL, 'h-[184px]', loading && 'animate-pulse bg-gray-50')} />)}
            </div>
        );
    }

    const net = e.deliveryNet;
    const tone = net > 0 ? 'green' : net < 0 ? 'red' : 'gray';
    const covered = e.paidToCourier > 0 ? Math.round((e.shippingCharged / e.paidToCourier) * 100) : null;
    // Payouts recorded without a breakdown: their money is real, but their charges are unknown.
    const unbroken = e.withoutBreakdown > 0
        ? `${e.withoutBreakdown.toLocaleString('en-IN')} payout${e.withoutBreakdown === 1 ? '' : 's'} (${taka(e.receivedWithoutBreakdown)}) recorded without a breakdown`
        : null;

    return (
        <div className="mb-3 grid gap-3 lg:grid-cols-2">
            {/* ─── Delivery: charged vs paid ─── */}
            <section className={PANEL}>
                <div className="mb-4">
                    <h2 className="text-[15px] font-semibold text-gray-900">Delivery economics</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Delivery charges customers paid, against what the courier billed you.</p>
                </div>
                <div className={ROW}>
                    <Figure
                        label="Charged to customers"
                        value={taka(e.shippingCharged)}
                        hint={`${e.deliveredOrders.toLocaleString('en-IN')} delivered order${e.deliveredOrders === 1 ? '' : 's'}`}
                    />
                    <Op><LuMinus size={14} /></Op>
                    <Figure
                        label="Paid to the courier"
                        value={taka(e.paidToCourier)}
                        hint={`${taka(e.deliveryBills)} bills + ${taka(e.codFee)} COD fees`}
                    />
                    <Op><LuEqual size={14} /></Op>
                    <div
                        className={cx(
                            'min-w-0 flex-1 rounded-xl px-3 py-2',
                            tone === 'green' && 'bg-emerald-50',
                            tone === 'red' && 'bg-red-50',
                            tone === 'gray' && 'bg-gray-50',
                        )}
                    >
                        <p className="text-xs text-gray-500">Difference</p>
                        <p className={cx(
                            'mt-0.5 text-lg font-semibold tracking-tight',
                            tone === 'green' && 'text-emerald-700',
                            tone === 'red' && 'text-red-600',
                            tone === 'gray' && 'text-gray-900',
                        )}>
                            {net > 0 ? '+' : net < 0 ? '−' : ''}{taka(Math.abs(net))}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                            {net > 0 ? 'Delivery paid for itself' : net < 0 ? 'You covered this from sales' : 'Break-even'}
                        </p>
                    </div>
                </div>
                <Bars rows={[
                    { label: 'Charged', value: e.shippingCharged, tone: 'brand' },
                    { label: 'Paid to courier', value: e.paidToCourier, tone: 'gray' },
                ]} />
                <p className="mt-2 text-xs text-gray-400">
                    {covered !== null && <>Customers covered {covered}% of the courier&apos;s charges. </>}
                    {e.deliveredViaSteadfast.toLocaleString('en-IN')} of {e.deliveredOrders.toLocaleString('en-IN')} delivered orders were booked through Steadfast.
                </p>
                {unbroken && (
                    <p className="mt-1 text-xs text-amber-700">
                        {unbroken}: their courier charges are unknown, so &ldquo;Paid to the courier&rdquo; leaves them out.
                    </p>
                )}
            </section>

            {/* ─── Cash: collected vs received ─── */}
            <section className={PANEL}>
                <div className="mb-4">
                    <h2 className="text-[15px] font-semibold text-gray-900">Cash from the door</h2>
                    <p className="mt-0.5 text-xs text-gray-500">Cash the courier collected, against what reached your bank.</p>
                </div>
                <div className={ROW}>
                    <Figure label="COD collected" value={taka(e.codCollected)} hint="by the courier" />
                    <Op><LuArrowRight size={14} /></Op>
                    <Figure
                        label="Received"
                        value={taka(e.receivedWithBreakdown)}
                        hint={e.withoutBreakdown > 0 ? 'on payouts with a breakdown' : 'reached you'}
                    />
                    <Op><LuEqual size={14} /></Op>
                    <div className="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2">
                        <p className="text-xs text-gray-500">Kept by the courier</p>
                        <p className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900">{taka(e.keptByCourier)}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                            {e.codCollected > 0 ? `${((e.keptByCourier / e.codCollected) * 100).toFixed(1)}% of the cash` : 'their charges'}
                        </p>
                    </div>
                </div>
                <Bars rows={[
                    { label: 'Your COD orders', value: e.codExpected, tone: 'gray' },
                    { label: 'Courier collected', value: e.codCollected, tone: 'brand' },
                ]} />
                <p className="mt-2 text-xs text-gray-400">
                    {e.codOrders.toLocaleString('en-IN')} cash-on-delivery order{e.codOrders === 1 ? ' was' : 's were'} delivered in this period.
                </p>
                {unbroken && (
                    <p className="mt-1 text-xs text-amber-700">
                        Plus {unbroken} — left out here, since what the courier collected for them is unknown.
                    </p>
                )}
            </section>
        </div>
    );
}
