import { baseApi } from './baseApi';

// ════════════════════════════════════════════════════════════
//  Response types — mirror analytics.service.ts shapes 1:1
// ════════════════════════════════════════════════════════════

/** A report period: Bangladesh calendar days, YYYY-MM-DD, `to` inclusive. */
export interface ReportPeriod {
    from: string;
    to: string;
}

/** The seven groups the Sales report folds order statuses into. */
export type StatusBucket = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled';

export interface ReturnsSummary {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    refunded: number;
    refundAmount: number;
}

export interface SalesReport {
    period: {
        from: string;
        to: string;
        days: number;
        timezone: string;
        granularity: 'hour' | 'day' | 'month';
        previous: ReportPeriod;
    };
    summary: {
        /** every order placed in the period, cancelled included */
        ordersReceived: number;
        /** orders placed in the period that were not cancelled */
        activeOrders: number;
        /** money totals below leave cancelled orders out */
        orderValue: number;
        subtotal: number;
        deliveryFees: number;
        discount: number;
        itemsSold: number;
        avgOrderValue: number;
        paidValue: number;
        paidOrders: number;
        freeDeliveryOrders: number;
        customers: number;
        newCustomers: number;
        cancelledOrders: number;
        cancelledValue: number;
    };
    previous: { ordersReceived: number; orderValue: number; deliveryFees: number; itemsSold: number };
    byStatus: Record<StatusBucket, number>;
    byStatusValue: Record<StatusBucket, number>;
    /** raw order statuses, e.g. { on_the_way: 2 } */
    statusDetail: Record<string, number>;
    /** hour "00".."23" for one day, "YYYY-MM-DD" per day, or "YYYY-MM" per month */
    trend: { key: string; orders: number; value: number }[];
    productsSold: {
        productId: string | null;
        name: string;
        thumbnail: string;
        sku: string;
        unit: string;
        /** current stock; null when the product no longer exists */
        stock: number | null;
        status: string;
        deleted: boolean;
        qty: number;
        revenue: number;
        orders: number;
    }[];
    byCategory: { _id: string; name: string; qty: number; revenue: number; products: number }[];
    payments: { method: string; orders: number; value: number; paid: number }[];
    returns: ReturnsSummary;
}

export interface PeriodOrder {
    _id: string;
    orderId: string;
    customer: string;
    phone: string;
    items: number;
    subtotal: number;
    shippingCost: number;
    discount: number;
    total: number;
    paymentMethod: string;
    paymentStatus: string;
    status: string;
    bucket: StatusBucket;
    consignmentId: string;
    createdAt: string;
}

export interface LowStockProduct {
    _id: string;
    name: string;
    thumbnail: string;
    stock: number;
    sku: string;
    unit: string;
    lowStockThreshold: number;
    status: string;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
}

interface PagedResponse<T> extends ApiResponse<T> {
    meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface PeriodOrdersArgs extends ReportPeriod {
    status?: StatusBucket;
    page?: number;
    limit?: number;
}

/** Every order status a staff member can move an order to. */
export type OrderStatus =
    | 'pending' | 'confirmed' | 'processing' | 'shipped' | 'on_the_way'
    | 'out_for_delivery' | 'delivery_attempt' | 'delivered' | 'cancelled' | 'returned' | 'refunded';

/** One staff member's tally for the period. */
export interface StaffRow {
    actor: string;
    name: string;
    email: string;
    role: string;
    confirmed: number;
    delivered: number;
    cancelled: number;
    other: number;
    total: number;
    confirmedValue: number;
}

export interface StaffActivityReport {
    from: string;
    to: string;
    rows: StaffRow[];
    trend: { day: string; confirmed: number; total: number }[];
    totals: { confirmed: number; delivered: number; cancelled: number; total: number; confirmedValue: number };
}

export interface StaffHistoryRow {
    id: string;
    at: string;
    actor: string;
    name: string;
    role: string;
    orderId: string;
    orderNo: string;
    from: string;
    to: string;
    total: number;
}

/** The signed-in staff member's own dashboard. */
export interface MyActivity {
    from: string;
    to: string;
    me: { confirmed: number; delivered: number; cancelled: number; other: number; total: number; confirmedValue: number };
    rank: number | null;
    staffCount: number;
    recent: StaffHistoryRow[];
    queue: { toConfirm: number; toShip: number; onTheWay: number };
}

export interface StaffHistoryArgs extends ReportPeriod {
    actor?: string;
    status?: OrderStatus | '';
    page?: number;
    limit?: number;
}

export const analyticsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // ── Sales report ──
        getSalesReport: builder.query<ApiResponse<SalesReport>, ReportPeriod>({
            query: ({ from, to }) => ({ url: '/analytics/sales-report', params: { from, to } }),
            // Also carries live product stock (the "In stock" column) and the returns summary.
            providesTags: ['Analytics', 'Orders', 'Products', 'Inventory', 'Returns'],
        }),
        getSalesReportOrders: builder.query<PagedResponse<PeriodOrder[]>, PeriodOrdersArgs>({
            query: ({ from, to, status, page, limit }) => ({
                url: '/analytics/sales-report/orders',
                params: { from, to, ...(status ? { status } : {}), ...(page ? { page } : {}), ...(limit ? { limit } : {}) },
            }),
            providesTags: ['Analytics', 'Orders'],
        }),

        // ── Stock + returns ──
        /** No threshold = each product's own restock level. */
        getLowStock: builder.query<ApiResponse<LowStockProduct[]>, number | void>({
            query: (threshold) => ({
                url: '/analytics/low-stock',
                params: threshold !== undefined && threshold !== null ? { threshold } : undefined,
            }),
            providesTags: ['Analytics', 'Products', 'Inventory'],
        }),
        /** All time, or return requests raised within a period. */
        getReturnsSummary: builder.query<ApiResponse<ReturnsSummary>, ReportPeriod | void>({
            query: (period) => ({
                url: '/analytics/returns-summary',
                params: period ? { from: period.from, to: period.to } : undefined,
            }),
            providesTags: ['Analytics', 'Returns'],
        }),

        /** Leaderboard: who moved how many orders in the period. */
        getStaffActivity: builder.query<ApiResponse<StaffActivityReport>, ReportPeriod>({
            query: ({ from, to }) => ({ url: '/analytics/staff-orders', params: { from, to } }),
            providesTags: ['Analytics', 'Orders'],
        }),

        /** The signed-in staff member's own numbers (editors can call this). */
        getMyActivity: builder.query<ApiResponse<MyActivity>, ReportPeriod>({
            query: ({ from, to }) => ({ url: '/analytics/my-activity', params: { from, to } }),
            providesTags: ['Analytics', 'Orders'],
        }),

        /** The raw change log behind the leaderboard, newest first. */
        getStaffHistory: builder.query<PagedResponse<StaffHistoryRow[]>, StaffHistoryArgs>({
            query: ({ from, to, actor, status, page, limit }) => ({
                url: '/analytics/staff-orders/history',
                params: { from, to, actor: actor || undefined, status: status || undefined, page, limit },
            }),
            providesTags: ['Analytics', 'Orders'],
        }),
    }),
    overrideExisting: false,
});

export const {
    useGetSalesReportQuery,
    useGetSalesReportOrdersQuery,
    useLazyGetSalesReportOrdersQuery,
    useGetLowStockQuery,
    useGetReturnsSummaryQuery,
    useGetStaffActivityQuery,
    useGetStaffHistoryQuery,
    useGetMyActivityQuery,
} = analyticsApi;
