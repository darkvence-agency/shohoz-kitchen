import { baseApi } from "./baseApi";

export const notificationApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // My notifications (paginated, newest-first) — Backend route: GET /api/notifications
        getNotifications: builder.query({
            query: (params) => ({
                url: '/notifications',
                method: 'GET',
                params,
            }),
            providesTags: ['Notifications'],
        }),
        // Unread count — Backend route: GET /api/notifications/unread-count
        getNotifUnreadCount: builder.query({
            query: () => ({
                url: '/notifications/unread-count',
                method: 'GET',
            }),
            providesTags: ['Notifications'],
        }),
        // Mark one as read — Backend route: PATCH /api/notifications/:id/read
        markNotifRead: builder.mutation({
            query: (id) => ({
                url: `/notifications/${id}/read`,
                method: 'PATCH',
            }),
            invalidatesTags: ['Notifications'],
        }),
        // Mark all as read — Backend route: PATCH /api/notifications/read-all
        markAllNotifRead: builder.mutation({
            query: () => ({
                url: '/notifications/read-all',
                method: 'PATCH',
            }),
            invalidatesTags: ['Notifications'],
        }),
    }),
});

export const {
    useGetNotificationsQuery,
    useGetNotifUnreadCountQuery,
    useMarkNotifReadMutation,
    useMarkAllNotifReadMutation,
} = notificationApi;
