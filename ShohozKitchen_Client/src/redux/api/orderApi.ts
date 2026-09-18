import { baseApi } from "./baseApi";

export const orderApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // ===== Admin endpoints =====
        // Admin: get all orders — Backend route: GET /api/orders/admin/all
        getAdminOrders: builder.query({
            query: (params) => ({
                url: '/orders/admin/all',
                method: 'GET',
                params,
            }),
            providesTags: ['Orders'],
        }),
        // Admin: get order stats — Backend route: GET /api/orders/admin/stats
        getOrderStats: builder.query({
            query: () => ({
                url: '/orders/admin/stats',
                method: 'GET',
            }),
            providesTags: ['Orders'],
        }),
        // Admin: get order by id — Backend route: GET /api/orders/admin/:id
        getAdminOrderById: builder.query({
            query: (id) => ({
                url: `/orders/admin/${id}`,
                method: 'GET',
            }),
            providesTags: ['Orders'],
        }),
        // Admin: update order status — Backend route: PATCH /api/orders/admin/:id/status
        updateOrderStatus: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/orders/admin/${id}/status`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Orders'],
        }),
        // Admin: update payment status — Backend route: PATCH /api/orders/admin/:id/payment
        updatePaymentStatus: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/orders/admin/${id}/payment`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Orders'],
        }),
        // Admin: add note — Backend route: PATCH /api/orders/admin/:id/note
        addAdminNote: builder.mutation({
            query: ({ id, note }) => ({
                url: `/orders/admin/${id}/note`,
                method: 'PATCH',
                body: { note },
            }),
            invalidatesTags: ['Orders'],
        }),

        // Admin: "New order" for a phone / walk-in customer — Backend route: POST /api/orders/admin
        createAdminOrder: builder.mutation({
            query: (data) => ({
                url: '/orders/admin',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Orders', 'Products', 'Users'],
        }),

        // ===== User endpoints =====
        // User: create order — Backend route: POST /api/orders/
        createOrder: builder.mutation({
            query: (data) => ({
                url: '/orders',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Orders'],
        }),
        // Guest checkout (no auth required) — Backend route: POST /api/orders/guest-checkout
        guestCheckout: builder.mutation({
            query: (data) => ({
                url: '/orders/guest-checkout',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Orders'],
        }),
        // User: get my orders — Backend route: GET /api/orders/my
        getMyOrders: builder.query({
            query: (params) => ({
                url: '/orders/my',
                method: 'GET',
                params,
            }),
            providesTags: ['Orders'],
        }),
        // User: cancel order — Backend route: PATCH /api/orders/:id/cancel
        cancelOrder: builder.mutation({
            query: (id) => ({
                url: `/orders/${id}/cancel`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Orders'],
        }),
        // General: get order by id — Backend route: GET /api/orders/:id
        getOrderById: builder.query({
            query: (id) => ({
                url: `/orders/${id}`,
                method: 'GET',
            }),
            providesTags: (result, error, id) => [{ type: 'Orders', id }],
        }),

// ===== Public tracking endpoint (no auth) =====
        // Public: track order by human orderId (e.g. KM-0001) or Mongo _id — Backend route: GET /api/orders/track/:orderId
        trackOrder: builder.query({
            query: (orderId) => ({
                url: `/orders/track/${orderId}`,
                method: 'GET',
            }),
            providesTags: ['Orders'],
        }),

        // ===== Admin tracking endpoint =====
        // Admin: set order-level tracking number + carrier — Backend route: PATCH /api/orders/admin/:id/tracking
        updateAdminOrderTracking: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/orders/admin/${id}/tracking`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Orders'],
        }),
    }),
});

export const {
    // Admin hooks
    useGetAdminOrdersQuery,
    useGetOrderStatsQuery,
    useGetAdminOrderByIdQuery,
    useUpdateOrderStatusMutation,
    useUpdatePaymentStatusMutation,
    useAddAdminNoteMutation,
    useCreateAdminOrderMutation,
    // User hooks
    useCreateOrderMutation,
    useGuestCheckoutMutation,
    useGetMyOrdersQuery,
    useCancelOrderMutation,
    useGetOrderByIdQuery,
    // Public tracking hooks
    useTrackOrderQuery,
    useLazyTrackOrderQuery,
    // Admin tracking hook
    useUpdateAdminOrderTrackingMutation,
} = orderApi;
