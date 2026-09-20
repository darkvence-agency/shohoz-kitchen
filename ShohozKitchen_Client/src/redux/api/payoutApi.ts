import { baseApi } from './baseApi';

// Courier payouts — money Steadfast has sent us (admin). Backend: /api/courier-payouts

export type PayoutSource = 'steadfast' | 'manual';

export interface ICourierPayout {
    _id: string;
    receivedAt: string;
    source: PayoutSource;
    reference: string;
    codCollected: number;
    deliveryBills: number;
    codFee: number;
    amount: number;
    parcelCount: number;
    note: string;
    createdBy?: { _id: string; firstName?: string; lastName?: string } | null;
    createdAt: string;
    updatedAt: string;
}

export interface IPayoutSummary {
    count: number;
    steadfast: number;
    manual: number;
    received: number;
    codCollected: number;
    deliveryBills: number;
    codFee: number;
    parcels: number;
    lastReceivedAt: string | null;
}

export interface IDeliveryEconomics {
    shippingCharged: number;
    deliveredOrders: number;
    deliveredViaSteadfast: number;
    deliveryBills: number;
    codFee: number;
    paidToCourier: number;
    deliveryNet: number;
    codCollected: number;
    received: number;
    /** Received over payouts that carry a breakdown — the part comparable with codCollected. */
    receivedWithBreakdown: number;
    /** codCollected − receivedWithBreakdown. */
    keptByCourier: number;
    /** Payouts recorded without a breakdown (their charges are unknown) and the money they brought. */
    withoutBreakdown: number;
    receivedWithoutBreakdown: number;
    codOrders: number;
    codExpected: number;
}

export interface IPayoutParcel {
    consignmentId: string;
    trackingCode: string;
    invoice: string;
    status: string;
    codCollected: number;
    deliveryCharge: number;
    codFee: number;
    order: { _id: string; orderId: string; total: number; shippingCost: number; paymentMethod: string; status: string } | null;
}

export interface IPayoutListParams {
    from?: string;   // ISO, inclusive
    to?: string;     // ISO, exclusive
    source?: PayoutSource;
    search?: string;
    page?: number;
    limit?: number;
}

export interface IPayoutListResponse {
    data: { payouts: ICourierPayout[]; summary: IPayoutSummary; economics: IDeliveryEconomics };
    meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface IPayoutInput {
    receivedAt: string;
    amount?: number;
    reference?: string;
    codCollected?: number;
    deliveryBills?: number;
    codFee?: number;
    note?: string;
}

export const payoutApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // GET /courier-payouts — paginated, with period totals and delivery economics
        getCourierPayouts: builder.query<IPayoutListResponse, IPayoutListParams>({
            query: (params) => ({ url: '/courier-payouts', params }),
            // The economics block is built from delivered orders too (a courier sync changes it).
            providesTags: ['Payouts', 'Orders'],
        }),

        // GET /courier-payouts/:id — one payout with its statement's parcels matched to orders
        getCourierPayout: builder.query<{ data: ICourierPayout & { parcels: IPayoutParcel[] } }, string>({
            query: (id) => `/courier-payouts/${id}`,
            providesTags: (_r, _e, id) => [{ type: 'Payouts', id }],
        }),

        // POST /courier-payouts/pull — fetch a payment statement from Steadfast and store it
        pullSteadfastPayout: builder.mutation<{ data: { payout: ICourierPayout; warnings: string[] } }, { paymentId: string; note?: string }>({
            query: (body) => ({ url: '/courier-payouts/pull', method: 'POST', body }),
            invalidatesTags: ['Payouts'],
        }),

        // POST /courier-payouts/manual — money that isn't on a Steadfast statement
        createManualPayout: builder.mutation<{ data: ICourierPayout }, IPayoutInput & { amount: number }>({
            query: (body) => ({ url: '/courier-payouts/manual', method: 'POST', body }),
            invalidatesTags: ['Payouts'],
        }),

        // PATCH /courier-payouts/:id
        updateCourierPayout: builder.mutation<{ data: ICourierPayout }, Partial<IPayoutInput> & { id: string }>({
            query: ({ id, ...body }) => ({ url: `/courier-payouts/${id}`, method: 'PATCH', body }),
            invalidatesTags: ['Payouts'],
        }),

        // DELETE /courier-payouts/:id
        deleteCourierPayout: builder.mutation<unknown, string>({
            query: (id) => ({ url: `/courier-payouts/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Payouts'],
        }),
    }),
});

export const {
    useGetCourierPayoutsQuery,
    useGetCourierPayoutQuery,
    usePullSteadfastPayoutMutation,
    useCreateManualPayoutMutation,
    useUpdateCourierPayoutMutation,
    useDeleteCourierPayoutMutation,
} = payoutApi;
