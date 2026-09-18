'use client';

import { ProductForm } from '@/components/dashboard/ProductForm';

// Admin / Super-admin product create & edit (edit via ?id=<productId>).
// Uses the shared Daraz-style product form.
export default function AdminProductFormPage() {
    return <ProductForm />;
}
