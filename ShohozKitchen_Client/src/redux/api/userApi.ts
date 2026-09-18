import { baseApi } from "./baseApi";

export const userApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // ===== User-facing endpoints =====
        getMe: builder.query({
            query: () => ({
                url: '/users/me',
                method: 'GET',
            }),
            providesTags: ['Users'],
        }),
        updateProfile: builder.mutation({
            query: (data) => ({
                url: '/users/me',
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Users'],
        }),
        getMyAddresses: builder.query({
            query: () => ({
                url: '/users/addresses',
                method: 'GET',
            }),
            providesTags: ['Users'],
        }),
        addAddress: builder.mutation({
            query: (data) => ({
                url: '/users/addresses',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Users'],
        }),
        updateAddress: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/users/addresses/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Users'],
        }),
        deleteAddress: builder.mutation({
            query: (id) => ({
                url: `/users/addresses/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Users'],
        }),
        getWishlist: builder.query({
            query: () => ({
                url: '/users/wishlist',
                method: 'GET',
            }),
            providesTags: ['Users'],
        }),
        toggleWishlist: builder.mutation({
            query: (productId) => ({
                url: '/users/wishlist',
                method: 'POST',
                body: { productId },
            }),
            invalidatesTags: ['Users'],
        }),
        // Merge a guest's local wishlist into the user's server wishlist (on login)
        mergeWishlist: builder.mutation({
            query: (productIds: string[]) => ({
                url: '/users/wishlist/merge',
                method: 'POST',
                body: { productIds },
            }),
            invalidatesTags: ['Users'],
        }),
        // Public, read-only view of another user's wishlist (share link)
        getSharedWishlist: builder.query({
            query: (userId: string) => ({
                url: `/users/wishlist/shared/${userId}`,
                method: 'GET',
            }),
        }),

        // ===== Admin endpoints =====
        getAdminUsers: builder.query({
            query: (params) => ({
                url: '/users/admin/all',
                method: 'GET',
                params,
            }),
            providesTags: ['Users'],
        }),
        getAdminUserById: builder.query({
            query: (id) => ({
                url: `/users/admin/${id}`,
                method: 'GET',
            }),
            providesTags: ['Users'],
        }),
        getAdminUserStats: builder.query({
            query: () => ({
                url: '/users/admin/stats',
                method: 'GET',
            }),
            providesTags: ['Users'],
        }),
        updateUser: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/users/admin/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Users'],
        }),
        // Admin adds a buyer by hand (phone orders, walk-ins)
        createCustomer: builder.mutation({
            query: (data) => ({
                url: '/users/admin/customers',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Users'],
        }),
        deleteUser: builder.mutation({
            query: (id) => ({
                url: `/users/admin/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Users'],
        }),
    }),
});

export const {
    // User hooks
    useGetMeQuery,
    useUpdateProfileMutation,
    useGetMyAddressesQuery,
    useAddAddressMutation,
    useUpdateAddressMutation,
    useDeleteAddressMutation,
    useGetWishlistQuery,
    useToggleWishlistMutation,
    useMergeWishlistMutation,
    useGetSharedWishlistQuery,
    // Admin hooks
    useGetAdminUsersQuery,
    useGetAdminUserByIdQuery,
    useGetAdminUserStatsQuery,
    useUpdateUserMutation,
    useCreateCustomerMutation,
    useDeleteUserMutation,
} = userApi;

