import { baseApi } from './baseApi';

export const dashboardApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getDashboardSummary: builder.query({
            query: () => '/analytics/dashboard',
            providesTags: ['Analytics'],
        }),
        getRevenueStats: builder.query({
            query: ({ startDate, endDate }) => ({
                url: `/analytics/revenue`,
                params: { startDate, endDate },
            }),
            providesTags: ['Analytics'],
        }),
        getMonthlyRevenue: builder.query({
            query: () => '/analytics/monthly-revenue',
            providesTags: ['Analytics'],
        }),
        getRecentOrders: builder.query({
            query: (limit = 10) => `/analytics/recent-orders?limit=${limit}`,
            providesTags: ['Orders'],
        }),
        getTopProducts: builder.query({
            query: (limit = 10) => `/analytics/top-products?limit=${limit}`,
            providesTags: ['Products'],
        }),
        getSalesByCategory: builder.query({
            query: () => '/analytics/sales-by-category',
            providesTags: ['Analytics', 'Products'],
        }),
        getApiHealth: builder.query({
            query: () => '/health',
            providesTags: ['Stats'],
        }),
    }),
});

export const {
    useGetDashboardSummaryQuery,
    useGetRevenueStatsQuery,
    useGetMonthlyRevenueQuery,
    useGetRecentOrdersQuery,
    useGetTopProductsQuery,
    useGetSalesByCategoryQuery,
    useGetApiHealthQuery,
} = dashboardApi;
