/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';

type Role = 'superadmin' | 'admin' | 'user';

interface AuthGuardProps {
    children: ReactNode;
    requiredRole?: Role | Role[];
}

// Role-based route guard (Daraz-style).
// - While auth state hydrates on first mount, shows a lightweight loader (no redirect flash).
// - Unauthenticated users -> /login?redirect=<currentPath>.
// - Authenticated users without an allowed role -> /.
// - Otherwise renders children.
function AuthGuard({ children, requiredRole }: AuthGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { user, token } = useSelector((state: RootState) => state.auth);

    // Hydration flag: avoid SSR mismatch and don't flash a redirect before
    // the persisted auth state / localStorage token is available on the client.
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    // Resolve a token from either Redux or localStorage (in case the slice
    // hasn't rehydrated the token yet but it persists in storage).
    const hasToken = (() => {
        if (token) return true;
        if (typeof window !== 'undefined') {
            return !!window.localStorage.getItem('token');
        }
        return false;
    })();

    // If there is a token in storage, but user object is not yet loaded into Redux:
    // Auth is still hydrating! Do NOT redirect to login; wait for AuthHydrator.
    const isHydrating = !mounted || (hasToken && !user);

    const allowedRoles: Role[] | null = requiredRole
        ? (Array.isArray(requiredRole) ? requiredRole : [requiredRole])
        : null;

    // Superadmin is a strict superset of admin — it can access everything an admin can,
    // including admin-only routes. A superadmin-only route still excludes plain admins.
    const roleAllowed =
        !allowedRoles ||
        user?.role === 'superadmin' ||
        (!!user?.role && allowedRoles.includes(user.role));

    useEffect(() => {
        // While still mounting or hydrating from token, do nothing
        if (isHydrating) return;

        // If no token exists and no user exists -> genuinely unauthenticated
        if (!hasToken && !user) {
            const redirect = encodeURIComponent(pathname || '/');
            router.replace(`/login?redirect=${redirect}`);
            return;
        }

        // If user is authenticated but doesn't have role permission
        if (user && !roleAllowed) {
            router.replace('/');
        }
    }, [isHydrating, hasToken, user, roleAllowed, pathname, router]);

    // Still hydrating: render a sleek, lightweight loader (no redirect flash).
    if (isHydrating) {
        return (
            <div style={{
                minHeight: '60vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#94A3B8', fontSize: '14px',
            }}>
                <div className="flex flex-col items-center gap-2.5">
                    <div className="w-8 h-8 border-3 border-green-600/20 border-t-green-600 rounded-full animate-spin" />
                    <span className="text-xs text-gray-400 font-medium">Verifying access...</span>
                </div>
            </div>
        );
    }

    // Not authenticated or not authorized: render nothing while redirecting.
    if (!user || !roleAllowed) {
        return null;
    }

    return <>{children}</>;
}

export default AuthGuard;
