import { baseApi } from "./baseApi";
import { productApi } from "./productApi";

export const reviewApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Admin: get all reviews — Backend route: GET /api/reviews/
        getAllReviews: builder.query({
            query: (params) => ({
                url: '/reviews',
                method: 'GET',
                params
            }),
            providesTags: ['Reviews']
        }),
        // User: check if eligible to review product
        canReview: builder.query<{ data: { canReview: boolean; hasPurchased: boolean; alreadyReviewed: boolean } }, string>({
            query: (productId) => ({
                url: `/reviews/can-review/${productId}`,
                method: 'GET',
            }),
            providesTags: ['Reviews'],
        }),
        // User: create review (auth required) — Backend route: POST /api/reviews/
        createReview: builder.mutation({
            query: (data) => ({
                url: '/reviews',
                method: 'POST',
                body: data
            }),
            invalidatesTags: ['Reviews', 'Products']
        }),
        // Public: create comment (no login required) — Backend route: POST /api/reviews/public
        publicCreateReview: builder.mutation({
            query: (data) => ({
                url: '/reviews/public',
                method: 'POST',
                body: data
            }),
            async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
                const { product: productId, rating, comment, userName } = arg;
                const tempId = `temp_${Date.now()}`;
                const patches: { undo: () => void }[] = [];

                // 1. Insert new comment at top of every cached review list (instant UI)
                const state = getState() as any;
                const queries = state.api?.queries || {};
                Object.values(queries).forEach((q: any) => {
                    if (!q || q.status !== 'fulfilled') return;
                    if (q.endpointName === 'getProductReviews' && q.originalArgs?.productId === productId) {
                        try {
                            const patch = dispatch(
                                reviewApi.util.updateQueryData(
                                    'getProductReviews',
                                    q.originalArgs,
                                    (draft: any) => {
                                        const list = Array.isArray(draft?.data) ? draft.data : null;
                                        if (!list) return;
                                        list.unshift({
                                            _id: tempId,
                                            product: productId,
                                            rating: rating || 5,
                                            comment: (comment || '').trim(),
                                            userName: userName || 'Anonymous',
                                            likes: 0,
                                            replies: [],
                                            createdAt: new Date().toISOString(),
                                        });
                                    }
                                )
                            );
                            patches.push(patch);
                        } catch { /* ignore */ }
                    }
                });

                // 2. Bump commentCount + reviewCount on every cached Product holding this productId
                Object.values(queries).forEach((q: any) => {
                    if (!q || q.status !== 'fulfilled') return;
                    if (!q.endpointName?.startsWith('get')) return;
                    const productEndpoints = [
                        'getProducts', 'getFeaturedProducts', 'getProductBySlug',
                        'getRelatedProducts', 'getProductById',
                    ];
                    if (!productEndpoints.includes(q.endpointName)) return;
                    try {
                        const patch = dispatch(
                            productApi.util.updateQueryData(
                                q.endpointName,
                                q.originalArgs,
                                (draft: any) => {
                                    if (!draft) return;
                                    const target = draft.data ?? draft;
                                    if (!target) return;
                                    const bump = (obj: any) => {
                                        if (obj && (obj._id === productId || obj.id === productId)) {
                                            obj.commentCount = (obj.commentCount || 0) + 1;
                                            obj.reviewCount = (obj.reviewCount || 0) + 1;
                                        }
                                    };
                                    if (Array.isArray(target)) target.forEach(bump);
                                    else bump(target);
                                }
                            )
                        );
                        patches.push(patch);
                    } catch { /* ignore */ }
                });

                try {
                    const { data: responseData } = await queryFulfilled;
                    // Replace temp comment with real server comment (so _id is valid for like/reply buttons)
                    const realReview = responseData?.data;
                    if (realReview?._id) {
                        const latest = (getState() as any).api?.queries || {};
                        Object.values(latest).forEach((q: any) => {
                            if (!q || q.status !== 'fulfilled') return;
                            if (q.endpointName === 'getProductReviews' && q.originalArgs?.productId === productId) {
                                try {
                                    dispatch(
                                        reviewApi.util.updateQueryData(
                                            'getProductReviews',
                                            q.originalArgs,
                                            (draft: any) => {
                                                const list = Array.isArray(draft?.data) ? draft.data : null;
                                                if (!list) return;
                                                const idx = list.findIndex((r: any) => r._id === tempId);
                                                if (idx !== -1) {
                                                    list[idx] = {
                                                        ...realReview,
                                                        likes: realReview.likes || 0,
                                                        replies: realReview.replies || [],
                                                    };
                                                }
                                            }
                                        )
                                    );
                                } catch { /* ignore */ }
                            }
                        });
                    }
                } catch {
                    patches.forEach(p => p.undo());
                }
            },
        }),
        // User: update review — Backend route: PATCH /api/reviews/:id
        updateReview: builder.mutation({
            query: ({ id, ...data }) => ({
                url: `/reviews/${id}`,
                method: 'PATCH',
                body: data
            }),
            invalidatesTags: ['Reviews']
        }),
        // Delete review — Backend route: DELETE /api/reviews/:id
        deleteReview: builder.mutation({
            query: (id) => ({
                url: `/reviews/${id}`,
                method: 'DELETE'
            }),
            invalidatesTags: ['Reviews']
        }),
        // User: my own review history — Backend route: GET /api/reviews/my
        getMyReviews: builder.query({
            query: (params) => ({
                url: '/reviews/my',
                method: 'GET',
                params,
            }),
            providesTags: ['Reviews'],
        }),
        // Public: get product reviews — Backend route: GET /api/reviews/product/:productId
        getProductReviews: builder.query({
            query: ({ productId, ...params }) => ({
                url: `/reviews/product/${productId}`,
                method: 'GET',
                params
            }),
            providesTags: (result: any, error: any, { productId }: { productId: string }) => [{ type: 'Reviews' as const, id: productId }]
        }),
        // Public: like a review — Backend route: PATCH /api/reviews/:reviewId/like
        likeReview: builder.mutation({
            query: (reviewId: string) => ({
                url: `/reviews/${reviewId}/like`,
                method: 'PATCH',
            }),
            async onQueryStarted(reviewId, { dispatch, queryFulfilled, getState }) {
                const queries = (getState() as any).api?.queries || {};
                const patches: { undo: () => void }[] = [];

                Object.values(queries).forEach((q: any) => {
                    if (!q || q.status !== 'fulfilled') return;
                    if (q.endpointName !== 'getProductReviews') return;
                    try {
                        const patch = dispatch(
                            reviewApi.util.updateQueryData(
                                'getProductReviews',
                                q.originalArgs,
                                (draft: any) => {
                                    const list = Array.isArray(draft?.data) ? draft.data : null;
                                    if (!list) return;
                                    const rev = list.find((r: any) => r._id === reviewId);
                                    if (rev) rev.likes = (rev.likes || 0) + 1;
                                }
                            )
                        );
                        patches.push(patch);
                    } catch { /* ignore */ }
                });

                try { await queryFulfilled; }
                catch { patches.forEach(p => p.undo()); }
            },
        }),
        // Public: add reply to a review — Backend route: POST /api/reviews/:reviewId/reply
        replyToReview: builder.mutation({
            query: ({ reviewId, text, userName }: { reviewId: string; text: string; userName?: string }) => ({
                url: `/reviews/${reviewId}/reply`,
                method: 'POST',
                body: { text, userName }
            }),
            async onQueryStarted({ reviewId, text, userName }, { dispatch, queryFulfilled, getState }) {
                const patches: { undo: () => void }[] = [];
                const tempId = `temp_${Date.now()}`;

                const iterate = (fn: (originalArgs: any) => void) => {
                    const queries = (getState() as any).api?.queries || {};
                    Object.values(queries).forEach((q: any) => {
                        if (!q || q.status !== 'fulfilled') return;
                        if (q.endpointName !== 'getProductReviews') return;
                        try { fn(q.originalArgs); } catch { /* ignore */ }
                    });
                };

                iterate((originalArgs) => {
                    const patch = dispatch(
                        reviewApi.util.updateQueryData(
                            'getProductReviews',
                            originalArgs,
                            (draft: any) => {
                                const list = Array.isArray(draft?.data) ? draft.data : null;
                                if (!list) return;
                                const rev = list.find((r: any) => r._id === reviewId);
                                if (rev) {
                                    if (!Array.isArray(rev.replies)) rev.replies = [];
                                    rev.replies.push({
                                        _id: tempId,
                                        text,
                                        userName: userName || 'Anonymous',
                                        likes: 0,
                                        createdAt: new Date().toISOString(),
                                    });
                                }
                            }
                        )
                    );
                    patches.push(patch);
                });

                try {
                    const { data } = await queryFulfilled;
                    const serverReplies = data?.data?.replies;
                    if (Array.isArray(serverReplies)) {
                        iterate((originalArgs) => {
                            dispatch(
                                reviewApi.util.updateQueryData(
                                    'getProductReviews',
                                    originalArgs,
                                    (draft: any) => {
                                        const list = Array.isArray(draft?.data) ? draft.data : null;
                                        if (!list) return;
                                        const rev = list.find((r: any) => r._id === reviewId);
                                        if (rev) rev.replies = serverReplies;
                                    }
                                )
                            );
                        });
                    }
                } catch {
                    patches.forEach(p => p.undo());
                }
            },
        }),
        // Public: like a reply — Backend route: PATCH /api/reviews/:reviewId/replies/:replyId/like
        likeReply: builder.mutation({
            query: ({ reviewId, replyId }: { reviewId: string; replyId: string }) => ({
                url: `/reviews/${reviewId}/replies/${replyId}/like`,
                method: 'PATCH',
            }),
            async onQueryStarted({ reviewId, replyId }, { dispatch, queryFulfilled, getState }) {
                const queries = (getState() as any).api?.queries || {};
                const patches: { undo: () => void }[] = [];

                Object.values(queries).forEach((q: any) => {
                    if (!q || q.status !== 'fulfilled') return;
                    if (q.endpointName !== 'getProductReviews') return;
                    try {
                        const patch = dispatch(
                            reviewApi.util.updateQueryData(
                                'getProductReviews',
                                q.originalArgs,
                                (draft: any) => {
                                    const list = Array.isArray(draft?.data) ? draft.data : null;
                                    if (!list) return;
                                    const rev = list.find((r: any) => r._id === reviewId);
                                    if (!rev || !Array.isArray(rev.replies)) return;
                                    const reply = rev.replies.find((x: any) => x._id === replyId);
                                    if (reply) reply.likes = (reply.likes || 0) + 1;
                                }
                            )
                        );
                        patches.push(patch);
                    } catch { /* ignore */ }
                });

                try { await queryFulfilled; }
                catch { patches.forEach(p => p.undo()); }
            },
        }),
    })
});

export const {
    useGetAllReviewsQuery,
    useCanReviewQuery,
    useCreateReviewMutation,
    usePublicCreateReviewMutation,
    useUpdateReviewMutation,
    useDeleteReviewMutation,
    useGetProductReviewsQuery,
    useGetMyReviewsQuery,
    useLikeReviewMutation,
    useReplyToReviewMutation,
    useLikeReplyMutation,
} = reviewApi;

