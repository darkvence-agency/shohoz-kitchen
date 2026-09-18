import { baseApi } from './baseApi';

export interface ICourierPackage {
    orderId: string;
    orderNo: string;
    packageId: string;
    shop: string | null;
    shopName: string;
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

type PkgRef = { orderId: string; packageId: string };

// Steadfast (Packzy) courier — admin/superadmin book packages & sync status.
export const courierApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /courier/packages — flattened shipments (Shipments board)
        getCourierPackages: builder.query<
            { data: ICourierPackage[]; meta: { total: number; page: number; limit: number; totalPages: number } },
            { shop?: string; state?: string; search?: string; page?: number; limit?: number }
        >({
            query: (params) => ({ url: '/courier/packages', params }),
            providesTags: ['Orders'],
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
        bookCourierPackage: builder.mutation<any, PkgRef>({
            query: ({ orderId, packageId }) => ({
                url: `/courier/orders/${orderId}/packages/${packageId}/book`,
                method: 'POST',
            }),
            invalidatesTags: ['Orders'],
        }),

        // GET /courier/orders/:orderId/packages/:packageId/status — pull latest delivery status
        refreshCourierStatus: builder.mutation<any, PkgRef>({
            query: ({ orderId, packageId }) => ({
                url: `/courier/orders/${orderId}/packages/${packageId}/status`,
                method: 'GET',
            }),
            invalidatesTags: ['Orders'],
        }),

        // GET /courier/balance — Steadfast account balance
        getCourierBalance: builder.query<any, void>({
            query: () => '/courier/balance',
        }),
    }),
});

export const {
    useGetCourierPackagesQuery,
    useBulkBookCourierMutation,
    useBulkRefreshCourierMutation,
    useBookCourierPackageMutation,
    useRefreshCourierStatusMutation,
    useLazyGetCourierBalanceQuery,
    useGetCourierBalanceQuery,
} = courierApi;
