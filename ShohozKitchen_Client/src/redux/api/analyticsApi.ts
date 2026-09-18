import { baseApi } from './baseApi';

// ════════════════════════════════════════════════════════════
//  Response types — mirror analytics.service.ts shapes 1:1
// ════════════════════════════════════════════════════════════

export interface LowStockProduct {
    _id: string;
    name: string;
    thumbnail: string;
    stock: number;
    shopName: string;
}

export interface ReturnsSummary {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    refunded: number;
    refundAmount: number;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

export const analyticsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // ── ADMIN enhancements ──
        getLowStock: builder.query<ApiResponse<LowStockProduct[]>, number | void>({
            query: (threshold) => ({
                url: '/analytics/low-stock',
                params: threshold ? { threshold } : undefined,
            }),
            providesTags: ['Analytics', 'Products'],
        }),
        getReturnsSummary: builder.query<ApiResponse<ReturnsSummary>, void>({
            query: () => '/analytics/returns-summary',
            providesTags: ['Analytics', 'Returns'],
        }),
    }),
    overrideExisting: false,
});

export const {    useGetLowStockQuery,
    useGetReturnsSummaryQuery,
} = analyticsApi;
