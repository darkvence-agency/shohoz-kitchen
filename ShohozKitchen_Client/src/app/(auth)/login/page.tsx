/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { loginSuccess } from '@/redux/slices/authSlice';
import { clearWishlist } from '@/redux/slices/wishlistSlice';
import { useLoginMutation } from '@/redux/api/authApi';
import { useMergeWishlistMutation } from '@/redux/api/userApi';
import { toast } from 'react-hot-toast';
import { FiLock, FiEye, FiEyeOff, FiArrowRight, FiAlertCircle, FiUser } from 'react-icons/fi';
import GoogleSignInButton from '@/components/shared/GoogleSignInButton';

const inputCls =
    'w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15';

const LoginPageInner = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');

    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    const [login, { isLoading }] = useLoginMutation();
    const [mergeWishlist] = useMergeWishlistMutation();
    const guestWishlistItems = useAppSelector((state) => state.wishlist.items);

    const isExpired = searchParams.get('expired') === 'true';
    const redirectPath = searchParams.get('redirect');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const isPhone = /^[0-9+\-\s()]{7,}$/.test(identifier.trim());
        const credentials = isPhone
            ? { phone: identifier.trim(), password }
            : { email: identifier.trim(), password };

        try {
            const res = await login(credentials).unwrap();
            const apiUser = res.data.user;
            const token = res.data.tokens.accessToken;
            const user = {
                id: apiUser._id || apiUser.id,
                name: apiUser.name || `${apiUser.firstName || ''} ${apiUser.lastName || ''}`.trim() || apiUser.email,
                email: apiUser.email,
                phone: apiUser.phone || '',
                role: apiUser.role || 'user',
                avatar: apiUser.avatar || '',
            };

            dispatch(loginSuccess({ user, token }));
            localStorage.setItem('token', token);
            toast.success('Welcome back! Login successful.', {
                style: { borderRadius: '10px', background: 'var(--color-primary)', color: '#fff' },
                icon: '✅',
            });

            // ── Merge guest wishlist into the user's server wishlist ──
            // Never block login: a merge failure is swallowed.
            try {
                const productIds = guestWishlistItems
                    .map((item) => item.id)
                    .filter((id): id is string => Boolean(id));
                if (productIds.length > 0) {
                    await mergeWishlist(productIds).unwrap();
                    dispatch(clearWishlist());
                }
            } catch (mergeErr) {
                console.error('Guest wishlist merge failed:', mergeErr);
            }

            // ── Smart Redirect Logic ──
            // Staff (admin / super admin) ALWAYS land in the admin panel. A redirect
            // param is honored only when it points to an admin route (deep link) — a
            // customer-area redirect must never trap an admin in the user dashboard.
            const isStaff = user.role === 'admin' || user.role === 'superadmin';
            if (isStaff) {
                router.push(redirectPath && redirectPath.startsWith('/dashboard/admin') ? redirectPath : '/dashboard/admin');
            } else if (redirectPath) {
                router.push(redirectPath);
            } else {
                try {
                    const ordersRes = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/orders/my?limit=1`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const ordersData = await ordersRes.json();
                    const hasOrders = ordersData?.data?.orders?.length > 0 || ordersData?.data?.length > 0;
                    router.push(hasOrders ? '/dashboard/user' : '/');
                } catch {
                    router.push('/');
                }
            }
        } catch (err: any) {
            toast.error(err?.data?.message || 'Invalid email/phone or password.', { duration: 4000 });
        }
    };

    return (
        <div className="bg-white rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-900/5 border border-slate-100">

            {/* Session Expired */}
            {isExpired && (
                <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                    <FiAlertCircle size={18} className="text-red-500 shrink-0" />
                    <div>
                        <p className="text-[13px] font-bold text-red-700 m-0">Session expired</p>
                        <p className="text-[12px] text-red-600 m-0">Please sign in again to continue.</p>
                    </div>
                </div>
            )}

            <div className="mb-7 text-center">
                <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">Welcome back</h1>
                <p className="mt-1.5 text-sm text-slate-500">Sign in to continue to your account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

                {/* Email or Phone */}
                <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-2">Email or phone number</label>
                    <div className="relative group">
                        <FiUser size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
                        <input
                            type="text"
                            required
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            className={inputCls}
                            placeholder="name@example.com or 01XXXXXXXXX"
                            autoComplete="username"
                        />
                    </div>
                </div>

                {/* Password */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[13px] font-semibold text-slate-700">Password</label>
                        <Link href="/forgot-password" className="text-[12px] font-semibold text-[var(--color-primary)] hover:underline">
                            Forgot password?
                        </Link>
                    </div>
                    <div className="relative group">
                        <FiLock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className={`${inputCls} pr-11`}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                            {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                        </button>
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                >
                    {isLoading ? (
                        <>
                            <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Signing in…
                        </>
                    ) : (
                        <>Sign in <FiArrowRight size={17} /></>
                    )}
                </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[12px] font-medium text-slate-400">or continue with</span>
                <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Google */}
            <GoogleSignInButton redirectPath={redirectPath} label="Continue with Google" />

            <div className="mt-7 pt-6 border-t border-slate-100 text-center">
                <p className="text-[13px] text-slate-500">
                    Don&apos;t have an account?{' '}
                    <Link
                        href={redirectPath ? `/register?redirect=${encodeURIComponent(redirectPath)}` : '/register'}
                        className="font-bold text-[var(--color-primary)] hover:underline"
                    >
                        Create one
                    </Link>
                </p>
            </div>
        </div>
    );
};

const LoginPage = () => (
    <Suspense fallback={<div className="p-10 text-center text-[var(--color-primary)]">Loading…</div>}>
        <LoginPageInner />
    </Suspense>
);

export default LoginPage;
