"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/admin/ui';
import PurchaseForm from '../_components/PurchaseForm';
import { PURCHASES_HREF } from '../_components/shared';

// useSearchParams needs a Suspense boundary.
export default function NewPurchasePage() {
    return (
        <Suspense fallback={null}>
            <NewPurchaseInner />
        </Suspense>
    );
}

function NewPurchaseInner() {
    // ?supplier=<id> pre-selects the supplier (from Suppliers, or a filtered Purchases list).
    const supplier = useSearchParams().get('supplier') || undefined;
    return (
        <div>
            <PageHeader
                back={{ href: PURCHASES_HREF, label: 'Purchases' }}
                title="New purchase"
                subtitle="Record an order placed with a supplier. The reference number (PO…) is given when you save."
            />
            <PurchaseForm initialSupplier={supplier} />
        </div>
    );
}
