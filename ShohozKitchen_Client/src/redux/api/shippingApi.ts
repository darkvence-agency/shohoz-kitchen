import { baseApi } from "./baseApi";

// Shape returned by the public quote endpoint (after unwrapping the response envelope)
export interface ShippingQuote {
    shippingCost: number;
    estimatedDays: string;
    freeShipping: boolean;
    freeReason: 'product' | 'coupon' | 'threshold' | 'quantity' | null;
}

interface ShippingQuoteArgs {
    city?: string;
    subtotal?: number;
    zoneId?: string;
}

// One option in the checkout "Delivery Area" dropdown.
export interface DeliveryZone {
    _id: string;
    name: string;
    regions: string[];
    price: number;
    estimatedDays: string;
    freeShippingMinimum: number;
}

export interface ShippingSettings {
    freeShippingThreshold: number;
    freeShippingByThresholdEnabled: boolean;
    defaultInsideDhakaRate: number;
    defaultOutsideDhakaRate: number;
    defaultEstimatedDays: string;
    quantityFreeShippingEnabled: boolean;
    minItemsForFreeShipping: number;
}

export const shippingApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Public: get a shipping quote — Backend route: GET /api/shipping/quote
        getShippingQuote: builder.query<ShippingQuote, ShippingQuoteArgs>({
            query: ({ city, subtotal, zoneId } = {}) => ({
                url: '/shipping/quote',
                method: 'GET',
                params: {
                    ...(city ? { city } : {}),
                    ...(subtotal != null ? { subtotal } : {}),
                    ...(zoneId ? { zoneId } : {}),
                },
            }),
            // Unwrap { statusCode, success, message, data } → data and coerce types
            transformResponse: (response: { data?: ShippingQuote } | ShippingQuote): ShippingQuote => {
                const data = (response as { data?: ShippingQuote })?.data ?? (response as ShippingQuote);
                return {
                    shippingCost: Number(data?.shippingCost ?? 0),
                    estimatedDays: data?.estimatedDays ?? '3-5 days',
                    freeShipping: Boolean(data?.freeShipping),
                    freeReason: (data?.freeReason ?? null) as ShippingQuote['freeReason'],
                };
            },
        }),

        // Public: active delivery zones + their rate for the checkout dropdown
        getDeliveryZones: builder.query<DeliveryZone[], void>({
            query: () => '/shipping/delivery-zones',
            transformResponse: (r: { data?: DeliveryZone[] } | DeliveryZone[]) =>
                ((r as { data?: DeliveryZone[] })?.data ?? (r as DeliveryZone[])) || [],
            providesTags: ['Shipping'],
        }),

        // Settings (singleton) — GET public, PATCH admin
        getShippingSettings: builder.query<ShippingSettings, void>({
            query: () => '/shipping/settings',
            transformResponse: (r: { data?: ShippingSettings } | ShippingSettings) =>
                ((r as { data?: ShippingSettings })?.data ?? (r as ShippingSettings)),
            providesTags: ['Shipping'],
        }),
        updateShippingSettings: builder.mutation<unknown, Partial<ShippingSettings>>({
            query: (data) => ({ url: '/shipping/settings', method: 'PATCH', body: data }),
            invalidatesTags: ['Shipping'],
        }),

        // Zones
        getZones: builder.query({
            query: () => '/shipping/zones',
            providesTags: ['Shipping'],
        }),
        createZone: builder.mutation({
            query: (data) => ({
                url: '/shipping/zones',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Shipping'],
        }),
        updateZone: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/shipping/zones/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Shipping'],
        }),
        deleteZone: builder.mutation({
            query: (id) => ({
                url: `/shipping/zones/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Shipping'],
        }),

        // Rates
        getRates: builder.query({
            query: () => '/shipping/rates',
            providesTags: ['Shipping'],
        }),
        createRate: builder.mutation({
            query: (data) => ({
                url: '/shipping/rates',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Shipping'],
        }),
        updateRate: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/shipping/rates/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Shipping'],
        }),
        deleteRate: builder.mutation({
            query: (id) => ({
                url: `/shipping/rates/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Shipping'],
        }),

        // Shipments
        getShipments: builder.query({
            query: (params) => ({
                url: '/shipping/shipments',
                method: 'GET',
                params,
            }),
            providesTags: ['Shipping'],
        }),
        getShippingStats: builder.query({
            query: () => '/shipping/stats',
            providesTags: ['Shipping'],
        }),
        updateShipmentStatus: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/shipping/shipments/${id}/status`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Shipping', 'Orders'],
        }),
        updateTrackingInfo: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/shipping/shipments/${id}/tracking`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Shipping'],
        }),
    }),
});

export const {
    useGetShippingQuoteQuery,
    useGetDeliveryZonesQuery,
    useGetShippingSettingsQuery,
    useUpdateShippingSettingsMutation,
    useGetZonesQuery,
    useCreateZoneMutation,
    useUpdateZoneMutation,
    useDeleteZoneMutation,
    useGetRatesQuery,
    useCreateRateMutation,
    useUpdateRateMutation,
    useDeleteRateMutation,
    useGetShipmentsQuery,
    useGetShippingStatsQuery,
    useUpdateShipmentStatusMutation,
    useUpdateTrackingInfoMutation,
} = shippingApi;
