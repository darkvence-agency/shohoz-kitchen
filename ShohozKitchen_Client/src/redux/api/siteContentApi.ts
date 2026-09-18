import { baseApi } from './baseApi';

export const siteContentApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Public: get site content
        getSiteContent: builder.query({
            query: () => '/site-content',
            providesTags: ['SiteContent'],
        }),

        // Admin: full update
        updateSiteContent: builder.mutation({
            query: (data) => ({
                url: '/site-content',
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['SiteContent'],
        }),

        // Admin: update specific section
        updateSiteSection: builder.mutation({
            query: ({ section, data }) => ({
                url: `/site-content/${section}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['SiteContent'],
        }),

        // Public: get single legal page by slug
        getLegalPage: builder.query({
            query: (slug: string) => `/site-content/legal/${slug}`,
            providesTags: (result: any, error: any, slug: string) => [{ type: 'SiteContent', id: `legal-${slug}` }],
        }),

        // Admin: get all legal pages
        getAllLegalPages: builder.query({
            query: () => '/site-content/legal',
            providesTags: ['SiteContent'],
        }),

        // Admin: update legal page by slug
        updateLegalPage: builder.mutation({
            query: ({ slug, data }: { slug: string; data: any }) => ({
                url: `/site-content/legal/${slug}`,
                method: 'PUT',
                body: data,
            }),
            invalidatesTags: ['SiteContent'],
        }),
    }),
});

export const {
    useGetSiteContentQuery,
    useUpdateSiteContentMutation,
    useUpdateSiteSectionMutation,
    useGetLegalPageQuery,
    useGetAllLegalPagesQuery,
    useUpdateLegalPageMutation,
} = siteContentApi;
