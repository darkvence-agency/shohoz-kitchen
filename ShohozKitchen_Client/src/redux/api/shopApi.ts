import { baseApi } from './baseApi';

export interface IBankInfo {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    mobileProvider?: string;
    mobileNumber?: string;
}

export interface IShop {
    _id: string;
    owner: string | { _id: string; firstName: string; lastName: string; email: string; avatar: string; phone?: string };
    name: string;
    slug: string;
    description: string;
    logo: string;
    coverImage: string;
    phone: string;
    email: string;
    address: string;
    location: string;
    productCategory: string;
    businessPhoto: string;
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
    commissionRate: number;
    totalEarnings: number;
    pendingEarnings: number;
    availableEarnings: number;
    paidEarnings: number;
    totalOrders: number;
    // KYC
    nidNumber?: string;
    nidFront?: string;
    nidBack?: string;
    tradeLicense?: string;
    // Bank / payout info
    bankInfo?: IBankInfo;
    rejectionReason?: string;
    followers?: string[];
    followersCount?: number;
    isFollowing?: boolean;
    rating?: number;
    approvedAt?: string;
    createdAt: string;
}

export const shopApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        // Public: Register full seller account (user + shop)
        registerSellerAccount: builder.mutation<{
            data: {
                user: { _id: string; email: string; firstName: string; lastName: string; role: string; avatar: string };
                shop: IShop;
                tokens: { accessToken: string; refreshToken: string };
            }
        }, {
            firstName: string; lastName?: string; email: string; phone: string; password: string;
            shopName: string; shopDescription?: string; location: string; productCategory: string;
            address?: string; businessPhoto?: string; logo?: string; coverImage?: string;
        }>({
            query: (body) => ({ url: '/shops/register-seller', method: 'POST', body }),
            invalidatesTags: ['Shops'],
        }),

        // Seller: Register shop (existing logged-in user upgrading to seller).
        // Returns a fresh token carrying the new 'seller' role.
        registerShop: builder.mutation<{
            data: {
                shop: IShop;
                user: { _id: string; email: string; firstName: string; lastName: string; role: string; avatar: string };
                tokens: { accessToken: string; refreshToken: string };
            }
        }, {
            name: string; description?: string; phone?: string; email?: string; address?: string;
            location?: string; productCategory?: string; businessPhoto?: string; logo?: string; coverImage?: string;
        }>({
            query: (body) => ({ url: '/shops/register', method: 'POST', body }),
            invalidatesTags: ['Shops'],
        }),

        // Seller: Get my shop
        getMyShop: builder.query<{ data: IShop }, void>({
            query: () => '/shops/my-shop',
            providesTags: ['Shops'],
        }),

        // Seller: Update my shop
        updateMyShop: builder.mutation<{ data: IShop }, Partial<IShop>>({
            query: (body) => ({ url: '/shops/my-shop', method: 'PATCH', body }),
            invalidatesTags: ['Shops'],
        }),

        // Public: Get all approved shops
        getAllShops: builder.query<{ data: IShop[]; meta: { total: number; page: number; limit: number; totalPages: number } }, { page?: number; limit?: number }>({
            query: (params) => ({ url: '/shops', params }),
            providesTags: ['Shops'],
        }),

        // Public: Get shop by slug
        getShopBySlug: builder.query<{ data: IShop }, string>({
            query: (slug) => `/shops/slug/${slug}`,
            providesTags: ['Shops'],
        }),

        // Admin: Get all shops
        adminGetAllShops: builder.query<{ data: IShop[]; meta: { total: number; page: number; limit: number; totalPages: number } }, { page?: number; limit?: number; status?: string }>({
            query: (params) => ({ url: '/shops/admin/all', params }),
            providesTags: ['Shops'],
        }),

        // Admin: Create a new seller (user + auto-approved shop)
        adminCreateSeller: builder.mutation<{
            data: {
                user: { _id: string; email: string; firstName: string; lastName: string; role: string; avatar: string };
                shop: IShop;
            }
        }, {
            firstName: string; lastName?: string; email: string; phone: string; password: string;
            shopName: string; shopDescription?: string; location: string; productCategory: string;
            address?: string; businessPhoto?: string; commissionRate?: number;
        }>({
            query: (data) => ({ url: '/shops/admin/create-seller', method: 'POST', body: data }),
            invalidatesTags: ['Shops'],
        }),

        // Admin: Approve or reject shop
        updateShopStatus: builder.mutation<{ data: IShop }, { id: string; status: 'approved' | 'rejected' | 'suspended'; rejectionReason?: string; commissionRate?: number }>({
            query: ({ id, ...body }) => ({ url: `/shops/admin/${id}/status`, method: 'PATCH', body }),
            invalidatesTags: ['Shops'],
        }),

        // Admin: Set commission
        setCommissionRate: builder.mutation<{ data: IShop }, { id: string; commissionRate: number }>({
            query: ({ id, commissionRate }) => ({ url: `/shops/admin/${id}/commission`, method: 'PATCH', body: { commissionRate } }),
            invalidatesTags: ['Shops'],
        }),

        // Admin: Delete shop
        deleteShop: builder.mutation<void, string>({
            query: (id) => ({ url: `/shops/admin/${id}`, method: 'DELETE' }),
            invalidatesTags: ['Shops'],
        }),

        // User: Toggle follow/unfollow shop
        toggleFollowShop: builder.mutation<{ data: { isFollowing: boolean; followersCount: number } }, string>({
            query: (shopId) => ({ url: `/shops/${shopId}/follow`, method: 'POST' }),
            invalidatesTags: ['Shops'],
        }),
    }),
});

export const {
    useRegisterSellerAccountMutation,
    useAdminCreateSellerMutation,
    useRegisterShopMutation,
    useGetMyShopQuery,
    useUpdateMyShopMutation,
    useGetAllShopsQuery,
    useGetShopBySlugQuery,
    useAdminGetAllShopsQuery,
    useUpdateShopStatusMutation,
    useSetCommissionRateMutation,
    useDeleteShopMutation,
    useToggleFollowShopMutation,
} = shopApi;
