import { baseApi } from "./baseApi";

export const roleApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Admin/Superadmin: list of all permission keys — GET /api/roles/permissions
        getPermissions: builder.query({
            query: () => ({ url: '/roles/permissions', method: 'GET' }),
            providesTags: ['Roles'],
        }),
        // Superadmin: staff users (admin/superadmin) — GET /api/roles/staff
        getStaff: builder.query({
            query: () => ({ url: '/roles/staff', method: 'GET' }),
            providesTags: ['Roles'],
        }),
        // Superadmin: update a user's role + permissions — PATCH /api/roles/:userId
        updateUserRole: builder.mutation({
            query: ({ userId, ...data }) => ({ url: `/roles/${userId}`, method: 'PATCH', body: data }),
            invalidatesTags: ['Roles', 'Users'],
        }),
    }),
});

export const {
    useGetPermissionsQuery,
    useGetStaffQuery,
    useUpdateUserRoleMutation,
} = roleApi;
