"use client";

import React from 'react';
import { LuPhone, LuMail, LuUserRound } from 'react-icons/lu';
import { Badge, cx, type Tone } from '@/components/admin/ui';
import { getStatusConfig } from '@/lib/orderStatus';
import type { FraudFlagStatus, FraudMatchKind, FraudReturnStatus, FraudRisk, IFraudFlag } from '@/redux/api/fraudApi';

type ApiError = { data?: { message?: string; errorMessages?: { message?: string }[] } };
export const errMsg = (err: unknown, fallback: string) => {
    const e = err as ApiError;
    return e?.data?.errorMessages?.[0]?.message || e?.data?.message || fallback;
};

/* ─── Dates, always in Bangladesh time ─── */

const TZ = 'Asia/Dhaka';

/** 22 Aug 2026 */
export const bdDate = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ }) : '—';

/** 22 Aug 2026, 4:51 pm */
export const bdDateTime = (d?: string | Date | null) =>
    d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ }) : '—';

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;

/* ─── Badges ─── */

/** An order status, in the same colours as the Orders pages. */
export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
    const c = getStatusConfig(status);
    return (
        <span className={cx('inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', c.badgeBg, c.badgeText, className)}>
            {c.label}
        </span>
    );
}

export const FLAG_STATUS: Record<FraudFlagStatus, { label: string; tone: Tone }> = {
    review: { label: 'Needs review', tone: 'amber' },
    cleared: { label: 'Cleared', tone: 'green' },
    cancelled: { label: 'Order cancelled', tone: 'red' },
};

export function FlagStatusBadge({ status }: { status: FraudFlagStatus }) {
    const s = FLAG_STATUS[status] || FLAG_STATUS.review;
    return <Badge tone={s.tone}>{s.label}</Badge>;
}

const MATCH: Record<FraudMatchKind, { label: string; icon: React.ReactNode; title: string }> = {
    phone: { label: 'Phone', icon: <LuPhone size={11} />, title: 'The earlier return used the same phone number' },
    email: { label: 'Email', icon: <LuMail size={11} />, title: 'The earlier return used the same email' },
    account: { label: 'Account', icon: <LuUserRound size={11} />, title: 'The earlier return was placed from the same customer account' },
};

export function MatchChips({ kinds }: { kinds: FraudMatchKind[] }) {
    if (!kinds?.length) return null;
    return (
        <div className="mt-1.5 flex flex-wrap gap-1">
            {kinds.map((k) => (
                <span key={k} title={MATCH[k]?.title} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                    {MATCH[k]?.icon}{MATCH[k]?.label || k}
                </span>
            ))}
        </div>
    );
}

export const RISK: Record<FraudRisk, { label: string; tone: Tone; hint: string }> = {
    none: { label: 'No history', tone: 'gray', hint: 'No orders on this store yet' },
    low: { label: 'Low risk', tone: 'green', hint: 'Never returned or refused an order' },
    medium: { label: 'Medium risk', tone: 'amber', hint: 'Returned or refused some orders' },
    high: { label: 'High risk', tone: 'red', hint: 'Returned or refused 3 or more orders, or at least 30% of the ones sent out' },
};

export function RiskBadge({ risk, className }: { risk: FraudRisk; className?: string }) {
    const r = RISK[risk] || RISK.none;
    return <Badge tone={r.tone} className={cx('px-2.5 py-1 text-[13px]', className)}>{r.label}</Badge>;
}

export function ReturnStatusBadge({ status }: { status: FraudReturnStatus }) {
    if (status === 'refunded') return <Badge tone="rose">Refunded</Badge>;
    if (status === 'refused') {
        return (
            <span title="Cancelled after it went to the courier, usually a parcel the customer refused at the door">
                <Badge tone="amber">Refused</Badge>
            </span>
        );
    }
    return <Badge tone="gray">Returned</Badge>;
}

/** "cancelled" / "out for delivery": an order status in words, for sentences. */
export const orderStatusWords = (s?: string | null) => String(s || 'closed').replace(/_/g, ' ');

/**
 * Still waiting for review, but its order was cancelled, delivered or deleted outside
 * Fraud check (the server normally closes such flags itself; this covers older ones).
 */
export const orderClosed = (f: IFraudFlag) => f.status === 'review' && !f.orderOpen;
export const closedHint = (f: IFraudFlag) =>
    f.order ? `Order already ${orderStatusWords(f.order.status)}, nothing left to check` : 'The order was deleted';
