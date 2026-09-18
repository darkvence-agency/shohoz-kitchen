/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { hydrateCart } from './slices/cartSlice';
import { hydrateWishlist } from './slices/wishlistSlice';
import { useGetMeQuery } from './api/userApi';
import { useAppDispatch, useAppSelector } from './hooks';
import { loginSuccess } from './slices/authSlice';

interface ReduxProviderProps {
    children: React.ReactNode;
}

/**
 * Rehydrate the auth slice on app load. Only the JWT is persisted (localStorage
 * 'token'); the `auth.user` slice is in-memory, so a page refresh would otherwise
 * leave a logged-in user looking logged out (Header shows "Login", greeting shows
 * "User") even though their token is valid. Here we re-fetch the current user from
 * the token and repopulate the slice, mapping firstName/lastName → name exactly like
 * the login/register pages do.
 */
function AuthHydrator() {
    const dispatch = useAppDispatch();
    const user = useAppSelector((s) => s.auth.user);
    const [token, setToken] = useState<string | null>(null);

    // localStorage is client-only — read it after mount.
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            setToken(storedToken);

            if (storedToken && storedUser && !user) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    dispatch(loginSuccess({ user: parsedUser, token: storedToken }));
                } catch {
                    /* ignore */
                }
            }
        }
    }, [user, dispatch]);

    // Fetch fresh user profile when token exists (always keep profile updated)
    const { data, error } = useGetMeQuery(undefined, { skip: !token });

    useEffect(() => {
        if (data?.data && token) {
            const u: any = data.data;
            dispatch(
                loginSuccess({
                    user: {
                        id: u._id,
                        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
                        email: u.email,
                        phone: u.phone || '',
                        avatar: u.avatar || '',
                        role: u.role,
                    },
                    token,
                })
            );
        }
    }, [data, token, dispatch]);

    // A stale/invalid token would make every request fail — clear it so the app is
    // cleanly logged out (only on a genuine auth failure, not a transient network error).
    useEffect(() => {
        const status = (error as any)?.status;
        if (token && (status === 401 || status === 403)) {
            if (typeof window !== 'undefined') {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
            setToken(null);
        }
    }, [error, token]);

    return null;
}

export const ReduxProvider: React.FC<ReduxProviderProps> = ({ children }) => {
    useEffect(() => {
        store.dispatch(hydrateCart());
        store.dispatch(hydrateWishlist());
    }, []);

    return (
        <Provider store={store}>
            <AuthHydrator />
            {children}
        </Provider>
    );
};
