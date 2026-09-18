import { baseApi } from './baseApi';

export const inquiryApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Public: create inquiry (no auth)
        createInquiry: builder.mutation({
            query: (data) => ({
                url: '/inquiries',
                method: 'POST',
                body: data,
            }),
        }),
        // Admin: get all inquiries
        getInquiries: builder.query({
            query: (params) => ({
                url: '/inquiries',
                params,
            }),
        }),
        // Public: get inquiries by product
        getProductInquiries: builder.query({
            query: (productId) => `/inquiries/product/${productId}`,
        }),
        // Admin: update inquiry status
        updateInquiryStatus: builder.mutation({
            query: ({ id, data }) => ({
                url: `/inquiries/${id}`,
                method: 'PATCH',
                body: data,
            }),
        }),
        // Admin: delete inquiry
        deleteInquiry: builder.mutation({
            query: (id) => ({
                url: `/inquiries/${id}`,
                method: 'DELETE',
            }),
        }),
    }),
});

export const {
    useCreateInquiryMutation,
    useGetInquiriesQuery,
    useGetProductInquiriesQuery,
    useUpdateInquiryStatusMutation,
    useDeleteInquiryMutation,
} = inquiryApi;
