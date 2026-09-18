import { baseApi } from "./baseApi";

// ===== Shared constants (reuse across return UIs) =====

// Reason labels per spec
export const RETURN_REASONS: { value: string; label: string }[] = [
    { value: 'defective', label: 'Defective / not working' },
    { value: 'wrong_item', label: 'Wrong item received' },
    { value: 'not_as_described', label: 'Not as described' },
    { value: 'damaged', label: 'Damaged in delivery' },
    { value: 'changed_mind', label: 'Changed my mind' },
    { value: 'other', label: 'Other' },
];

// Status badge styling map (Tailwind classes)
export const returnStatusBadge: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 border-amber-200' },
    approved: { label: 'Approved', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700 border-red-200' },
    refunded: { label: 'Refunded', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

export const returnApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // ===== Customer endpoints =====
        // Create a return request — Backend route: POST /api/returns
        createReturn: builder.mutation({
            query: (body) => ({
                url: '/returns',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Returns', 'Orders'],
        }),
        // My returns — Backend route: GET /api/returns/my
        getMyReturns: builder.query({
            query: (params) => ({
                url: '/returns/my',
                method: 'GET',
                params,
            }),
            providesTags: ['Returns'],
        }),
        // Single return by id — Backend route: GET /api/returns/:id
        getReturnById: builder.query({
            query: (id) => ({
                url: `/returns/${id}`,
                method: 'GET',
            }),
            providesTags: ['Returns'],
        }),

        // ===== Admin endpoints =====
        // All returns — Backend route: GET /api/returns/admin/all
        getAdminReturns: builder.query({
            query: (params) => ({
                url: '/returns/admin/all',
                method: 'GET',
                params,
            }),
            providesTags: ['Returns'],
        }),
        // Approve return — Backend route: PATCH /api/returns/admin/:id/approve
        approveReturn: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/returns/admin/${id}/approve`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Returns', 'Orders'],
        }),
        // Reject return — Backend route: PATCH /api/returns/admin/:id/reject
        rejectReturn: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/returns/admin/${id}/reject`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Returns'],
        }),
        // Process refund — Backend route: PATCH /api/returns/admin/:id/refund
        refundReturn: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/returns/admin/${id}/refund`,
                method: 'PATCH',
                body,
            }),
            invalidatesTags: ['Returns', 'Orders'],
        }),

}),
});

export const {
    // Customer hooks
    useCreateReturnMutation,
    useGetMyReturnsQuery,
    useGetReturnByIdQuery,
    // Admin hooks
    useGetAdminReturnsQuery,
    useApproveReturnMutation,
    useRejectReturnMutation,
    useRefundReturnMutation,
} = returnApi;
