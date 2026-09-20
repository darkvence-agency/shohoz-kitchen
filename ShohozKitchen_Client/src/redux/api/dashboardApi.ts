import { baseApi } from './baseApi';

/* ─── GET /dashboard/summary — the admin home page in one call ─────────────
 * Money is BDT as a plain number. Day keys are 'YYYY-MM-DD' in Asia/Dhaka. */

export interface DashboardDay {
    date: string;
    revenue: number;
    orders: number;
    cancelled: number;
}

export interface DashboardStatusCount {
    status: string;
    count: number;
}

export interface DashboardSummary {
    generatedAt: string;
    timezone: string;
    today: string;

    revenueToday: number;
    deliveryToday: number;
    ordersToday: number;
    pendingOrders: number;
    /** At moving-average cost — the same figure as Inventory's "Stock value". */
    stockValue: number;
    stockUnits: number;
    skuCount: number;
    /** In-stock products with no cost yet, so missing from stockValue. */
    stockUncosted: number;
    customers: number;
    newCustomers30d: number;

    series: DashboardDay[];
    seriesTotals: { revenue: number; orders: number; cancelled: number };
    previousTotals: { revenue: number; orders: number };

    needsAttention: {
        pendingOrders: number;
        courierFlagged: number;
        courierFlaggedByStatus: DashboardStatusCount[];
        outOfStock: number;
        lowStock: number;
        lowStockLimit: number;
        pendingReviews: number;
        pendingReturns: number;
    };
    lowestStock: { _id: string; name: string; sku: string; stock: number; unit: string }[];

    todayByStatus: DashboardStatusCount[];
    latestOrders: {
        _id: string;
        orderId: string;
        customer: string;
        phone: string;
        status: string;
        paymentStatus: string;
        paymentMethod: string;
        total: number;
        itemCount: number;
        createdAt: string;
    }[];

    topProducts: {
        productId: string;
        name: string;
        thumbnail: string;
        units: number;
        revenue: number;
        stock: number | null;
    }[];
    salesByCategory: { categoryId: string | null; name: string; revenue: number; units: number }[];
}

export const dashboardApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Admin home. Also tagged with the collections it summarises, so an order,
        // product, review or return change elsewhere refreshes it.
        getAdminDashboard: builder.query<DashboardSummary, void>({
            query: () => '/dashboard/summary',
            transformResponse: (res: { data: DashboardSummary }) => res.data,
            providesTags: ['Dashboard', 'Orders', 'Products', 'Reviews', 'Returns'],
        }),

        // ── Older /analytics endpoints, still used by the Reports, Health, Payments
        //    and Scanner pages ──
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
    useGetAdminDashboardQuery,
    useGetDashboardSummaryQuery,
    useGetRevenueStatsQuery,
    useGetMonthlyRevenueQuery,
    useGetRecentOrdersQuery,
    useGetTopProductsQuery,
    useGetSalesByCategoryQuery,
    useGetApiHealthQuery,
} = dashboardApi;
