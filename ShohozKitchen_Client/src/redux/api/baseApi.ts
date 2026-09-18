import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { RootState } from '../store';
import { logout } from '../slices/authSlice';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const rawBaseQuery = fetchBaseQuery({
    baseUrl: API_URL,
    prepareHeaders: (headers, { getState }) => {
        const token = (getState() as RootState).auth.token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
        if (token) {
            headers.set('authorization', `Bearer ${token}`);
        }
        return headers;
    },
});

// Wrapper that handles 401 → auto logout
const baseQueryWithAuth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (args, api, extraOptions) => {
    const result = await rawBaseQuery(args, api, extraOptions);

    if (result.error && result.error.status === 401) {
        // Token expired or invalid — only logout & redirect if user had a token
        const token = (api.getState() as RootState)?.auth?.token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
        if (token) {
            api.dispatch(logout());
            if (typeof window !== 'undefined') {
                const currentPath = window.location.pathname;
                if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
                    window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&expired=true`;
                }
            }
        }
    }

    return result;
};

export const baseApi = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithAuth,
    tagTypes: ['Stats', 'Orders', 'Products', 'Users', 'Analytics', 'PageContent', 'SiteContent', 'Categories', 'Payments', 'Shipping', 'Coupons', 'Reviews', 'Shops', 'Offers', 'Roles', 'Invoices', 'Returns', 'Chat', 'Notifications'],
    endpoints: () => ({}),
});
