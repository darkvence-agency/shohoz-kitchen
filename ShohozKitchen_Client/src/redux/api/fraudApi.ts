import { baseApi } from './baseApi';

// Fraud check (admin only). Backend: /api/fraud
// An order is flagged when its customer (same account, phone or email) returned an order on
// this store before. The lookup reads this store's own order history, not Steadfast's.

export type FraudFlagStatus = 'review' | 'cleared' | 'cancelled';
export type FraudMatchKind = 'phone' | 'email' | 'account';
export type FraudRisk = 'none' | 'low' | 'medium' | 'high';

/** refused = the order was cancelled after it went to the courier (a parcel refused at the door) */
export type FraudReturnStatus = 'returned' | 'refunded' | 'refused';

export interface IPreviousReturn {
    order: string;
    orderRef: string;
    status: FraudReturnStatus;
    date: string | null;
    reason: string;
}

export interface IFraudFlag {
    _id: string;
    /** The live order (null if it was deleted). */
    order: { _id: string; orderId: string; status: string; total: number; paymentMethod: string; createdAt: string } | null;
    orderRef: string;
    customer: { name: string; phone: string; email: string; user: string | null };
    matchedBy: FraudMatchKind[];
    previousReturns: IPreviousReturn[];
    returnCount: number;
    previousOrderCount: number;
    status: FraudFlagStatus;
    reviewNote: string;
    reviewedBy: { _id: string; firstName?: string; lastName?: string } | null;
    reviewedAt: string | null;
    /** The order can still be cancelled from here (pending / confirmed / processing, not booked). */
    cancellable: boolean;
    /** The order is still in flight. False once it was cancelled, delivered or returned (or deleted). */
    orderOpen: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface IFraudSummary {
    review: number;
    cleared: number;
    cancelled: number;
    total: number;
}

export interface IFraudListParams {
    status?: FraudFlagStatus | 'all';
    search?: string;
    page?: number;
    limit?: number;
}

export interface IFraudLookup {
    query: { type: 'phone' | 'email'; value: string };
    basis: 'store';
    customer: { name: string; phones: string[]; emails: string[] };
    totalOrders: number;
    delivered: number;
    returned: number;
    cancelled: number;
    cancelledAfterDispatch: number;
    inProgress: number;
    returnRequests: { total: number; pending: number; approved: number; rejected: number; refunded: number };
    returnRate: number | null;
    deliverySuccessRate: number | null;
    spent: number;
    risk: FraudRisk;
    openFlags: number;
    firstOrderAt: string | null;
    lastOrderAt: string | null;
    recentOrders: { _id: string; orderId: string; status: string; total: number; paymentMethod: string; createdAt: string; returned: boolean }[];
}

type Meta = { page: number; limit: number; total: number; totalPages: number };

export const fraudApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /fraud/flags: flagged orders with the live order joined in.
        // Order changes elsewhere (status, cancel) refetch it through the Orders tag.
        getFraudFlags: builder.query<{ data: IFraudFlag[]; meta: Meta }, IFraudListParams>({
            query: (params) => ({ url: '/fraud/flags', params }),
            providesTags: ['Fraud', 'Orders'],
        }),

        // GET /fraud/summary: counts per flag status. Also refetched on order changes:
        // an order closed elsewhere closes its flag on the server.
        getFraudSummary: builder.query<{ data: IFraudSummary }, void>({
            query: () => '/fraud/summary',
            providesTags: ['Fraud', 'Orders'],
        }),

        // GET /fraud/order/:orderId: the flag for one order, or null
        getFraudFlagForOrder: builder.query<{ data: IFraudFlag | null }, string>({
            query: (orderId) => `/fraud/order/${orderId}`,
            providesTags: ['Fraud', 'Orders'],
        }),

        // GET /fraud/lookup?q=: this store's history for a phone number or email
        lookupFraudHistory: builder.query<{ data: IFraudLookup }, string>({
            query: (q) => ({ url: '/fraud/lookup', params: { q } }),
            providesTags: ['Fraud', 'Orders', 'Returns'],
            keepUnusedDataFor: 30,
        }),

        // PATCH /fraud/flags/:id: clear a flag, or move it back to review
        reviewFraudFlag: builder.mutation<{ data: IFraudFlag }, { id: string; status: 'cleared' | 'review'; note?: string }>({
            query: ({ id, ...body }) => ({ url: `/fraud/flags/${id}`, method: 'PATCH', body }),
            invalidatesTags: ['Fraud'],
        }),

        // POST /fraud/flags/:id/cancel-order: cancels the order (restocks, notifies the customer)
        cancelFraudOrder: builder.mutation<{ data: IFraudFlag }, { id: string; note?: string }>({
            query: ({ id, note }) => ({ url: `/fraud/flags/${id}/cancel-order`, method: 'POST', body: note ? { note } : {} }),
            invalidatesTags: ['Fraud', 'Orders', 'Products', 'Inventory', 'Dashboard'],
        }),

        // POST /fraud/scan: flag open orders that have no flag yet, and close review flags
        // whose order has closed since
        scanFraudOrders: builder.mutation<{ data: { scanned: number; flagged: number; errors: number; limited: boolean; closed?: number } }, void>({
            query: () => ({ url: '/fraud/scan', method: 'POST' }),
            invalidatesTags: ['Fraud'],
        }),
    }),
});

export const {
    useGetFraudFlagsQuery,
    useGetFraudSummaryQuery,
    useGetFraudFlagForOrderQuery,
    useLookupFraudHistoryQuery,
    useReviewFraudFlagMutation,
    useCancelFraudOrderMutation,
    useScanFraudOrdersMutation,
} = fraudApi;
