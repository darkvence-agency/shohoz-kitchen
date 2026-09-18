/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch } from '@/redux/hooks';
import { loginSuccess } from '@/redux/slices/authSlice';
import { useRegisterMutation } from '@/redux/api/authApi';
import { toast } from 'react-hot-toast';
import { FiUser, FiLock, FiEye, FiEyeOff, FiArrowRight, FiMapPin, FiMail, FiPhone, FiCheckCircle } from 'react-icons/fi';
import GoogleSignInButton from '@/components/shared/GoogleSignInButton';

const inputCls =
    'w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15';

const RegisterPageInner = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', location: '', password: '' });
    const [verifyNotice, setVerifyNotice] = useState<{ email: string; role: string; devVerifyLink?: string } | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();
    const [register, { isLoading }] = useRegisterMutation();
    const redirectPath = searchParams.get('redirect');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const goNext = (role: string) => {
        // ── Smart Redirect Logic ──
        if (redirectPath) {
            router.push(redirectPath);
        } else if (role === 'admin') {
            router.push('/dashboard/admin');
        } else {
            router.push('/');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: formData.name.trim(),
            firstName: formData.name.trim().split(' ')[0] || formData.name.trim(),
            lastName: formData.name.trim().split(' ').slice(1).join(' ') || '',
            email: formData.email.trim(),
            phone: formData.phone.trim(),
            location: formData.location.trim(),
            password: formData.password,
        };
        try {
            const res = await register(payload).unwrap();
            const apiUser = res.data.user;
            const token = res.data.tokens.accessToken;
            const devVerifyLink = res?.data?.dev?.verifyLink as string | undefined;
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
            toast.success('Account created! Please verify your email 🎉', {
                duration: 4000,
                style: { borderRadius: '10px', background: 'var(--color-primary)', color: '#fff' },
            });

            setVerifyNotice({ email: user.email, role: user.role, devVerifyLink });
        } catch (err: any) {
            toast.error(err?.data?.message || 'Registration failed. Please try again.', { duration: 4000 });
        }
    };

    if (verifyNotice) {
        return (
            <div className="bg-white rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-900/5 border border-slate-100">
                <div className="text-center">
                    <div className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--color-primary)]/10">
                        <FiMail size={26} className="text-[var(--color-primary)]" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Verify your email</h1>
                    <p className="mt-1.5 text-sm text-slate-500">
                        We&apos;ve sent a verification link to{' '}
                        <span className="font-semibold text-slate-700">{verifyNotice.email}</span>.
                        Open it to confirm your account.
                    </p>
                </div>

                <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <FiCheckCircle size={18} className="text-green-600 shrink-0 mt-0.5" />
                    <p className="text-[12.5px] text-slate-600 m-0">
                        Your account is ready — you can keep shopping now and verify any time from the email.
                    </p>
                </div>

                {verifyNotice.devVerifyLink && (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="text-[12px] font-bold text-amber-700 m-0">Dev mode — verification link</p>
                        <a href={verifyNotice.devVerifyLink} className="text-[12px] text-amber-700 break-all underline">{verifyNotice.devVerifyLink}</a>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => goNext(verifyNotice.role)}
                    className="mt-6 w-full py-3.5 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                >
                    Continue <FiArrowRight size={17} />
                </button>

                <div className="mt-5 pt-5 border-t border-slate-100 text-center">
                    <Link href="/verify-email" className="text-[13px] font-bold text-[var(--color-primary)] hover:underline">
                        Didn&apos;t get the email? Resend
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-900/5 border border-slate-100">

            <div className="mb-6 text-center">
                <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">Create your account</h1>
                <p className="mt-1.5 text-sm text-slate-500">Join Shohoz Kitchen for a better shopping experience.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Full Name */}
                <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Full name</label>
                    <div className="relative group">
                        <FiUser size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
                        <input type="text" name="name" required value={formData.name} onChange={handleChange}
                            className={inputCls} placeholder="Enter your full name" autoComplete="name" />
                    </div>
                </div>

                {/* Email */}
                <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Email address</label>
                    <div className="relative group">
                        <FiMail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
                        <input type="email" name="email" required value={formData.email} onChange={handleChange}
                            className={inputCls} placeholder="name@example.com" autoComplete="email" />
                    </div>
                </div>

                {/* Phone + Location side by side on sm+ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Phone</label>
                        <div className="relative group">
                            <FiPhone size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
                            <input type="tel" name="phone" required value={formData.phone} onChange={handleChange}
                                className={inputCls} placeholder="01XXXXXXXXX" autoComplete="tel" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Location</label>
                        <div className="relative group">
                            <FiMapPin size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
                            <input type="text" name="location" required value={formData.location} onChange={handleChange}
                                className={inputCls} placeholder="e.g. Dhaka, Mirpur" autoComplete="address-level2" />
                        </div>
                    </div>
                </div>

                {/* Password */}
                <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">Password</label>
                    <div className="relative group">
                        <FiLock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
                        <input type={showPassword ? 'text' : 'password'} name="password" required minLength={6}
                            value={formData.password} onChange={handleChange}
                            className={`${inputCls} pr-11`} placeholder="At least 6 characters" autoComplete="new-password" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}>
                            {showPassword ? <FiEyeOff size={17} /> : <FiEye size={17} />}
                        </button>
                    </div>
                </div>

                {/* Submit */}
                <button type="submit" disabled={isLoading}
                    className="w-full py-3.5 mt-1 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}>
                    {isLoading ? (
                        <>
                            <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Creating account…
                        </>
                    ) : (
                        <>Create account <FiArrowRight size={17} /></>
                    )}
                </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[12px] font-medium text-slate-400">or sign up with</span>
                <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Google */}
            <GoogleSignInButton redirectPath={redirectPath} label="Sign up with Google" />

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                <p className="text-[13px] text-slate-500">
                    Already have an account?{' '}
                    <Link href={redirectPath ? `/login?redirect=${encodeURIComponent(redirectPath)}` : '/login'}
                        className="font-bold text-[var(--color-primary)] hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
};

const RegisterPage = () => (
    <Suspense fallback={<div className="p-10 text-center text-[var(--color-primary)]">Loading…</div>}>
        <RegisterPageInner />
    </Suspense>
);

export default RegisterPage;
