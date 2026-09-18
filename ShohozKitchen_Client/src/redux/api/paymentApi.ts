import { baseApi } from "./baseApi";

export const paymentApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // ===== Customer / gateway endpoints =====
        // Init a payment for an order — Backend route: POST /api/payments/init
        // Body: { orderId, method }  →  data: { redirectUrl, transactionId }
        initPayment: builder.mutation({
            query: (data) => ({
                url: '/payments/init',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Payments'],
        }),
        // Verify a transaction — Backend route: GET /api/payments/verify/:transactionId
        // data: { transaction, orderPaymentStatus, order }
        verifyPayment: builder.query({
            query: (transactionId) => ({
                url: `/payments/verify/${transactionId}`,
                method: 'GET',
            }),
            providesTags: (result, error, transactionId) => [{ type: 'Payments', id: transactionId }],
        }),
        // My payment history — Backend route: GET /api/payments/my  →  data: Transaction[]
        getMyPayments: builder.query({
            query: (params) => ({
                url: '/payments/my',
                method: 'GET',
                params,
            }),
            providesTags: ['Payments'],
        }),
        // Retry a failed/cancelled payment — Backend route: POST /api/payments/:transactionId/retry
        // data: { redirectUrl, transactionId }
        retryPayment: builder.mutation({
            query: (transactionId) => ({
                url: `/payments/${transactionId}/retry`,
                method: 'POST',
            }),
            invalidatesTags: ['Payments'],
        }),
        // DEV-SIMULATION confirm — Backend route: POST /api/payments/simulate/confirm
        // Body: { transactionId, outcome: 'success' | 'fail' | 'cancel' }  →  data: { transactionId, status }
        confirmSimulatedPayment: builder.mutation({
            query: (data) => ({
                url: '/payments/simulate/confirm',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: (result, error, arg) => [
                'Payments',
                { type: 'Payments', id: arg?.transactionId },
                'Orders',
            ],
        }),

        // ===== Admin endpoints =====
        getAdminPayments: builder.query({
            query: (params) => ({
                url: '/payments/admin/all',
                method: 'GET',
                params,
            }),
            providesTags: ['Payments'],
        }),
        getPaymentStats: builder.query({
            query: () => ({
                url: '/payments/admin/stats',
                method: 'GET',
            }),
            providesTags: ['Payments'],
        }),
        markCODPaid: builder.mutation({
            query: (id) => ({
                url: `/payments/admin/${id}/cod-paid`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Payments', 'Orders'],
        }),
        refundPayment: builder.mutation({
            query: (id) => ({
                url: `/payments/admin/${id}/refund`,
                method: 'POST',
            }),
            invalidatesTags: ['Payments', 'Orders'],
        }),
    }),
});

export const {
    // Customer / gateway hooks
    useInitPaymentMutation,
    useVerifyPaymentQuery,
    useGetMyPaymentsQuery,
    useRetryPaymentMutation,
    useConfirmSimulatedPaymentMutation,
    // Admin hooks
    useGetAdminPaymentsQuery,
    useGetPaymentStatsQuery,
    useMarkCODPaidMutation,
    useRefundPaymentMutation,
} = paymentApi;
