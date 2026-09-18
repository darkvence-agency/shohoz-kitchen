import { baseApi } from "./baseApi";

export const couponApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Admin: get all coupons — Backend route: GET /api/coupons/
        getCoupons: builder.query({
            query: () => ({
                url: '/coupons',
                method: 'GET'
            }),
            providesTags: ['Coupons']
        }),
        // Admin: create coupon — Backend route: POST /api/coupons/
        createCoupon: builder.mutation({
            query: (data) => ({
                url: '/coupons',
                method: 'POST',
                body: data
            }),
            invalidatesTags: ['Coupons']
        }),
        // Admin: update coupon — Backend route: PATCH /api/coupons/:id
        updateCoupon: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/coupons/${id}`,
                method: 'PATCH',
                body: data
            }),
            invalidatesTags: (result, error, { id }) => ['Coupons', { type: 'Coupons', id }]
        }),
        // Admin: delete coupon — Backend route: DELETE /api/coupons/:id
        deleteCoupon: builder.mutation({
            query: (id) => ({
                url: `/coupons/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['Coupons']
        }),
        // User: validate coupon — Backend route: POST /api/coupons/validate
        validateCoupon: builder.mutation({
            query: (data) => ({
                url: '/coupons/validate',
                method: 'POST',
                body: data
            })
        }),
    })
});

export const {
    useGetCouponsQuery,
    useCreateCouponMutation,
    useUpdateCouponMutation,
    useDeleteCouponMutation,
    useValidateCouponMutation,
} = couponApi;
