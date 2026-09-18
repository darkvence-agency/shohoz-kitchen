import { redirect } from 'next/navigation';

// A super admin uses the SAME dashboard as an admin (role superset). There is no
// separate /dashboard/superadmin section, so anything that lands here — a stale
// bookmark, an older build's login redirect, an external link — is sent to the
// real admin dashboard instead of hitting a 404.
export default function SuperadminDashboardAlias() {
    redirect('/dashboard/admin');
}
