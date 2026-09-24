import { baseApi } from './baseApi';

/**
 * The courier board's tabs — every parcel is in exactly one (courier.service.ts
 * TAB_EXPR on the API decides which, for both the list and the counts).
 */
export type CourierTab = 'new' | 'ready' | 'sent' | 'in_transit' | 'on_hold' | 'delivered' | 'returned' | 'cancelled';

/** What a parcel needs from a person: confirm a courier return, or call about a hold. */
export type CourierAttention = 'confirm_return' | 'on_hold' | null;

export interface ICourierCounts {
    counts: Record<CourierTab | 'all', number>;
    attention: { confirmReturn: number; onHold: number };
    setup: { configured: boolean; webhookSecured: boolean; autoSync: boolean };
}

export interface ICourierPackage {
    orderId: string;
    orderNo: string;
    packageId: string;
    tab: CourierTab;
    attention: CourierAttention;
    bookedAt?: string;
    status: string;
    subtotal: number;
    itemCount: number;
    items: { thumbnail?: string; name?: string; quantity?: number; color?: string; size?: string }[];
    consignmentId: string;
    trackingNumber: string;
    courierStatus: string;
    carrier: string;
    booked: boolean;
    paymentMethod: string;
    paymentStatus: string;
    codAmount: number;
    customer: string;
    phone: string;
    city: string;
    address?: string;
    area?: string;
    postalCode?: string;
    note?: string;
    createdAt: string;
}

export interface IBulkResult {
    total: number;
    booked?: number;
    ok?: number;
    failed: number;
    results: { orderId: string; packageId: string; ok: boolean; trackingNumber?: string; courierStatus?: string; needsConfirmation?: boolean; error?: string }[];
}

/** A package as saved right after it was booked (POST …/book returns it). */
export interface IBookedPackage {
    _id: string;
    status: string;
    consignmentId: string;
    trackingNumber: string;
    courierStatus: string;
    courierBookedAt?: string;
    carrier?: string;
}

/** GET …/status — the courier's latest word on one package (refreshPackageCore on the API). */
export interface ICourierRefreshResult {
    courierStatus: string;
    packageStatus: string;
    needsConfirmation: boolean;
    suggestedStatus: string | null;
}

type PkgRef = { orderId: string; packageId: string };

// Steadfast (Packzy) courier — admin/superadmin book packages & sync status.
export const courierApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /courier/packages — flattened shipments (Shipments board)
        getCourierPackages: builder.query<
            { data: ICourierPackage[]; meta: { total: number; page: number; limit: number; totalPages: number } },
            { tab?: CourierTab; search?: string; page?: number; limit?: number }
        >({
            query: (params) => ({ url: '/courier/packages', params }),
            providesTags: ['Orders'],
        }),

        // GET /courier/counts — parcels per tab, what needs attention, whether Steadfast is connected
        getCourierCounts: builder.query<{ data: ICourierCounts }, { search?: string } | void>({
            query: (params) => ({ url: '/courier/counts', params: params || undefined }),
            providesTags: ['Orders'],
        }),

        // POST /courier/sync-active — pull the latest status for every parcel still with the courier
        syncActiveCourier: builder.mutation<{ data: IBulkResult; message: string }, void>({
            query: () => ({ url: '/courier/sync-active', method: 'POST' }),
            invalidatesTags: ['Orders'],
        }),

        // POST /courier/bulk-book — book many selected packages at once
        bulkBookCourier: builder.mutation<{ data: IBulkResult }, { items: PkgRef[] }>({
            query: (body) => ({ url: '/courier/bulk-book', method: 'POST', body }),
            invalidatesTags: ['Orders'],
        }),

        // POST /courier/bulk-status — refresh status of many selected packages
        bulkRefreshCourier: builder.mutation<{ data: IBulkResult }, { items: PkgRef[] }>({
            query: (body) => ({ url: '/courier/bulk-status', method: 'POST', body }),
            invalidatesTags: ['Orders'],
        }),

        // POST /courier/orders/:orderId/packages/:packageId/book
        bookCourierPackage: builder.mutation<{ data: IBookedPackage; message?: string }, PkgRef>({
            query: ({ orderId, packageId }) => ({
                url: `/courier/orders/${orderId}/packages/${packageId}/book`,
                method: 'POST',
            }),
            invalidatesTags: ['Orders'],
        }),

        // GET /courier/orders/:orderId/packages/:packageId/status — pull latest delivery status
        refreshCourierStatus: builder.mutation<{ data: ICourierRefreshResult; message?: string }, PkgRef>({
            query: ({ orderId, packageId }) => ({
                url: `/courier/orders/${orderId}/packages/${packageId}/status`,
                method: 'GET',
            }),
            invalidatesTags: ['Orders'],
        }),

        // GET /courier/balance — Steadfast account balance
        getCourierBalance: builder.query<{ data: { status?: number; current_balance: number } }, void>({
            query: () => '/courier/balance',
        }),
    }),
});

export const {
    useGetCourierPackagesQuery,
    useGetCourierCountsQuery,
    useSyncActiveCourierMutation,
    useBulkBookCourierMutation,
    useBulkRefreshCourierMutation,
    useBookCourierPackageMutation,
    useRefreshCourierStatusMutation,
    useLazyGetCourierBalanceQuery,
    useGetCourierBalanceQuery,
} = courierApi;
