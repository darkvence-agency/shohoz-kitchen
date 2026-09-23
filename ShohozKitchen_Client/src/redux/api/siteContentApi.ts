import { baseApi } from './baseApi';

export const siteContentApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        // Public: get site content
        getSiteContent: builder.query({
            query: () => '/site-content',
            // The argument is ignored — there is only ever one site-content document.
            // Without this, callers passing `undefined` and callers passing `{}` get
            // two separate cache entries and the request is made twice on every page
            // (the header asked one way, the theme provider and footer the other).
            serializeQueryArgs: () => 'site-content',
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

        // Super admin: tracking IDs and verification codes (Digital marketing)
        updateMarketing: builder.mutation({
            query: (data: Record<string, string>) => ({ url: '/site-content/marketing', method: 'PUT', body: data }),
            invalidatesTags: ['SiteContent'],
        }),

        // Super admin: the storefront's SEO title, description and keywords
        updateSeo: builder.mutation({
            query: (data: Record<string, string>) => ({ url: '/site-content/seo', method: 'PUT', body: data }),
            invalidatesTags: ['SiteContent'],
        }),

        // Super admin: bKash / Nagad / bank accounts offered at checkout
        updatePaymentSettings: builder.mutation({
            query: (data: Record<string, unknown>) => ({ url: '/site-content/payment', method: 'PUT', body: data }),
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
    useUpdateMarketingMutation,
    useUpdateSeoMutation,
    useUpdatePaymentSettingsMutation,
    useGetLegalPageQuery,
    useGetAllLegalPagesQuery,
    useUpdateLegalPageMutation,
} = siteContentApi;
