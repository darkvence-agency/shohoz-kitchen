"use client";

import { Suspense } from 'react';
import UserLayout from '@/components/user/UserLayout';
import AuthGuard from '@/components/shared/AuthGuard';

export default function UserDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            {/* Suspense — UserLayout reads useSearchParams (cancellations tab highlight) */}
            <Suspense fallback={null}>
                <UserLayout>{children}</UserLayout>
            </Suspense>
        </AuthGuard>
    );
}
