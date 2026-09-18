import { baseApi } from './baseApi';

export interface ILoginAsUser {
    _id?: string;
    id?: string;
    firstName?: string;
    lastName?: string;
    name?: string;
    email: string;
    phone?: string;
    avatar?: string;
    role: 'user' | 'admin' | 'superadmin';
}

export interface ILoginAsResponse {
    data: {
        user: ILoginAsUser;
        tokens: { accessToken: string; refreshToken: string };
    };
}

export const adminExtraApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        // Admin: Impersonate / log in as another user
        loginAs: builder.mutation<ILoginAsResponse, string>({
            query: (userId) => ({ url: `/auth/login-as/${userId}`, method: 'POST' }),
        }),
    }),
});

export const {
    useLoginAsMutation,
} = adminExtraApi;
