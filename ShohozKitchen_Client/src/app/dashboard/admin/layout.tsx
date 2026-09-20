"use client";

import AdminLayout from '@/components/admin/AdminLayout';
import AuthGuard from '@/components/shared/AuthGuard';

export default function AdminRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Staff only: super admin, admin and editor. What each role may open is decided in
    // components/admin/access.ts (AdminLayout redirects away from anything else).
    return (
        <AuthGuard requiredRole={['admin', 'editor']}>
            <AdminLayout>{children}</AdminLayout>
        </AuthGuard>
    );
}
