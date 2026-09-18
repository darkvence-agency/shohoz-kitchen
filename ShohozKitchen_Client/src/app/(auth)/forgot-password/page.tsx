"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useForgotPasswordMutation } from '@/redux/api/authApi';
import { toast } from 'react-hot-toast';
import { FiMail, FiArrowRight, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';

const inputCls =
    'w-full pl-11 pr-4 py-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [devResetLink, setDevResetLink] = useState<string | null>(null);

    const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = email.trim();
        try {
            const res = await forgotPassword({ email: value }).unwrap();
            const resetLink = res?.data?.dev?.resetLink as string | undefined;
            setDevResetLink(resetLink || null);
            setSent(true);
            toast.success('Check your email for a reset link.', {
                style: { borderRadius: '10px', background: 'var(--color-primary)', color: '#fff' },
            });
        } catch (err: any) {
            toast.error(err?.data?.message || 'Something went wrong. Please try again.', { duration: 4000 });
        }
    };

    return (
        <div className="bg-white rounded-2xl p-7 sm:p-9 shadow-xl shadow-slate-900/5 border border-slate-100">

            {sent ? (
                <div className="py-1">
                    <div className="text-center">
                        <div className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center bg-green-100">
                            <FiCheckCircle size={28} className="text-green-600" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Check your email</h1>
                        <p className="mt-1.5 text-sm text-slate-500">
                            If an account exists for <span className="font-semibold text-slate-700">{email.trim()}</span>, we&apos;ve sent a link to reset your password.
                        </p>
                    </div>

                    {devResetLink && (
                        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="text-[12px] font-bold text-amber-700 m-0">Dev mode — reset link</p>
                            <a href={devResetLink} className="text-[12px] text-amber-700 break-all underline">{devResetLink}</a>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => { setSent(false); setDevResetLink(null); }}
                        className="mt-6 w-full py-3 rounded-lg border border-slate-200 text-slate-700 font-semibold text-sm transition hover:bg-slate-50"
                    >
                        Use a different email
                    </button>
                </div>
            ) : (
                <>
                    <div className="mb-6 text-center">
                        <h1 className="text-2xl sm:text-[28px] font-extrabold text-slate-900 tracking-tight">Forgot password?</h1>
                        <p className="mt-1.5 text-sm text-slate-500">Enter your email and we&apos;ll send you a reset link.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-[13px] font-semibold text-slate-700 mb-2">Email address</label>
                            <div className="relative group">
                                <FiMail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--color-primary)] transition-colors" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className={inputCls}
                                    placeholder="name@example.com"
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3.5 rounded-lg text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:translate-y-0"
                            style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)' }}
                        >
                            {isLoading ? (
                                <>
                                    <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Sending…
                                </>
                            ) : (
                                <>Send reset link <FiArrowRight size={17} /></>
                            )}
                        </button>
                    </form>
                </>
            )}

            <div className="mt-7 pt-6 border-t border-slate-100 text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[var(--color-primary)] hover:underline">
                    <FiArrowLeft size={15} /> Back to sign in
                </Link>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
