import { baseApi } from "./baseApi";

/** A payment the shop can record against an order. */
export type OrderPaymentMethod = 'cod' | 'bkash' | 'nagad' | 'rocket' | 'bank';

/** One line of an admin "New order". */
export interface AdminOrderItemInput {
    product: string;
    quantity: number;
    color?: string;
    size?: string;
    /** Price charged per unit for THIS order only — sent only when staff changed the price. */
    unitPrice?: number;
    /** The list / "was" price shown next to it — sent together with unitPrice. */
    originalPrice?: number;
}

/** Body of POST /api/orders/admin. Anything left out is resolved by the server. */
export interface AdminOrderInput {
    items: AdminOrderItemInput[];
    shippingAddress: {
        fullName: string;
        phone: string;
        email?: string;
        address: string;
        area?: string;
        city?: string;
        postalCode?: string;
    };
    paymentMethod: OrderPaymentMethod;
    paymentDetails?: { senderNumber?: string; transactionId?: string; paymentTime?: string };
    paymentStatus?: 'pending' | 'paid';
    status?: 'pending' | 'confirmed' | 'processing';
    deliveryArea?: 'inside_dhaka' | 'outside_dhaka';
    zoneId?: string;
    /** auto = the normal delivery charge, free = none, custom = `amount`. */
    shipping?: { mode: 'auto' | 'free' | 'custom'; amount?: number };
    couponCode?: string;
    note?: string;
}

/**
 * Body of PATCH /api/orders/admin/:id — correcting an order that has not gone to the
 * courier yet. Every part is optional: send only what changed, and the rest is left
 * alone. `items`, when sent, replaces the order's lines in full.
 *
 * The order's status and payment status are not here — they keep their own controls.
 */
export type AdminOrderUpdate = Partial<Pick<AdminOrderInput,
    'items' | 'shippingAddress' | 'paymentMethod' | 'paymentDetails' | 'deliveryArea' | 'zoneId' | 'shipping' | 'note'
>>;

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
        // Admin: correct an order's details — Backend route: PATCH /api/orders/admin/:id.
        // Editing the lines moves stock, so Products is invalidated too.
        updateAdminOrder: builder.mutation<{ data?: unknown }, { id: string } & AdminOrderUpdate>({
            query: ({ id, ...data }) => ({
                url: `/orders/admin/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Orders', 'Products', 'Users'],
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
        createAdminOrder: builder.mutation<{ data?: { _id?: string; orderId?: string } }, AdminOrderInput>({
            query: (data) => ({
                url: '/orders/admin',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Orders', 'Products', 'Users'],
        }),

        // Admin: shipping-label / invoice data for up to 100 orders, in the order given —
        // Backend route: POST /api/orders/admin/print { ids }. A read, so a query (POST only
        // because the id list can be long); dropped as soon as the print window closes.
        getOrdersPrintData: builder.query({
            query: (ids: string[]) => ({
                url: '/orders/admin/print',
                method: 'POST',
                body: { ids },
            }),
            providesTags: ['Orders'],
            keepUnusedDataFor: 0,
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
        // Public: track order by human orderId (e.g. SK-0050, or KM-xxxx for older orders) or Mongo _id — Backend route: GET /api/orders/track/:orderId
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
    useUpdateAdminOrderMutation,
    useUpdatePaymentStatusMutation,
    useAddAdminNoteMutation,
    useCreateAdminOrderMutation,
    useGetOrdersPrintDataQuery,
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
