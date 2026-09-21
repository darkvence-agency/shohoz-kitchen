"use client";

import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import AdminDashboard from '@/components/admin/AdminDashboard';
import EditorDashboard from '@/components/admin/EditorDashboard';

// Same address for every staff role, different page: editors get their own work
// and the order queue; admins get the shop's figures. Nothing renders until the
// role is known, so an editor never fires the admin-only dashboard requests.
export default function AdminPage() {
    const role = useSelector((s: RootState) => s.auth.user?.role);
    if (!role) return null;
    return role === 'editor' ? <EditorDashboard /> : <AdminDashboard />;
}
