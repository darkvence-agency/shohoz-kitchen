import { baseApi } from "./baseApi";

export const authApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
        }),
        register: builder.mutation({
            query: (userData) => ({
                url: '/auth/register',
                method: 'POST',
                body: userData,
            }),
        }),
        googleLogin: builder.mutation({
            query: (data: { code?: string; idToken?: string; accessToken?: string }) => ({
                url: '/auth/google',
                method: 'POST',
                body: data,
            }),
        }),
        logout: builder.mutation({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
        }),
        updatePassword: builder.mutation({
            query: (data) => ({
                url: '/auth/update-password',
                method: 'POST',
                body: data,
            }),
        }),
        verifyEmail: builder.mutation({
            query: (data) => ({
                url: '/auth/verify-email',
                method: 'POST',
                body: data,
            }),
        }),
        resendVerification: builder.mutation({
            query: (data) => ({
                url: '/auth/resend-verification',
                method: 'POST',
                body: data,
            }),
        }),
        sendOtp: builder.mutation({
            query: (data) => ({
                url: '/auth/send-otp',
                method: 'POST',
                body: data,
            }),
        }),
        verifyOtp: builder.mutation({
            query: (data) => ({
                url: '/auth/verify-otp',
                method: 'POST',
                body: data,
            }),
        }),
        forgotPassword: builder.mutation({
            query: (data) => ({
                url: '/auth/forgot-password',
                method: 'POST',
                body: data,
            }),
        }),
        resetPassword: builder.mutation({
            query: (data) => ({
                url: '/auth/reset-password',
                method: 'POST',
                body: data,
            }),
        }),
    }),
});

export const {
    useLoginMutation,
    useRegisterMutation,
    useGoogleLoginMutation,
    useLogoutMutation,
    useUpdatePasswordMutation,
    useVerifyEmailMutation,
    useResendVerificationMutation,
    useSendOtpMutation,
    useVerifyOtpMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
} = authApi;
