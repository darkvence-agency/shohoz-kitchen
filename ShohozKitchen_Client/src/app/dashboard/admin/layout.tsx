"use client";

import AdminLayout from '@/components/admin/AdminLayout';
import AuthGuard from '@/components/shared/AuthGuard';

export default function AdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard requiredRole="admin">
            <AdminLayout>{children}</AdminLayout>
        </AuthGuard>
    );
}
