"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/ui';
import LookupCard from './LookupCard';
import FlaggedOrders, { type StatusFilter } from './FlaggedOrders';

/**
 * Fraud check (admin only).
 *  - Lookup: a phone number's or email's delivery, cancellation and return history on this store.
 *  - Flagged orders: orders placed by a customer (same phone, email or account) who returned an
 *    order before. They are flagged automatically at checkout; the admin clears them or cancels.
 *
 * Links in: ?q=<phone or email> runs the lookup, ?search=<text>&status=<review|cleared|cancelled|all>
 * filters the flagged orders (the order page's warning banner and admin notifications use these).
 */
const STATUSES: StatusFilter[] = ['review', 'cleared', 'cancelled', 'all'];

// useSearchParams needs a Suspense boundary (Next.js falls back to client rendering up to it).
export default function FraudCheckPage() {
    return (
        <Suspense fallback={null}>
            <FraudCheckInner />
        </Suspense>
    );
}

function FraudCheckInner() {
    const params = useSearchParams();
    const q = params.get('q') || '';
    const search = params.get('search') || '';
    const statusParam = params.get('status') as StatusFilter | null;
    const status = statusParam && STATUSES.includes(statusParam) ? statusParam : 'review';

    return (
        <div>
            <PageHeader
                title="Fraud check"
                subtitle="Look up a phone number's delivery, cancellation and return history on this store, and review orders from customers who returned an order before."
            />
            <LookupCard key={`q:${q}`} initialQuery={q} />
            <FlaggedOrders key={`f:${search}|${status}`} initialSearch={search} initialStatus={status} />
        </div>
    );
}
