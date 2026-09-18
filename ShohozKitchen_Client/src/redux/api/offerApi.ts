import { baseApi } from "./baseApi";

export const offerApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Public: active offers (optionally by type) — GET /api/offers/active
        getActiveOffers: builder.query({
            query: (params?: { type?: string }) => ({
                url: '/offers/active',
                method: 'GET',
                params,
            }),
            providesTags: ['Offers'],
        }),
        // Admin: all offers — GET /api/offers
        getOffers: builder.query({
            query: () => ({ url: '/offers', method: 'GET' }),
            providesTags: ['Offers'],
        }),
        // Admin: single offer — GET /api/offers/:id
        getOfferById: builder.query({
            query: (id: string) => ({ url: `/offers/${id}`, method: 'GET' }),
            providesTags: ['Offers'],
        }),
        // Admin: create — POST /api/offers
        createOffer: builder.mutation({
            query: (data) => ({ url: '/offers', method: 'POST', body: data }),
            invalidatesTags: ['Offers'],
        }),
        // Admin: update — PATCH /api/offers/:id
        updateOffer: builder.mutation({
            query: ({ id, ...data }) => ({ url: `/offers/${id}`, method: 'PATCH', body: data }),
            invalidatesTags: ['Offers'],
        }),
        // Admin: delete — DELETE /api/offers/:id
        deleteOffer: builder.mutation({
            query: (id: string) => ({ url: `/offers/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Offers'],
        }),
    }),
});

export const {
    useGetActiveOffersQuery,
    useGetOffersQuery,
    useGetOfferByIdQuery,
    useCreateOfferMutation,
    useUpdateOfferMutation,
    useDeleteOfferMutation,
} = offerApi;
